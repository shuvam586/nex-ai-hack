/**
 * Accounting and aggregation (plans/01 §10).
 *
 * Percentage fields are stored as fractions (0…1), exactly as the formulas in
 * the spec read. The view layer multiplies by 100 when it formats them.
 */

import { CATEGORIES } from "./types";
import type {
  Category,
  Comparison,
  DayProductRecord,
  PolicyConfig,
  Product,
  SimParams,
  SimResult,
  Totals,
} from "./types";

export function emptyTotals(): Totals {
  return {
    received: 0,
    sold: 0,
    wasted: 0,
    lostSales: 0,
    revenue: 0,
    cogs: 0,
    wasteCost: 0,
    profit: 0,
    netMarginPct: 0,
    grossMarginPct: 0,
    wastePct: 0,
    soldAtMarkdown: 0,
  };
}

function accumulate(totals: Totals, record: DayProductRecord, unitCost: number): void {
  totals.received += record.received;
  totals.sold += record.sold;
  totals.wasted += record.wasted;
  totals.lostSales += record.lostSales;
  totals.revenue += record.revenue;
  totals.cogs += record.sold * unitCost;
  totals.wasteCost += record.wasted * unitCost;
  totals.soldAtMarkdown += record.soldAtMarkdown;
}

function finalize(totals: Totals): Totals {
  totals.profit = totals.revenue - totals.cogs - totals.wasteCost;
  totals.grossMarginPct =
    totals.revenue > 0 ? (totals.revenue - totals.cogs) / totals.revenue : 0;
  totals.netMarginPct = totals.revenue > 0 ? totals.profit / totals.revenue : 0;
  totals.wastePct = totals.received > 0 ? totals.wasted / totals.received : 0;
  return totals;
}

export function summarize(
  records: DayProductRecord[],
  products: Product[],
  params: SimParams,
  policy: PolicyConfig,
): SimResult {
  const costById = new Map(products.map((product) => [product.id, product.unitCost]));
  const categoryById = new Map(products.map((product) => [product.id, product.category]));

  const totals = emptyTotals();
  const byProduct: Record<string, Totals> = {};
  const byCategory: Record<Category, Totals> = {} as Record<Category, Totals>;
  for (const category of CATEGORIES) byCategory[category] = emptyTotals();

  const byDay = new Map<
    number,
    { day: number; revenue: number; wasted: number; cogs: number; wasteCost: number }
  >();

  for (const record of records) {
    const unitCost = costById.get(record.productId) ?? 0;
    const category = categoryById.get(record.productId);

    accumulate(totals, record, unitCost);

    const productTotals = byProduct[record.productId] ?? emptyTotals();
    accumulate(productTotals, record, unitCost);
    byProduct[record.productId] = productTotals;

    if (category) {
      accumulate(byCategory[category], record, unitCost);
    }

    const day = byDay.get(record.day) ?? {
      day: record.day,
      revenue: 0,
      wasted: 0,
      cogs: 0,
      wasteCost: 0,
    };
    day.revenue += record.revenue;
    day.wasted += record.wasted;
    day.cogs += record.sold * unitCost;
    day.wasteCost += record.wasted * unitCost;
    byDay.set(record.day, day);
  }

  finalize(totals);
  for (const productTotals of Object.values(byProduct)) finalize(productTotals);
  for (const categoryTotals of Object.values(byCategory)) finalize(categoryTotals);

  return {
    params,
    policy,
    records,
    totals,
    byProduct,
    byCategory,
    byDay: [...byDay.values()]
      .sort((a, b) => a.day - b.day)
      .map((day) => ({
        day: day.day,
        revenue: day.revenue,
        wasted: day.wasted,
        profit: day.revenue - day.cogs - day.wasteCost,
      })),
  };
}

/** Field-by-field difference between the markdown run and the fixed run. */
export function compare(fixed: SimResult, markdown: SimResult): Comparison {
  const delta = emptyTotals();
  for (const key of Object.keys(delta) as (keyof Totals)[]) {
    delta[key] = markdown.totals[key] - fixed.totals[key];
  }
  return { fixed, markdown, delta };
}
