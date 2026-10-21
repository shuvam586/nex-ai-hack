import { describe, expect, it } from "vitest";
import { comparePolicies, runSeeds, runSim } from "@/sim/runner";
import { DEFAULT_PARAMS } from "@/sim/catalog";
import { DEFAULT_MARKDOWN_POLICY, FIXED_POLICY } from "@/sim/policies";
import type { EvalResult } from "@/sim/types";

type PerSeed = EvalResult["perSeed"][number];

describe("runSim", () => {
  it("echoes the parameters and policy it ran with", () => {
    const result = runSim(DEFAULT_PARAMS, DEFAULT_MARKDOWN_POLICY);
    expect(result.params).toEqual(DEFAULT_PARAMS);
    expect(result.policy).toEqual(DEFAULT_MARKDOWN_POLICY);
  });

  it("is deterministic", () => {
    expect(runSim(DEFAULT_PARAMS, FIXED_POLICY)).toEqual(runSim(DEFAULT_PARAMS, FIXED_POLICY));
  });
});

describe("runSeeds", () => {
  const seeds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const evalResult = runSeeds(DEFAULT_PARAMS, seeds, DEFAULT_MARKDOWN_POLICY);

  it("reports one row per seed", () => {
    expect(evalResult.seeds).toEqual(seeds);
    expect(evalResult.perSeed).toHaveLength(seeds.length);
    expect(evalResult.perSeed.map((r) => r.seed)).toEqual(seeds);
  });

  it("summarises each metric with mean, spread and a confidence interval", () => {
    const metrics = [
      { stat: evalResult.wasteReductionPct, pick: (r: PerSeed) => r.wasteReductionPct },
      { stat: evalResult.marginChangePts, pick: (r: PerSeed) => r.marginChangePts },
      { stat: evalResult.profitChangePct, pick: (r: PerSeed) => r.profitChangePct },
      { stat: evalResult.revenueChangePct, pick: (r: PerSeed) => r.revenueChangePct },
    ];

    for (const { stat, pick } of metrics) {
      const values = evalResult.perSeed.map(pick);
      const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
      expect(stat.mean).toBeCloseTo(mean, 10);
      expect(stat.sd).toBeGreaterThanOrEqual(0);
      expect(stat.ci95[0]).toBeLessThanOrEqual(stat.mean);
      expect(stat.ci95[1]).toBeGreaterThanOrEqual(stat.mean);
    }
  });

  it("reports a win rate between 0 and 1", () => {
    const winRate = evalResult.profitChangePct.winRate;
    expect(winRate).toBeGreaterThanOrEqual(0);
    expect(winRate).toBeLessThanOrEqual(1);
  });

  it("is deterministic", () => {
    expect(runSeeds(DEFAULT_PARAMS, seeds, DEFAULT_MARKDOWN_POLICY)).toEqual(evalResult);
  });
});

describe("comparePolicies", () => {
  it("runs the fixed policy and the markdown policy on the same seed", () => {
    const comparison = comparePolicies(DEFAULT_PARAMS, DEFAULT_MARKDOWN_POLICY);
    expect(comparison.fixed.policy).toEqual(FIXED_POLICY);
    expect(comparison.markdown.policy).toEqual(DEFAULT_MARKDOWN_POLICY);
    expect(comparison.fixed.params.seed).toBe(comparison.markdown.params.seed);
  });
});
