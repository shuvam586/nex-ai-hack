/**
 * Entry points for running the simulation (plans/01 §13.7).
 *
 * `runSim` runs one seed under one policy. `runSeeds` runs the fixed policy
 * and the markdown policy over a list of seeds and reports the difference.
 */

import { simulate } from "./engine";
import { compare, summarize } from "./metrics";
import { FIXED_POLICY } from "./policies";
import type { Comparison, EvalResult, PolicyConfig, Product, SeedStat, SimParams, SimResult } from "./types";

export function runSim(
  params: SimParams,
  policy: PolicyConfig,
  productFilter?: (product: Product) => boolean,
): SimResult {
  const { records, products } = simulate(params, policy, productFilter);
  return summarize(records, products, params, policy);
}

/** Fixed price vs. the given markdown rule on the same seed. */
export function comparePolicies(
  params: SimParams,
  policy: PolicyConfig,
): Comparison {
  const fixed = runSim(params, FIXED_POLICY);
  const markdown = runSim(params, policy);
  return compare(fixed, markdown);
}

function summarizeStat(values: number[], wins: boolean[]): SeedStat {
  const n = values.length;
  const mean = n > 0 ? values.reduce((sum, value) => sum + value, 0) / n : 0;
  const variance =
    n > 1
      ? values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (n - 1)
      : 0;
  const sd = Math.sqrt(variance);
  // 95% CI: t = 2.26 for n = 10 (plans/05 §3), 1.96 otherwise.
  const t = n === 10 ? 2.26 : 1.96;
  const halfWidth = n > 0 ? (t * sd) / Math.sqrt(n) : 0;
  return {
    mean,
    sd,
    ci95: [mean - halfWidth, mean + halfWidth],
    winRate: wins.length > 0 ? wins.filter(Boolean).length / wins.length : undefined,
  };
}

/**
 * Run both policies over a list of seeds and report the difference.
 *
 * `wasteReductionPct` and `profitChangePct`/`revenueChangePct` are fractions;
 * `marginChangePts` is in percentage points.
 */
export function runSeeds(
  params: SimParams,
  seeds: number[],
  policy: PolicyConfig,
): EvalResult {
  const perSeed = seeds.map((seed) => {
    const fixed = runSim({ ...params, seed }, FIXED_POLICY);
    const markdown = runSim({ ...params, seed }, policy);

    const wasteReductionPct =
      fixed.totals.wastePct > 0
        ? (fixed.totals.wastePct - markdown.totals.wastePct) / fixed.totals.wastePct
        : 0;
    const marginChangePts = (markdown.totals.netMarginPct - fixed.totals.netMarginPct) * 100;
    const profitChangePct =
      fixed.totals.profit !== 0
        ? (markdown.totals.profit - fixed.totals.profit) / fixed.totals.profit
        : 0;
    const revenueChangePct =
      fixed.totals.revenue !== 0
        ? (markdown.totals.revenue - fixed.totals.revenue) / fixed.totals.revenue
        : 0;

    return { seed, wasteReductionPct, marginChangePts, profitChangePct, revenueChangePct };
  });

  const pick = (key: keyof (typeof perSeed)[number]) => perSeed.map((row) => row[key]);

  return {
    seeds: seeds.slice(),
    wasteReductionPct: summarizeStat(
      pick("wasteReductionPct"),
      pick("wasteReductionPct").map((value) => value > 0),
    ),
    marginChangePts: summarizeStat(
      pick("marginChangePts"),
      pick("marginChangePts").map((value) => value > 0),
    ),
    profitChangePct: summarizeStat(
      pick("profitChangePct"),
      pick("profitChangePct").map((value) => value > 0),
    ),
    revenueChangePct: summarizeStat(
      pick("revenueChangePct"),
      pick("revenueChangePct").map((value) => value > 0),
    ),
    perSeed,
  };
}
