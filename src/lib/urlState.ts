/**
 * The URL is part of the state (plans/02 §6).
 *
 * `/?seed=42&t1=2&d1=20&t2=1&d2=40&s=1` holds everything a judge needs to
 * reproduce a run: the seed, the two markdown tiers and the shopper-response
 * scale. The same URL always produces the same numbers.
 *
 * Parsing is deliberately forgiving — a hand-edited or stale URL falls back to
 * the defaults instead of breaking the page.
 */

export interface UrlTier {
  daysLeft: number;
  discount: number;
}

export interface UrlState {
  seed: number;
  /** Ordered: the first tier is the one that fires first as stock ages. */
  tiers: UrlTier[];
  responseScale: number;
}

export const DEFAULT_URL_STATE: UrlState = {
  seed: 42,
  tiers: [
    { daysLeft: 2, discount: 0.2 },
    { daysLeft: 1, discount: 0.4 },
  ],
  responseScale: 1,
};

/** The ranges the sliders allow (plans/03 §2). */
const THRESHOLD_MIN = 1;
const THRESHOLD_MAX = 4;
const DISCOUNT_MIN = 0;
const DISCOUNT_MAX = 0.6;
const RESPONSE_MIN = 0.5;
const RESPONSE_MAX = 1.5;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function parseNumber(raw: string | null): number | null {
  if (raw === null || raw.trim() === "") return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

export function parseUrlState(params: URLSearchParams): UrlState {
  const seed = parseNumber(params.get("seed"));
  const response = parseNumber(params.get("s"));

  const tiers: UrlTier[] = DEFAULT_URL_STATE.tiers.map((fallback, index) => {
    const threshold = parseNumber(params.get(`t${index + 1}`));
    const discountPercent = parseNumber(params.get(`d${index + 1}`));

    // A tier needs both halves to be usable; otherwise it keeps its default.
    if (threshold === null || discountPercent === null) return { ...fallback };

    return {
      daysLeft: clamp(Math.round(threshold), THRESHOLD_MIN, THRESHOLD_MAX),
      discount: clamp(discountPercent / 100, DISCOUNT_MIN, DISCOUNT_MAX),
    };
  });

  return {
    seed: seed === null ? DEFAULT_URL_STATE.seed : Math.round(seed),
    tiers,
    responseScale:
      response === null
        ? DEFAULT_URL_STATE.responseScale
        : clamp(response, RESPONSE_MIN, RESPONSE_MAX),
  };
}

export function serializeUrlState(state: UrlState): string {
  const params = new URLSearchParams();
  params.set("seed", String(state.seed));
  state.tiers.forEach((tier, index) => {
    params.set(`t${index + 1}`, String(tier.daysLeft));
    params.set(`d${index + 1}`, String(Math.round(tier.discount * 100)));
  });
  params.set("s", String(state.responseScale));
  return `?${params.toString()}`;
}

/**
 * Parse the shape Next.js hands a page: a record of query parameters.
 *
 * `searchParams` values can be missing or repeated, so the conversion is
 * forgiving in the same way the parser is.
 */
export function parseUrlStateFromRecord(
  input: Record<string, string | string[] | undefined>,
): UrlState {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(input)) {
    if (Array.isArray(value)) {
      for (const entry of value) params.append(key, entry);
    } else if (typeof value === "string") {
      params.set(key, value);
    }
  }
  return parseUrlState(params);
}

/**
 * Replace the query string without navigating.
 *
 * `history.replaceState` keeps the back button meaningful — the URL follows
 * the state instead of the state following the URL.
 */
export function writeUrlState(state: UrlState): void {
  if (typeof window === "undefined") return;
  const query = serializeUrlState(state);
  window.history.replaceState(window.history.state, "", `${window.location.pathname}${query}`);
}
