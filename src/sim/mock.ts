/**
 * A hand-made result for building the UI against (plans/02 §2).
 *
 * The numbers here are made up — they are *not* a simulation run. They exist
 * so the dashboard can be built and styled before the engine is wired in. The
 * shape is real, though: the same `summarize` that the engine uses produces
 * the totals, so the UI can rely on the contract.
 */

import { CATALOG, DEFAULT_PARAMS } from "./catalog";
import { summarize } from "./metrics";
import { DEFAULT_MARKDOWN_POLICY } from "./policies";
import type { DayProductRecord, SimResult } from "./types";

function buildRecords(): DayProductRecord[] {
  const records: DayProductRecord[] = [];

  CATALOG.forEach((product, productIndex) => {
    for (let day = 0; day < DEFAULT_PARAMS.days; day++) {
      const weekday = day % 7;
      const received = Math.round(product.avgDailyDemand * (1.1 + 0.05 * (weekday % 3)));
      const sold = Math.round(product.avgDailyDemand * (0.95 + 0.04 * (weekday % 4)));
      const wasted = Math.max(0, received - sold - Math.round(product.avgDailyDemand * 0.1));
      const soldAtMarkdown = Math.round(sold * 0.15);
      const maxDiscount = weekday % 3 === 0 ? 0.4 : weekday % 3 === 1 ? 0.2 : 0;

      const stockByDaysLeft: Record<number, number> = {};
      for (let daysLeft = 1; daysLeft <= product.shelfLife; daysLeft++) {
        stockByDaysLeft[daysLeft] = Math.round(product.avgDailyDemand * 0.3);
      }

      records.push({
        day,
        productId: product.id,
        startStock: Math.round(product.avgDailyDemand * 0.4),
        received,
        sold,
        soldAtMarkdown,
        wasted,
        lostSales: productIndex % 7 === day % 7 ? 2 : 0,
        demand: Math.round(product.avgDailyDemand * (1 + 0.1 * (weekday % 3))),
        maxDiscount,
        stockByDaysLeft,
        revenue: sold * product.basePrice * (1 - 0.1 * soldAtMarkdown / Math.max(sold, 1)),
        deals:
          maxDiscount > 0
            ? [{ daysLeft: 1, discount: maxDiscount, qty: Math.round(product.avgDailyDemand * 0.2) }]
            : [],
      });
    }
  });

  return records;
}

export const MOCK_RESULT: SimResult = summarize(
  buildRecords(),
  CATALOG,
  { ...DEFAULT_PARAMS, seed: 42 },
  DEFAULT_MARKDOWN_POLICY,
);
