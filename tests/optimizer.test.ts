import { describe, expect, it } from "vitest";
import { optimizeCategories, optimizedPolicy } from "@/sim/optimizer";
import { DEFAULT_PARAMS } from "@/sim/catalog";
import type { Tier } from "@/sim/types";

const DEFAULT_TIERS: Tier[] = [
  { daysLeft: 2, discount: 0.2 },
  { daysLeft: 1, discount: 0.4 },
];

function matchesDefault(tiers: Tier[]): boolean {
  if (tiers.length !== 2) return false;
  return tiers.every(
    (tier, index) =>
      tier.daysLeft === DEFAULT_TIERS[index].daysLeft &&
      Math.abs(tier.discount - DEFAULT_TIERS[index].discount) < 1e-9,
  );
}

describe("optimiser", () => {
  // A small seed set keeps the search fast; the shape is what is under test.
  const params = { ...DEFAULT_PARAMS, seed: 42 };
  const trainSeeds = [1, 2];
  const testSeeds = [101, 102];

  const first = optimizeCategories(params, trainSeeds, testSeeds, 0);
  const second = optimizeCategories(params, trainSeeds, testSeeds, 0);

  it("returns a two-step rule for every category", () => {
    expect(first.categories).toHaveLength(5);
    for (const category of first.categories) {
      expect(category.best).toHaveLength(2);
      // The deeper discount must sit closer to expiry.
      expect(category.best[1].discount).toBeGreaterThan(category.best[0].discount);
      expect(category.best[0].daysLeft).toBeGreaterThan(category.best[1].daysLeft);
      expect(category.tried).toHaveLength(126);
    }
  });

  it("never does worse on training seeds than the default rule it searched", () => {
    for (const category of first.categories) {
      const defaultPoint = category.tried.find((point) => matchesDefault(point.tiers));
      expect(defaultPoint).toBeDefined();
      const bestPoint = category.tried.reduce((current, point) =>
        point.profit > current.profit ? point : current,
      );
      expect(bestPoint.profit).toBeGreaterThanOrEqual(defaultPoint!.profit);
    }
  });

  it("is reproducible: the same seeds give the same winners", () => {
    expect(second.categories.map((c) => c.best)).toEqual(
      first.categories.map((c) => c.best),
    );
  });

  it("folds the winners into a per-category policy", () => {
    const policy = optimizedPolicy(first.categories);
    expect(policy.kind).toBe("markdown");
    if (policy.kind === "markdown") {
      expect(Object.keys(policy.byCategory ?? {})).toHaveLength(5);
    }
  });
});
