/**
 * Seeded randomness for the simulation core (plans/01 §9).
 *
 * Two rules make the comparison between policies fair:
 *
 *  1. Every draw comes from a *stream* keyed by (seed, product, day, stream
 *     name). The key never mentions the policy, so two policies face exactly
 *     the same underlying luck (common random numbers).
 *  2. Poisson counts are drawn by inverse CDF from a SINGLE uniform, so the
 *     count is monotone in the rate: a policy that raises demand gets at
 *     least as many shoppers, every time, with no extra noise.
 *
 * There is no `Math.random()` anywhere in `src/sim` (plans/02 §8) — the ESLint
 * rule and the grep test in `tests/invariants.test.ts` both enforce it.
 */

/** Safety net: the inverse-CDF loop cannot run away. */
const MAX_POISSON_ITERATIONS = 1_000_000;

/** FNV-1a, 32-bit. Stable across machines and platforms. */
export function hash32(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** mulberry32: small, fast, well-distributed 32-bit PRNG. Returns values in [0, 1). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function next(): number {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), 1 | t);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Poisson count by inverse CDF from one uniform `u` in [0, 1).
 *
 * Monotone in both arguments: a larger rate never yields a smaller count for
 * the same uniform, and a larger uniform never yields a smaller count for the
 * same rate. That monotonicity is what makes the policy comparison
 * low-variance (plans/01 §9).
 *
 * The pmf is accumulated in log space. A plain recurrence
 * (`p *= lambda / k`) underflows to zero once λ > 745, and then never recovers
 * — the loop below would never terminate.
 */
export function poisson(lambda: number, u: number): number {
  if (!(lambda > 0) || !(u > 0)) return 0;

  // log p_k = -λ + k·ln λ - ln(k!)
  let logP = -lambda;
  const logLambda = Math.log(lambda);
  let logFactorial = 0;

  let p = Math.exp(logP);
  let cumulative = p;
  let k = 0;

  while (cumulative < u) {
    if (k >= MAX_POISSON_ITERATIONS) break;
    k += 1;
    logFactorial += Math.log(k);
    logP = -lambda + k * logLambda - logFactorial;
    p = Math.exp(logP);
    cumulative += p;
  }

  return k;
}

/** Standard normal from two uniforms, via the Box–Muller transform. */
export function normalFromUniforms(u1: number, u2: number): number {
  const a = u1 > 0 ? u1 : Number.EPSILON;
  const radius = Math.sqrt(-2 * Math.log(a));
  const theta = 2 * Math.PI * u2;
  return radius * Math.cos(theta);
}

export type StreamName = "shock" | "n0" | "n1" | "td";

export interface SimRng {
  /** Next uniform of the given (product, day, stream) — policy-independent. */
  next(productIdx: number, day: number, stream: StreamName): number;
}

/**
 * One RNG per (seed, product, day, stream). The same seed always replays the
 * same numbers; different seeds give different numbers.
 */
export function makeStreams(seed: number): SimRng {
  const generators = new Map<string, () => number>();

  function generatorFor(key: string): () => number {
    let generator = generators.get(key);
    if (generator === undefined) {
      generator = mulberry32(hash32(`${seed}|${key}`));
      generators.set(key, generator);
    }
    return generator;
  }

  return {
    next(productIdx: number, day: number, stream: StreamName): number {
      return generatorFor(`${productIdx}|${day}|${stream}`)();
    },
  };
}
