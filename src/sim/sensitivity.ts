/**
 * The robustness sweep behind the tornado chart (plans/04 §3.2).
 *
 * For each assumption we move it to a documented low and high and re-run the
 * fixed-vs-markdown comparison over the same seeds. What we are asking is not
 * "is the model right" but "does the conclusion survive being wrong" — so the
 * output is, per assumption, the waste reduction and profit change at each end.
 *
 * Pure TypeScript: it runs in the worker or on the main thread.
 */

import { runSeeds } from "./runner";
import type {
  PolicyConfig,
  SensitivityResult,
  SensitivityScenario,
  SimParams,
} from "./types";

interface ScenarioSpec {
  id: string;
  parameter: string;
  lowLabel: string;
  highLabel: string;
  low: Partial<SimParams>;
  high: Partial<SimParams>;
}

/** The ranges are exactly the ones written down in plans/04 §3.2. */
const SCENARIOS: ScenarioSpec[] = [
  {
    id: "response",
    parameter: "Shopper response s",
    lowLabel: "0.5×",
    highLabel: "1.5×",
    low: { responseScale: 0.5 },
    high: { responseScale: 1.5 },
  },
  {
    id: "tradedown",
    parameter: "Trade-down κ",
    lowLabel: "0.75",
    highLabel: "2.25",
    low: { tradeDownK: 0.75 },
    high: { tradeDownK: 2.25 },
  },
  {
    id: "reach",
    parameter: "Deal reach ρ",
    lowLabel: "0.2",
    highLabel: "0.6",
    low: { dealReach: 0.2 },
    high: { dealReach: 0.6 },
  },
  {
    id: "sigma",
    parameter: "Demand noise σ",
    lowLabel: "0.10",
    highLabel: "0.35",
    low: { demandSigma: 0.1 },
    high: { demandSigma: 0.35 },
  },
  {
    id: "overorder",
    parameter: "Over-order scale",
    lowLabel: "0.5×",
    highLabel: "1.5×",
    low: { overorderScale: 0.5 },
    high: { overorderScale: 1.5 },
  },
  {
    id: "shelf",
    parameter: "Shelf life shift",
    lowLabel: "−1 day",
    highLabel: "+1 day",
    low: { shelfLifeShift: -1 },
    high: { shelfLifeShift: 1 },
  },
  {
    id: "demandscale",
    parameter: "Demand scale",
    lowLabel: "0.7×",
    highLabel: "1.3×",
    low: { demandScale: 0.7 },
    high: { demandScale: 1.3 },
  },
  {
    id: "weekday",
    parameter: "Weekday shape",
    lowLabel: "flat",
    highLabel: "prior",
    low: { weekdayMode: "flat" },
    high: { weekdayMode: "prior" },
  },
];

export function runSensitivity(
  base: SimParams,
  policy: PolicyConfig,
  seeds: number[],
): SensitivityResult {
  const baseline = runSeeds(base, seeds, policy);

  const scenarios: SensitivityScenario[] = SCENARIOS.map((spec) => {
    const low = runSeeds({ ...base, ...spec.low }, seeds, policy);
    const high = runSeeds({ ...base, ...spec.high }, seeds, policy);
    return {
      id: spec.id,
      parameter: spec.parameter,
      lowLabel: spec.lowLabel,
      highLabel: spec.highLabel,
      wasteReductionLow: low.wasteReductionPct.mean,
      wasteReductionHigh: high.wasteReductionPct.mean,
      profitChangeLow: low.profitChangePct.mean,
      profitChangeHigh: high.profitChangePct.mean,
    };
  });

  // Biggest mover on profit first — that is what a tornado is for.
  scenarios.sort(
    (a, b) =>
      Math.abs(b.profitChangeHigh - b.profitChangeLow) -
      Math.abs(a.profitChangeHigh - a.profitChangeLow),
  );

  let wasteFallsIn = 0;
  let profitImprovesIn = 0;
  for (const scenario of scenarios) {
    if (scenario.wasteReductionLow > 0) wasteFallsIn++;
    if (scenario.wasteReductionHigh > 0) wasteFallsIn++;
    if (scenario.profitChangeLow > 0) profitImprovesIn++;
    if (scenario.profitChangeHigh > 0) profitImprovesIn++;
  }

  return {
    scenarios,
    baselineWasteReduction: baseline.wasteReductionPct.mean,
    baselineProfitChange: baseline.profitChangePct.mean,
    wasteFallsIn,
    profitImprovesIn,
    total: scenarios.length * 2,
  };
}
