"use client";

/**
 * The daily timeline (plans/03 §3, row 2): waste per day as bars, profit per
 * day as lines, fixed against markdown.
 *
 * It answers "when" rather than "how much": waste on the fixed run spikes on
 * the days a batch reaches its last day; on the markdown run those spikes are
 * mostly gone, and the profit line shows what it cost to remove them.
 */

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartCard } from "@/components/ChartCard";
import { ChartTooltip } from "@/components/ChartTooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { CHART_COLORS, compactMoney } from "@/lib/chartTheme";
import { formatMoney, formatUnits } from "@/lib/format";
import { DOW_LABELS } from "@/sim/weekday";
import type { Comparison } from "@/sim/types";

export function DailyComposedChart({
  comparison,
  loading = false,
}: {
  comparison: Comparison | null;
  loading?: boolean;
}) {
  if (loading || !comparison) {
    return (
      <ChartCard title="Every day, waste and profit">
        <Skeleton className="h-64 w-full" />
      </ChartCard>
    );
  }

  const fixedByDay = comparison.fixed.byDay;
  const markdownByDay = comparison.markdown.byDay;
  const data = fixedByDay.map((fixedDay, index) => {
    const md = markdownByDay[index];
    return {
      label: `D${fixedDay.day + 1}`,
      dow: DOW_LABELS[fixedDay.day % 7],
      wasteFixed: fixedDay.wasted,
      wasteMarkdown: md?.wasted ?? 0,
      profitFixed: fixedDay.profit,
      profitMarkdown: md?.profit ?? 0,
    };
  });

  return (
    <ChartCard
      title="Every day, waste and profit"
      description="Bars are units wasted that day; lines are profit that day."
    >
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
            <CartesianGrid stroke={CHART_COLORS.grid} strokeDasharray="3 3" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: CHART_COLORS.muted }}
              interval={4}
            />
            <YAxis
              yAxisId="waste"
              tick={{ fontSize: 11, fill: CHART_COLORS.muted }}
              tickFormatter={(value: number) => formatUnits(value)}
              width={44}
            />
            <YAxis
              yAxisId="profit"
              orientation="right"
              tick={{ fontSize: 11, fill: CHART_COLORS.muted }}
              tickFormatter={compactMoney}
              width={56}
            />
            <Tooltip
              content={
                <ChartTooltip
                  labelFormatter={(label) => `Day ${String(label).replace("D", "")}`}
                  valueFormatter={(value, dataKey) =>
                    String(dataKey).startsWith("profit")
                      ? formatMoney(value)
                      : `${formatUnits(value)} units`
                  }
                />
              }
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar
              yAxisId="waste"
              dataKey="wasteFixed"
              name="Waste — fixed"
              fill={CHART_COLORS.fixed}
              radius={[2, 2, 0, 0]}
            />
            <Bar
              yAxisId="waste"
              dataKey="wasteMarkdown"
              name="Waste — markdown"
              fill={CHART_COLORS.markdown}
              radius={[2, 2, 0, 0]}
            />
            <Line
              yAxisId="profit"
              type="monotone"
              dataKey="profitFixed"
              name="Profit — fixed"
              stroke={CHART_COLORS.fixed}
              strokeDasharray="4 4"
              strokeWidth={1.5}
              dot={false}
            />
            <Line
              yAxisId="profit"
              type="monotone"
              dataKey="profitMarkdown"
              name="Profit — markdown"
              stroke={CHART_COLORS.markdown}
              strokeWidth={2}
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}
