import { describe, expect, it } from "vitest";
import { buildTradeoff } from "@/sim/tradeoff";
import { runSim } from "@/sim/runner";
import { FIXED_POLICY, DEFAULT_MARKDOWN_POLICY } from "@/sim/policies";
import { DEFAULT_PARAMS } from "@/sim/catalog";

describe("trade-off extras", () => {
  const params = { ...DEFAULT_PARAMS, seed: 42 };
  const extras = buildTradeoff(params);

  it("sweeps discount depth from 0% to 60% in 13 points", () => {
    expect(extras.sweep).toHaveLength(13);
    expect(extras.sweep[0].discount).toBe(0);
    expect(extras.sweep[extras.sweep.length - 1].discount).toBeCloseTo(0.6, 5);
  });

  it("a zero-depth sweep point is the fixed-price run", () => {
    const fixed = runSim(params, FIXED_POLICY);
    expect(extras.sweep[0].waste).toBe(fixed.totals.wasted);
    expect(extras.sweep[0].profit).toBeCloseTo(fixed.totals.profit, 6);
  });

  it("discounting everything wastes the least but earns less than the tiered rule", () => {
    const markdown = runSim(params, DEFAULT_MARKDOWN_POLICY);
    expect(extras.blanket.waste).toBeLessThanOrEqual(markdown.totals.wasted);
    expect(extras.blanket.profit).toBeLessThan(markdown.totals.profit);
  });
});
