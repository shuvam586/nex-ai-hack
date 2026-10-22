"use client";

/**
 * The hero chart (plans/03 §3, row 2): profit against units wasted.
 *
 * It is the whole argument on one set of axes. The tiered markdown rule sits
 * up and to the left of fixed price; the blanket 30% discount sits furthest
 * left but well below — the lowest waste, bought with margin. The faint sweep
 * traces the tiered rule as its discount deepens, so the reader can see the
 * turn rather than take our word for it.
 */

import {
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Scatter,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartCard } from "@/components/ChartCard";
import { ChartTooltip } from "@/components/ChartTooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { CHART_COLORS, compactMoney } from "@/lib/chartTheme";
import { formatMoney, formatUnits } from "@/lib/format";
import type { Comparison, TradeoffExtras } from "@/sim/types";

export function TradeoffScatter({
  comparison,
  extras,
  loading = false,
}: {
  comparison: Comparison | null;
  extras: TradeoffExtras | null;
  loading?: boolean;
}) {
  if (loading || !comparison || !extras) {
    return (
      <ChartCard title="Waste vs profit">
        <Skeleton className="h-64 w-full" />
      </ChartCard>
    );
  }

  const fixed = comparison.fixed.totals;
  const markdown = comparison.markdown.totals;

  const fixedPoint = [{ waste: fixed.wasted, profit: fixed.profit }];
  const markdownPoint = [{ waste: markdown.wasted, profit: markdown.profit }];
  const blanketPoint = [{ waste: extras.blanket.waste, profit: extras.blanket.profit }];

  return (
    <ChartCard
      title="Waste vs profit"
      description="Same shoppers, same seed. Up-and-left is better: less waste, more profit."
    >
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
            <CartesianGrid stroke={CHART_COLORS.grid} strokeDasharray="3 3" />
            <XAxis
              type="number"
              dataKey="waste"
              name="Units wasted"
              tick={{ fontSize: 11, fill: CHART_COLORS.muted }}
              tickFormatter={(value: number) => formatUnits(value)}
              domain={[0, "dataMax"]}
            />
            <YAxis
              type="number"
              dataKey="profit"
              name="Profit"
              tick={{ fontSize: 11, fill: CHART_COLORS.muted }}
              tickFormatter={compactMoney}
              width={56}
            />
            <Tooltip
              content={
                <ChartTooltip
                  labelFormatter={() => "Profit vs waste"}
                  valueFormatter={(value, dataKey) =>
                    dataKey === "profit" ? formatMoney(value) : `${formatUnits(value)} units`
                  }
                />
              }
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />

            <Line
              name="Sweep (deeper discount →)"
              data={extras.sweep}
              dataKey="profit"
              stroke={CHART_COLORS.muted}
              strokeDasharray="4 4"
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={false}
            />
            <Scatter name="Fixed price" data={fixedPoint} fill={CHART_COLORS.fixed} />
            <Scatter name="Markdown rule" data={markdownPoint} fill={CHART_COLORS.markdown} />
            <Scatter name="Blanket 30% off" data={blanketPoint} fill={CHART_COLORS.tier60} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Discount everything: lowest waste, but profit falls — every shopper is now trading down.
      </p>
    </ChartCard>
  );
}
