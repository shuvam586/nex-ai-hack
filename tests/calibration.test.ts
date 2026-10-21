import { describe, expect, it } from "vitest";
import { runSeeds, runSim } from "@/sim/runner";
import { CATEGORIES, type Category, type SimParams } from "@/sim/types";
import { DEFAULT_PARAMS } from "@/sim/catalog";
import { DEFAULT_MARKDOWN_POLICY, BLANKET_POLICY, FIXED_POLICY } from "@/sim/policies";

const SEEDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

function params(overrides: Partial<SimParams> = {}): SimParams {
  return { ...DEFAULT_PARAMS, ...overrides };
}

interface CategoryStats {
  category: Category;
  received: number;
  sold: number;
  wasted: number;
  lostSales: number;
  revenue: number;
  profit: number;
}

function aggregate(seeds: number[]): {
  overall: CategoryStats;
  byCategory: Record<Category, CategoryStats>;
} {
  const blank = (category: Category): CategoryStats => ({
    category,
    received: 0,
    sold: 0,
    wasted: 0,
    lostSales: 0,
    revenue: 0,
    profit: 0,
  });

  const overall = blank("Bakery");
  const byCategory = {} as Record<Category, CategoryStats>;
  for (const category of CATEGORIES) byCategory[category] = blank(category);

  for (const seed of seeds) {
    const result = runSim(params({ seed }), FIXED_POLICY);
    for (const category of CATEGORIES) {
      const totals = result.byCategory[category];
      const target = byCategory[category];
      target.received += totals.received;
      target.sold += totals.sold;
      target.wasted += totals.wasted;
      target.lostSales += totals.lostSales;
      target.revenue += totals.revenue;
      target.profit += totals.profit;
    }
    overall.received += result.totals.received;
    overall.sold += result.totals.sold;
    overall.wasted += result.totals.wasted;
    overall.lostSales += result.totals.lostSales;
    overall.revenue += result.totals.revenue;
    overall.profit += result.totals.profit;
  }

  return { overall, byCategory };
}

const wastePct = (stats: CategoryStats) =>
  stats.received > 0 ? stats.wasted / stats.received : 0;
const netMarginPct = (stats: CategoryStats) =>
  stats.revenue > 0 ? stats.profit / stats.revenue : 0;
const stockOutRate = (stats: CategoryStats) =>
  stats.sold + stats.lostSales > 0 ? stats.lostSales / (stats.sold + stats.lostSales) : 0;

describe("calibration under the fixed price policy (plans/01 §10)", () => {
  const { overall, byCategory } = aggregate(SEEDS);

  it("prints the per-category report", () => {
    const rows = CATEGORIES.map((category) => {
      const stats = byCategory[category];
      return {
        category,
        "waste %": (wastePct(stats) * 100).toFixed(1),
        "net margin %": (netMarginPct(stats) * 100).toFixed(1),
        "stock-out %": (stockOutRate(stats) * 100).toFixed(1),
        received: stats.received,
        wasted: stats.wasted,
      };
    });

    console.table(rows);
    console.log(
      `OVERALL  waste ${(wastePct(overall) * 100).toFixed(2)}%  ` +
        `net margin ${(netMarginPct(overall) * 100).toFixed(2)}%  ` +
        `stock-out ${(stockOutRate(overall) * 100).toFixed(2)}%  ` +
        `received ${overall.received}  wasted ${overall.wasted}`,
    );

    expect(rows).toHaveLength(5);
  });

  it("keeps overall waste between 7% and 12% of received units", () => {
    expect(wastePct(overall)).toBeGreaterThanOrEqual(0.07);
    expect(wastePct(overall)).toBeLessThanOrEqual(0.12);
  });

  it("keeps net margin between 30% and 42%", () => {
    expect(netMarginPct(overall)).toBeGreaterThanOrEqual(0.3);
    expect(netMarginPct(overall)).toBeLessThanOrEqual(0.42);
  });

  it("keeps the stock-out rate below 6%", () => {
    expect(stockOutRate(overall)).toBeLessThan(0.06);
  });

  it("wastes something in every category", () => {
    for (const category of CATEGORIES) {
      expect(wastePct(byCategory[category])).toBeGreaterThan(0);
    }
  });

  it("wastes more in Bakery and Deli than in Dairy", () => {
    expect(wastePct(byCategory.Bakery)).toBeGreaterThan(wastePct(byCategory.Dairy));
    expect(wastePct(byCategory.Deli)).toBeGreaterThan(wastePct(byCategory.Dairy));
  });
});

describe("fixed price vs. the default markdown rule (10 seeds)", () => {
  it("reports the difference without asserting a direction", () => {
    const evaluation = runSeeds(DEFAULT_PARAMS, SEEDS, DEFAULT_MARKDOWN_POLICY);

    console.log(
      [
        `waste reduction   ${(evaluation.wasteReductionPct.mean * 100).toFixed(2)}% ` +
          `(CI ${(evaluation.wasteReductionPct.ci95[0] * 100).toFixed(2)}..` +
          `${(evaluation.wasteReductionPct.ci95[1] * 100).toFixed(2)})`,
        `net margin change ${evaluation.marginChangePts.mean.toFixed(2)} pts ` +
          `(CI ${evaluation.marginChangePts.ci95[0].toFixed(2)}..` +
          `${evaluation.marginChangePts.ci95[1].toFixed(2)})`,
        `profit change     ${(evaluation.profitChangePct.mean * 100).toFixed(2)}% ` +
          `(win rate ${((evaluation.profitChangePct.winRate ?? 0) * 100).toFixed(0)}%)`,
        `revenue change    ${(evaluation.revenueChangePct.mean * 100).toFixed(2)}%`,
      ].join("\n"),
    );

    expect(evaluation.perSeed).toHaveLength(SEEDS.length);
  });
});

describe("policy comparison (10 seeds, fixed price baseline)", () => {
  it("prints waste, margin and stock-outs for every policy", () => {
    const scenarios = [
      { name: "fixed", policy: FIXED_POLICY, params: DEFAULT_PARAMS },
      { name: "markdown default", policy: DEFAULT_MARKDOWN_POLICY, params: DEFAULT_PARAMS },
      { name: "blanket 30%", policy: BLANKET_POLICY, params: DEFAULT_PARAMS },
      {
        name: "markdown, half response",
        policy: DEFAULT_MARKDOWN_POLICY,
        params: { ...DEFAULT_PARAMS, responseScale: 0.5 },
      },
      {
        name: "blanket, half response",
        policy: BLANKET_POLICY,
        params: { ...DEFAULT_PARAMS, responseScale: 0.5 },
      },
    ];

    const rows = scenarios.map((scenario) => {
      let received = 0;
      let wasted = 0;
      let revenue = 0;
      let profit = 0;
      let sold = 0;
      let lost = 0;
      let markdownUnits = 0;

      for (const seed of SEEDS) {
        const result = runSim({ ...scenario.params, seed }, scenario.policy);
        received += result.totals.received;
        wasted += result.totals.wasted;
        revenue += result.totals.revenue;
        profit += result.totals.profit;
        sold += result.totals.sold;
        lost += result.totals.lostSales;
        markdownUnits += result.totals.soldAtMarkdown;
      }

      return {
        policy: scenario.name,
        "waste %": ((wasted / received) * 100).toFixed(2),
        "net margin %": ((profit / revenue) * 100).toFixed(2),
        "stock-out %": ((lost / (sold + lost)) * 100).toFixed(2),
        "units at markdown %": ((markdownUnits / sold) * 100).toFixed(1),
        "revenue $": Math.round(revenue).toLocaleString("en-US"),
      };
    });

    console.table(rows);
    expect(rows).toHaveLength(scenarios.length);
  });
});
