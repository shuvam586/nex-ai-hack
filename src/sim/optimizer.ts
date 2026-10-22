/**
 * Best discount steps per category (plans/04 §2).
 *
 * Products do not interact, so categories are independent: searching each
 * category on its own products is exact, not an approximation. Each candidate
 * rule is scored by mean profit over a **train** set of seeds, minus a penalty
 * for wasted units; the winner is then re-checked on **held-out** seeds so the
 * headline number is not the one it was tuned on.
 *
 * Pure TypeScript: it runs in the worker or on the main thread.
 */

import { CATEGORIES } from "./types";
import { runSim } from "./runner";
import { FIXED_POLICY } from "./policies";
import type {
  Category,
  CategoryOpt,
  OptimizeResult,
  OptimizeTried,
  PolicyConfig,
  Product,
  SimParams,
  Tier,
} from "./types";

/** Two-step rules: a shallower tier far out, a deeper tier close to expiry. */
const THRESHOLD_PAIRS: [number, number][] = [
  [2, 1],
  [3, 1],
  [3, 2],
  [4, 1],
  [4, 2],
  [4, 3],
];
const FIRST_DISCOUNTS = [0.1, 0.15, 0.2, 0.25, 0.3];
const SECOND_DISCOUNTS = [0.2, 0.3, 0.4, 0.5, 0.6];

function candidateRules(): Tier[][] {
  const rules: Tier[][] = [];
  for (const [far, near] of THRESHOLD_PAIRS) {
    for (const d1 of FIRST_DISCOUNTS) {
      for (const d2 of SECOND_DISCOUNTS) {
        if (d2 <= d1) continue; // the deeper discount must sit closer to expiry
        rules.push([
          { daysLeft: far, discount: d1 },
          { daysLeft: near, discount: d2 },
        ]);
      }
    }
  }
  return rules;
}

interface MeanTotals {
  profit: number;
  wasted: number;
}

function meanTotals(
  params: SimParams,
  policy: PolicyConfig,
  seeds: number[],
  filter: (product: Product) => boolean,
): MeanTotals {
  let profit = 0;
  let wasted = 0;
  for (const seed of seeds) {
    const result = runSim({ ...params, seed }, policy, filter);
    profit += result.totals.profit;
    wasted += result.totals.wasted;
  }
  const n = seeds.length || 1;
  return { profit: profit / n, wasted: wasted / n };
}

export function optimizeCategories(
  base: SimParams,
  trainSeeds: number[],
  testSeeds: number[],
  weight = 0,
  onProgress?: (done: number, total: number) => void,
): OptimizeResult {
  const rules = candidateRules();
  const categories: CategoryOpt[] = [];
  const total = CATEGORIES.length * (rules.length + 1);
  let done = 0;

  for (const category of CATEGORIES) {
    const filter = (product: Product) => product.category === category;

    const fixed = meanTotals(base, FIXED_POLICY, trainSeeds, filter);
    done++;
    onProgress?.(done, total);

    let bestRule: Tier[] = [];
    let bestScore = -Infinity;
    const tried: OptimizeTried[] = [];

    for (const tiers of rules) {
      const policy: PolicyConfig = { kind: "markdown", tiers };
      const totals = meanTotals(base, policy, trainSeeds, filter);
      const score = totals.profit - weight * totals.wasted;
      tried.push({ tiers, profit: totals.profit, waste: totals.wasted });

      if (score > bestScore) {
        bestScore = score;
        bestRule = tiers;
      }
      done++;
      onProgress?.(done, total);
    }

    const trainBest = meanTotals(base, { kind: "markdown", tiers: bestRule }, trainSeeds, filter);
    const testFixed = meanTotals(base, FIXED_POLICY, testSeeds, filter);
    const testBest = meanTotals(base, { kind: "markdown", tiers: bestRule }, testSeeds, filter);

    categories.push({
      category,
      best: bestRule,
      trainProfitGainPct:
        fixed.profit !== 0 ? (trainBest.profit - fixed.profit) / fixed.profit : 0,
      testProfitGainPct:
        testFixed.profit !== 0 ? (testBest.profit - testFixed.profit) / testFixed.profit : 0,
      wasteReductionPct:
        testFixed.wasted > 0 ? (testFixed.wasted - testBest.wasted) / testFixed.wasted : 0,
      tried,
    });
  }

  return { categories, trainSeeds: trainSeeds.slice(), testSeeds: testSeeds.slice(), weight };
}

/** Fold per-category winners into a single per-category-override policy. */
export function optimizedPolicy(categories: CategoryOpt[]): PolicyConfig {
  const byCategory: Partial<Record<Category, Tier[]>> = {};
  for (const category of categories) {
    byCategory[category.category] = category.best.map((tier) => ({ ...tier }));
  }
  return { kind: "markdown", tiers: [], byCategory };
}
