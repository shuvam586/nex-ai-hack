import { describe, expect, it } from "vitest";
import { runSensitivity } from "@/sim/sensitivity";
import { DEFAULT_MARKDOWN_POLICY } from "@/sim/policies";
import { DEFAULT_PARAMS } from "@/sim/catalog";

describe("sensitivity sweep", () => {
  const params = { ...DEFAULT_PARAMS, seed: 42 };
  const seeds = [1, 2, 3];
  const result = runSensitivity(params, DEFAULT_MARKDOWN_POLICY, seeds);

  it("covers every documented assumption with a low and a high arm", () => {
    expect(result.scenarios).toHaveLength(8);
    expect(result.total).toBe(16);
    for (const scenario of result.scenarios) {
      expect(scenario.lowLabel).toBeTruthy();
      expect(scenario.highLabel).toBeTruthy();
      expect(Number.isFinite(scenario.wasteReductionLow)).toBe(true);
      expect(Number.isFinite(scenario.profitChangeHigh)).toBe(true);
    }
  });

  it("sorts scenarios by their impact on profit, largest first", () => {
    const impacts = result.scenarios.map((scenario) =>
      Math.abs(scenario.profitChangeHigh - scenario.profitChangeLow),
    );
    for (let i = 1; i < impacts.length; i++) {
      expect(impacts[i - 1]).toBeGreaterThanOrEqual(impacts[i]);
    }
  });

  it("reports counts inside the range it summarises", () => {
    expect(result.wasteFallsIn).toBeGreaterThanOrEqual(0);
    expect(result.wasteFallsIn).toBeLessThanOrEqual(result.total);
    expect(result.profitImprovesIn).toBeGreaterThanOrEqual(0);
    expect(result.profitImprovesIn).toBeLessThanOrEqual(result.total);
  });
});
