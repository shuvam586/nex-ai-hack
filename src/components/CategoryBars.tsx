"use client";

/**
 * The category breakdown (plans/03 §3, row 3).
 *
 * Waste is where the categories differ most (short-life bakery and deli carry
 * the most), so it leads; the profit change by category sits underneath as a
 * small table — the same story in money.
 */

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartCard } from "@/components/ChartCard";
import { ChartTooltip } from "@/components/ChartTooltip";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CHART_COLORS, percentTick } from "@/lib/chartTheme";
import { formatDeltaMoney, formatPercent, formatPoints } from "@/lib/format";
import { CATEGORIES } from "@/sim/types";
import type { Comparison } from "@/sim/types";

export function CategoryBars({
  comparison,
  loading = false,
}: {
  comparison: Comparison | null;
  loading?: boolean;
}) {
  if (loading || !comparison) {
    return (
      <ChartCard title="Waste by category">
        <Skeleton className="h-64 w-full" />
      </ChartCard>
    );
  }

  const data = CATEGORIES.map((category) => ({
    category,
    fixed: comparison.fixed.byCategory[category].wastePct,
    markdown: comparison.markdown.byCategory[category].wastePct,
  }));

  return (
    <ChartCard
      title="Waste by category"
      description="Share of units received that were written off, fixed vs markdown."
    >
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
            <CartesianGrid stroke={CHART_COLORS.grid} strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="category" tick={{ fontSize: 11, fill: CHART_COLORS.muted }} />
            <YAxis
              tick={{ fontSize: 11, fill: CHART_COLORS.muted }}
              tickFormatter={percentTick}
              width={44}
            />
            <Tooltip
              content={
                <ChartTooltip
                  valueFormatter={(value) => formatPercent(value)}
                />
              }
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="fixed" name="Fixed" fill={CHART_COLORS.fixed} radius={[2, 2, 0, 0]} />
            <Bar
              dataKey="markdown"
              name="Markdown"
              fill={CHART_COLORS.markdown}
              radius={[2, 2, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Profit Δ</TableHead>
              <TableHead className="text-right">Net margin Δ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {CATEGORIES.map((category) => {
              const fixed = comparison.fixed.byCategory[category];
              const markdown = comparison.markdown.byCategory[category];
              const profitDelta = markdown.profit - fixed.profit;
              const marginDelta = (markdown.netMarginPct - fixed.netMarginPct) * 100;
              return (
                <TableRow key={category}>
                  <TableCell>{category}</TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {formatDeltaMoney(profitDelta)}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {formatPoints(marginDelta)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </ChartCard>
  );
}
