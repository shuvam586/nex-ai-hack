/**
 * The trade-off chart's extra runs (plans/03 §3).
 *
 * The Overview's hero chart plots profit against units wasted. The dashboard
 * already has the fixed and markdown points from the main comparison; this
 * module supplies the two reference points that make the chart an argument:
 *
 *  - the **blanket 30% off** policy — the lowest waste, and a much worse
 *    profit, which is the prompt's warning made visible;
 *  - a **sweep** of the tiered rule over discount depth 0…60%, so the curve
 *    between "no discount" and "deep discount" is a line rather than a guess.
 *
 * Pure TypeScript: it runs in the worker or on the main thread.
 */

import { runSim } from "./runner";
import { BLANKET_POLICY } from "./policies";
import type { PolicyConfig, SimParams, TradeoffExtras } from "./types";

const SWEEP_STEPS = 12; // 0%, 5%, … 60%

/** A tiered rule whose deepest tier is `depth` off, half that on the earlier tier. */
function sweepPolicy(depth: number): PolicyConfig {
  return {
    kind: "markdown",
    tiers: [
      { daysLeft: 2, discount: Math.min(0.9, depth / 2) },
      { daysLeft: 1, discount: Math.min(0.9, depth) },
    ],
  };
}

export function buildTradeoff(params: SimParams): TradeoffExtras {
  const blanket = runSim(params, BLANKET_POLICY);

  const sweep: TradeoffExtras["sweep"] = [];
  for (let i = 0; i <= SWEEP_STEPS; i++) {
    const depth = i * 0.05;
    const result = runSim(params, sweepPolicy(depth));
    sweep.push({
      discount: depth,
      waste: result.totals.wasted,
      profit: result.totals.profit,
    });
  }

  return {
    blanket: { waste: blanket.totals.wasted, profit: blanket.totals.profit },
    sweep,
  };
}
