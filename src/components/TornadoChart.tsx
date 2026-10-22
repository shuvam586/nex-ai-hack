"use client";

/**
 * The tornado chart (plans/04 §3.2, plans/03 §6.3).
 *
 * Each bar is one assumption moved to its documented low and high; the bar
 * spans the profit change between those two ends, sorted by how far it moves.
 * A bar that crosses the zero line is an assumption that can flip the
 * conclusion on its own, so the reader knows exactly where the risk lives.
 */

import {
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { ChartCard } from "@/components/ChartCard";
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
import { formatPercent } from "@/lib/format";
import type { SensitivityResult } from "@/sim/types";

interface TornadoDatum {
  parameter: string;
  base: number;
  span: number;
  low: number;
  high: number;
  lowLabel: string;
  highLabel: string;
  favorable: boolean;
}

/** A tooltip that reports the two ends of the bar rather than the stack. */
function TornadoTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload?: TornadoDatum }[];
}) {
  if (!active || !payload || payload.length === 0) return null;
  const datum = payload[0]?.payload;
  if (!datum) return null;
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="mb-1 font-medium">{datum.parameter}</p>
      <p className="text-muted-foreground">
        {datum.lowLabel}: <span className="font-mono">{formatPercent(datum.low)}</span>
      </p>
      <p className="text-muted-foreground">
        {datum.highLabel}: <span className="font-mono">{formatPercent(datum.high)}</span>
      </p>
    </div>
  );
}

export function TornadoChart({
  result,
  loading,
  onRun,
}: {
  result: SensitivityResult | null;
  loading: boolean;
  onRun: () => void;
}) {
  const data: TornadoDatum[] =
    result?.scenarios.map((scenario) => {
      const low = Math.min(scenario.profitChangeLow, scenario.profitChangeHigh);
      const high = Math.max(scenario.profitChangeLow, scenario.profitChangeHigh);
      const lowIsBelow = scenario.profitChangeLow <= scenario.profitChangeHigh;
      return {
        parameter: scenario.parameter,
        base: low,
        span: high - low,
        low: scenario.profitChangeLow,
        high: scenario.profitChangeHigh,
        lowLabel: lowIsBelow ? scenario.lowLabel : scenario.highLabel,
        highLabel: lowIsBelow ? scenario.highLabel : scenario.lowLabel,
        favorable: low >= 0,
      };
    }) ?? [];

  return (
    <ChartCard
      title="Which assumptions move the answer?"
      description="Profit change as each assumption moves low → high."
      action={
        <Button size="sm" variant="outline" onClick={onRun} disabled={loading}>
          {loading ? "Running…" : "Re-run"}
        </Button>
      }
    >
      {loading || !result ? (
        <Skeleton className="h-72 w-full" />
      ) : (
        <div className="space-y-4">
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data}
                layout="vertical"
                margin={{ top: 8, right: 16, bottom: 4, left: 8 }}
              >
                <CartesianGrid stroke={CHART_COLORS.grid} strokeDasharray="3 3" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11, fill: CHART_COLORS.muted }}
                  tickFormatter={percentTick}
                />
                <YAxis
                  type="category"
                  dataKey="parameter"
                  tick={{ fontSize: 11, fill: CHART_COLORS.muted }}
                  width={140}
                />
                <Tooltip content={<TornadoTooltip />} cursor={{ fill: "rgba(100,116,139,0.06)" }} />
                <ReferenceLine x={0} stroke={CHART_COLORS.muted} />
                <Bar dataKey="base" stackId="range" fill="transparent" isAnimationActive={false} />
                <Bar
                  dataKey="span"
                  stackId="range"
                  fill={CHART_COLORS.markdown}
                  radius={[2, 2, 2, 2]}
                  isAnimationActive={false}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Assumption</TableHead>
                <TableHead className="text-right">Waste reduction</TableHead>
                <TableHead className="text-right">Profit change</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.scenarios.map((scenario) => (
                <TableRow key={scenario.id}>
                  <TableCell>{scenario.parameter}</TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {formatPercent(scenario.wasteReductionLow)} … {formatPercent(scenario.wasteReductionHigh)}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {formatPercent(scenario.profitChangeLow)} … {formatPercent(scenario.profitChangeHigh)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <p className="text-sm">
            Waste falls in{" "}
            <span className="font-medium">
              {result.wasteFallsIn}/{result.total}
            </span>{" "}
            scenarios; profit improves in{" "}
            <span className="font-medium">
              {result.profitImprovesIn}/{result.total}
            </span>
            .
          </p>
        </div>
      )}
    </ChartCard>
  );
}
