"use client";

/**
 * The 10-seed evaluation (plans/03 §6.1).
 *
 * A single seed can flatter any rule, so the headline is the mean over ten
 * seeds with a 95% interval, the win-rate on profit, and every seed drawn so a
 * judge can see there is no cherry-pick hiding in the average.
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
import { Button } from "@/components/ui/button";
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
import { formatPercent, formatPoints } from "@/lib/format";
import type { EvalResult, SeedStat } from "@/sim/types";

function range(stat: SeedStat, format: (value: number) => string): string {
  return `${format(stat.mean)}  (${format(stat.ci95[0])} … ${format(stat.ci95[1])})`;
}

export function EvalCard({
  result,
  loading,
  mode,
  seeds,
  onModeChange,
  onRun,
}: {
  result: EvalResult | null;
  loading: boolean;
  mode: "benchmark" | "current";
  seeds: number[];
  onModeChange: (mode: "benchmark" | "current") => void;
  onRun: () => void;
}) {
  const chartData =
    result?.perSeed.map((row) => ({
      seed: String(row.seed),
      waste: row.wasteReductionPct,
      profit: row.profitChangePct,
    })) ?? [];

  return (
    <ChartCard
      title="Does it hold across seeds?"
      description={`Fixed vs markdown over seeds ${seeds[0]}–${seeds[seeds.length - 1]}. The interval is the honest part.`}
      action={
        <div className="flex flex-wrap items-center justify-end gap-2">
          <div className="flex rounded-md border bg-background p-0.5" aria-label="Evaluation seed range">
            <Button
              size="sm"
              variant={mode === "benchmark" ? "default" : "ghost"}
              onClick={() => onModeChange("benchmark")}
              disabled={loading}
            >
              Benchmark
            </Button>
            <Button
              size="sm"
              variant={mode === "current" ? "default" : "ghost"}
              onClick={() => onModeChange("current")}
              disabled={loading}
            >
              Current-seed range
            </Button>
          </div>
          <Button size="sm" variant="outline" onClick={onRun} disabled={loading}>
            {loading ? "Running…" : "Re-run"}
          </Button>
        </div>
      }
    >
      <p className="mb-3 text-xs text-muted-foreground">
        {mode === "benchmark"
          ? "Stable benchmark: always uses seeds 1–10, independent of the dashboard seed."
          : `Current-seed range: uses seed ${seeds[0]} and the next nine seeds.`}
      </p>
      {loading || !result ? (
        <Skeleton className="h-56 w-full" />
      ) : (
        <div className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Metric</TableHead>
                <TableHead className="text-right">Mean (95% CI)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>Waste reduction</TableCell>
                <TableCell className="text-right font-mono tabular-nums">
                  {range(result.wasteReductionPct, (value) => formatPercent(value))}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Net margin change</TableCell>
                <TableCell className="text-right font-mono tabular-nums">
                  {range(result.marginChangePts, (value) => formatPoints(value))}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Profit change</TableCell>
                <TableCell className="text-right font-mono tabular-nums">
                  {range(result.profitChangePct, (value) => formatPercent(value))}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Revenue change</TableCell>
                <TableCell className="text-right font-mono tabular-nums">
                  {range(result.revenueChangePct, (value) => formatPercent(value))}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>

          <p className="text-sm">
            Markdown wins on profit in{" "}
            <span className="font-medium">
              {Math.round((result.profitChangePct.winRate ?? 0) * result.seeds.length)}/
              {result.seeds.length}
            </span>{" "}
            seeds.
          </p>

          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
                <CartesianGrid stroke={CHART_COLORS.grid} strokeDasharray="3 3" />
                <XAxis dataKey="seed" tick={{ fontSize: 11, fill: CHART_COLORS.muted }} />
                <YAxis
                  yAxisId="waste"
                  tick={{ fontSize: 11, fill: CHART_COLORS.muted }}
                  tickFormatter={percentTick}
                  width={44}
                />
                <YAxis
                  yAxisId="profit"
                  orientation="right"
                  tick={{ fontSize: 11, fill: CHART_COLORS.muted }}
                  tickFormatter={percentTick}
                  width={44}
                />
                <Tooltip
                  content={
                    <ChartTooltip
                      labelFormatter={(label) => `Seed ${label}`}
                      valueFormatter={(value) => formatPercent(value)}
                    />
                  }
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar
                  yAxisId="waste"
                  dataKey="waste"
                  name="Waste reduction"
                  fill={CHART_COLORS.markdown}
                  radius={[2, 2, 0, 0]}
                />
                <Line
                  yAxisId="profit"
                  type="monotone"
                  dataKey="profit"
                  name="Profit change"
                  stroke={CHART_COLORS.fixed}
                  strokeWidth={2}
                  dot={{ r: 2 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </ChartCard>
  );
}
