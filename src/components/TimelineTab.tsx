"use client";

/**
 * The markdown timeline (plans/03 §5).
 *
 * A 20 × 30 grid: each row is a product, each column a day, and the cell
 * colour is the discount live that day. A red dot marks a day with waste.
 * Flipping to the fixed run drops the colours and leaves the dots — which is
 * the contrast the whole project is about, in one glance.
 *
 * Built with a CSS grid; a native `title` carries the per-cell detail so the
 * 600 cells stay cheap.
 */

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CHART_COLORS } from "@/lib/chartTheme";
import { formatPercent, formatUnits } from "@/lib/format";
import { CATALOG } from "@/sim/catalog";
import { CATEGORIES, type Category, type DayProductRecord } from "@/sim/types";
import { DOW_LABELS } from "@/sim/weekday";
import { useSimStore } from "@/store/useSimStore";

type Run = "markdown" | "fixed";

function discountColor(discount: number): string {
  if (discount <= 0) return "transparent";
  if (discount <= 0.2) return CHART_COLORS.tier20;
  if (discount <= 0.4) return CHART_COLORS.tier40;
  return CHART_COLORS.tier60;
}

function recordKey(productId: string, day: number): string {
  return `${productId}:${day}`;
}

export function TimelineTab() {
  const comparison = useSimStore((state) => state.comparison);
  const loading = useSimStore((state) => state.loading);
  const [run, setRun] = useState<Run>("markdown");

  const { byCategory, lookup, days } = useMemo(() => {
    const categoryMap = new Map<Category, typeof CATALOG>();
    for (const category of CATEGORIES) categoryMap.set(category, []);
    for (const product of CATALOG) categoryMap.get(product.category)!.push(product);

    const map = new Map<string, DayProductRecord>();
    let maxDay = 0;
    if (comparison) {
      const records = run === "markdown" ? comparison.markdown.records : comparison.fixed.records;
      for (const record of records) {
        map.set(recordKey(record.productId, record.day), record);
        if (record.day + 1 > maxDay) maxDay = record.day + 1;
      }
    }
    return { byCategory: categoryMap, lookup: map, days: maxDay || 30 };
  }, [comparison, run]);

  if (loading || !comparison) {
    return <Skeleton className="h-96 w-full" />;
  }

  const dayColumns = Array.from({ length: days }, (_, index) => index);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant={run === "markdown" ? "default" : "outline"}
          onClick={() => setRun("markdown")}
        >
          Markdown run
        </Button>
        <Button
          size="sm"
          variant={run === "fixed" ? "default" : "outline"}
          onClick={() => setRun("fixed")}
        >
          Fixed run
        </Button>
        <div className="ml-auto flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <span
              className="inline-block size-3 rounded-sm border"
              style={{ background: CHART_COLORS.tier20 }}
            />
            20%
          </span>
          <span className="flex items-center gap-1">
            <span
              className="inline-block size-3 rounded-sm border"
              style={{ background: CHART_COLORS.tier40 }}
            />
            40%
          </span>
          <span className="flex items-center gap-1">
            <span
              className="inline-block size-3 rounded-sm border"
              style={{ background: CHART_COLORS.tier60 }}
            />
            60%+
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block size-2 rounded-full" style={{ background: CHART_COLORS.waste }} />
            wasted
          </span>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border bg-card p-3">
        <div className="min-w-[900px]">
          <div
            className="grid items-center gap-1 text-[10px] text-muted-foreground"
            style={{ gridTemplateColumns: `200px repeat(${days}, minmax(0, 1fr))` }}
          >
            <div />
            {dayColumns.map((day) => (
              <div
                key={day}
                className="text-center tabular-nums"
                style={{
                  background:
                    day % 7 >= 5 ? "rgba(100,116,139,0.08)" : undefined,
                  borderRadius: 4,
                }}
              >
                {DOW_LABELS[day % 7].slice(0, 1)}
              </div>
            ))}
          </div>

          {CATEGORIES.map((category) => (
            <div key={category} className="mt-3">
              <p className="mb-1 text-xs font-semibold text-muted-foreground">{category}</p>
              {byCategory.get(category)!.map((product) => (
                <div
                  key={product.id}
                  className="grid items-center gap-1"
                  style={{ gridTemplateColumns: `200px repeat(${days}, minmax(0, 1fr))` }}
                >
                  <div className="truncate pr-2 text-xs" title={product.name}>
                    {product.name}
                  </div>
                  {dayColumns.map((day) => {
                    const record = lookup.get(recordKey(product.id, day));
                    const discount = record?.maxDiscount ?? 0;
                    const wasted = record?.wasted ?? 0;
                    const weekend = day % 7 >= 5;
                    return (
                      <div
                        key={day}
                        className="relative flex h-5 items-center justify-center rounded-sm border"
                        style={{
                          background:
                            discount > 0
                              ? discountColor(discount)
                              : weekend
                                ? "rgba(100,116,139,0.06)"
                                : "transparent",
                        }}
                        title={
                          record
                            ? `${product.name} · day ${day + 1} (${DOW_LABELS[day % 7]})\n` +
                              `Discount: ${formatPercent(discount)}\n` +
                              `Sold at markdown: ${formatUnits(record.soldAtMarkdown)}\n` +
                              `Wasted: ${formatUnits(wasted)}\n` +
                              `Stock: ${Object.entries(record.stockByDaysLeft)
                                .map(([age, qty]) => `${qty}×${age}d`)
                                .join(", ") || "none"}`
                            : `${product.name} · day ${day + 1}`
                        }
                      >
                        {wasted > 0 ? (
                          <span
                            className="size-1.5 rounded-full"
                            style={{ background: CHART_COLORS.waste }}
                            aria-hidden="true"
                          />
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Cells are the highest discount live that day; red dots mark units written off. Switch runs
        to see the same shelf under fixed price.
      </p>
    </div>
  );
}
