"use client";

/**
 * The per-product drill-down (plans/03 §4).
 *
 * Shows what the markdown rule actually did to one product: a stacked bar of
 * start-of-day stock split by days-to-expiry (so batches visibly age 3 → 2 →
 * 1), the effective price line over the month, and the sales split — full
 * price vs markdown vs wasted — for both policies.
 */

import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ChartTooltip } from "@/components/ChartTooltip";
import { CHART_COLORS, ageColor, compactMoney } from "@/lib/chartTheme";
import { formatMoney, formatPercent, formatUnits } from "@/lib/format";
import { DOW_LABELS } from "@/sim/weekday";
import type { DayProductRecord, Product } from "@/sim/types";

function maxDaysLeft(records: DayProductRecord[]): number {
  let max = 1;
  for (const record of records) {
    for (const key of Object.keys(record.stockByDaysLeft)) {
      const value = Number(key);
      if (value > max) max = value;
    }
  }
  return max;
}

export function ProductDrawer({
  product,
  fixedRecords,
  markdownRecords,
  onClose,
}: {
  product: Product | null;
  fixedRecords: DayProductRecord[];
  markdownRecords: DayProductRecord[];
  onClose: () => void;
}) {
  const open = product !== null;
  const records = markdownRecords;

  const days = maxDaysLeft(records);
  const ageKeys = Array.from({ length: days }, (_, index) => index + 1);

  const stockData = records.map((record) => {
    const row: Record<string, number | string> = {
      label: `D${record.day + 1}`,
      dow: DOW_LABELS[record.day % 7],
      price: product ? product.basePrice * (1 - record.maxDiscount) : 0,
    };
    for (const age of ageKeys) {
      row[`age${age}`] = record.stockByDaysLeft[age] ?? 0;
    }
    return row;
  });

  const fixedSales = {
    soldFull: fixedRecords.reduce((sum, r) => sum + (r.sold - r.soldAtMarkdown), 0),
    soldAtMarkdown: fixedRecords.reduce((sum, r) => sum + r.soldAtMarkdown, 0),
    wasted: fixedRecords.reduce((sum, r) => sum + r.wasted, 0),
  };
  const markdownSales = {
    soldFull: records.reduce((sum, r) => sum + (r.sold - r.soldAtMarkdown), 0),
    soldAtMarkdown: records.reduce((sum, r) => sum + r.soldAtMarkdown, 0),
    wasted: records.reduce((sum, r) => sum + r.wasted, 0),
  };
  const salesData = [
    { policy: "Fixed", ...fixedSales },
    { policy: "Markdown", ...markdownSales },
  ];

  const markedDownDays = records.filter((record) => record.maxDiscount > 0).length;
  const rescued = Math.max(0, fixedSales.wasted - markdownSales.wasted);

  return (
    <Sheet open={open} onOpenChange={(next) => (next ? null : onClose())}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>{product?.name ?? "Product"}</SheetTitle>
          <SheetDescription>
            {product ? `${product.category} · shelf life ${product.shelfLife} days` : ""}
          </SheetDescription>
        </SheetHeader>

        {product ? (
          <div className="space-y-6 px-4 pb-6">
            <p className="text-sm">
              Marked down on <span className="font-medium">{markedDownDays}</span> of{" "}
              {records.length} days; rescued{" "}
              <span className="font-medium">{formatUnits(rescued)}</span> units; wasted{" "}
              <span className="font-medium">{formatUnits(markdownSales.wasted)}</span>.
            </p>

            <div>
              <h3 className="text-sm font-semibold">Stock by days-to-expiry</h3>
              <p className="mb-2 text-xs text-muted-foreground">
                Each colour band is a batch age. Bands march left as stock ages toward expiry.
              </p>
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={stockData} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
                    <CartesianGrid stroke={CHART_COLORS.grid} strokeDasharray="3 3" />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 11, fill: CHART_COLORS.muted }}
                      interval={4}
                    />
                    <YAxis
                      yAxisId="units"
                      tick={{ fontSize: 11, fill: CHART_COLORS.muted }}
                      width={44}
                    />
                    <YAxis
                      yAxisId="price"
                      orientation="right"
                      tick={{ fontSize: 11, fill: CHART_COLORS.muted }}
                      tickFormatter={compactMoney}
                      width={56}
                    />
                    <Tooltip
                      content={
                        <ChartTooltip
                          valueFormatter={(value, dataKey) =>
                            String(dataKey) === "price" ? formatMoney(value) : formatUnits(value)
                          }
                        />
                      }
                    />
                    {ageKeys.map((age) => (
                      <Bar
                        key={age}
                        yAxisId="units"
                        dataKey={`age${age}`}
                        name={age === 1 ? "1 day left" : `${age} days left`}
                        stackId="stock"
                        fill={ageColor(age)}
                      />
                    ))}
                    <Line
                      yAxisId="price"
                      type="stepAfter"
                      dataKey="price"
                      name="Price"
                      stroke={CHART_COLORS.fixed}
                      strokeWidth={2}
                      dot={false}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold">Sales split</h3>
              <p className="mb-2 text-xs text-muted-foreground">
                Full price vs markdown vs wasted, fixed against markdown.
              </p>
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={salesData} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
                    <CartesianGrid stroke={CHART_COLORS.grid} strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="policy" tick={{ fontSize: 11, fill: CHART_COLORS.muted }} />
                    <YAxis tick={{ fontSize: 11, fill: CHART_COLORS.muted }} width={44} />
                    <Tooltip content={<ChartTooltip valueFormatter={(value) => formatUnits(value)} />} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="soldFull" name="Full price" fill={CHART_COLORS.fixed} stackId="s" />
                    <Bar
                      dataKey="soldAtMarkdown"
                      name="At markdown"
                      fill={CHART_COLORS.markdown}
                      stackId="s"
                    />
                    <Bar dataKey="wasted" name="Wasted" fill={CHART_COLORS.waste} stackId="s" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Base price</p>
                <p className="font-mono">{formatMoney(product.basePrice)}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Avg discount when sold</p>
                <p className="font-mono">
                  {formatPercent(
                    (() => {
                      const md = records.reduce((sum, r) => sum + r.soldAtMarkdown, 0);
                      if (md === 0) return 0;
                      const weighted = records.reduce(
                        (sum, r) => sum + r.maxDiscount * r.soldAtMarkdown,
                        0,
                      );
                      return weighted / md;
                    })(),
                  )}
                </p>
              </div>
            </div>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
