"use client";

/**
 * The optimiser tab (plans/03 §7, plans/04 §2).
 *
 * Searches 2-step rules per category and reports each winner twice: on the
 * seeds it was tuned on (in-sample) and on ten seeds it never saw (held-out).
 * The gap between the two is the honesty check — if the search were
 * over-fitting, the held-out number would fall apart.
 */

import { useState } from "react";
import {
  CartesianGrid,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChartCard } from "@/components/ChartCard";
import { ChartTooltip } from "@/components/ChartTooltip";
import { Slider } from "@/components/ui/slider";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { CHART_COLORS, compactMoney } from "@/lib/chartTheme";
import { formatMoney, formatPercent, formatSignedPercent, formatUnits } from "@/lib/format";
import type { CategoryOpt, Tier } from "@/sim/types";
import { useSimStore } from "@/store/useSimStore";

function tiersLabel(tiers: Tier[]): string {
  if (tiers.length === 0) return "No markdown";
  return tiers
    .map((tier) => `≤${tier.daysLeft}d: ${Math.round(tier.discount * 100)}%`)
    .join(" · ");
}

function gainClass(value: number): string {
  return value >= 0 ? "text-policy-markdown" : "text-waste";
}

function CategoryCard({ opt, onApply }: { opt: CategoryOpt; onApply: () => void }) {
  const best = opt.tried.reduce<null | (typeof opt.tried)[number]>((current, point) => {
    if (!current) return point;
    return point.profit > current.profit ? point : current;
  }, null);
  const points = opt.tried.map((point) => ({ waste: point.waste, profit: point.profit }));
  const bestPoint = best ? [{ waste: best.waste, profit: best.profit }] : [];

  return (
    <Card className="gap-3 p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-heading text-sm font-semibold">{opt.category}</p>
          <p className="text-xs text-muted-foreground">{tiersLabel(opt.best)}</p>
        </div>
        <Button size="sm" variant="outline" onClick={onApply}>
          Apply
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs">
        <div>
          <p className="text-muted-foreground">Train gain</p>
          <p className={`font-mono tabular-nums ${gainClass(opt.trainProfitGainPct)}`}>
            {formatSignedPercent(opt.trainProfitGainPct)}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">Held-out gain</p>
          <p className={`font-mono tabular-nums ${gainClass(opt.testProfitGainPct)}`}>
            {formatSignedPercent(opt.testProfitGainPct)}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">Waste ↓</p>
          <p className="font-mono tabular-nums text-policy-markdown">
            {formatPercent(opt.wasteReductionPct)}
          </p>
        </div>
      </div>

      <div className="h-32 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid stroke={CHART_COLORS.grid} strokeDasharray="3 3" />
            <XAxis
              type="number"
              dataKey="waste"
              tick={{ fontSize: 10, fill: CHART_COLORS.muted }}
              tickFormatter={formatUnits}
            />
            <YAxis
              type="number"
              dataKey="profit"
              tick={{ fontSize: 10, fill: CHART_COLORS.muted }}
              tickFormatter={compactMoney}
              width={44}
            />
            <Tooltip
              content={
                <ChartTooltip
                  valueFormatter={(value, dataKey) =>
                    dataKey === "profit" ? formatMoney(value) : `${formatUnits(value)} units`
                  }
                />
              }
            />
            <Scatter name="Tried" data={points} fill={CHART_COLORS.muted} />
            <Scatter name="Best" data={bestPoint} fill={CHART_COLORS.markdown} />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

// Card is imported above with the other UI primitives.

export function OptimizeTab() {
  const result = useSimStore((state) => state.optimizeResult);
  const task = useSimStore((state) => state.task);
  const runOptimize = useSimStore((state) => state.runOptimize);
  const applyOptimized = useSimStore((state) => state.applyOptimized);
  const setCategoryOverride = useSimStore((state) => state.setCategoryOverride);
  const setPolicy = useSimStore((state) => state.setPolicy);

  const [wasteWeighted, setWasteWeighted] = useState(false);
  const [weight, setWeight] = useState(0.25);

  const running = task?.kind === "optimize";

  return (
    <div className="space-y-4">
      <ChartCard
        title="Search best discount steps per category"
        description="Each category is optimised on its own products, then re-checked on held-out seeds."
      >
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Objective</span>
            <Button
              size="sm"
              variant={!wasteWeighted ? "default" : "outline"}
              onClick={() => setWasteWeighted(false)}
            >
              Max profit
            </Button>
            <Button
              size="sm"
              variant={wasteWeighted ? "default" : "outline"}
              onClick={() => setWasteWeighted(true)}
            >
              Profit − waste
            </Button>
          </div>

          {wasteWeighted ? (
            <div className="flex w-56 items-center gap-3">
              <Label htmlFor="weight" className="text-xs whitespace-nowrap">
                $ / unit wasted
              </Label>
              <Slider
                id="weight"
                min={0}
                max={1}
                step={0.05}
                value={[weight]}
                onValueChange={([value]) => setWeight(value)}
              />
              <span className="font-mono text-xs tabular-nums">{weight.toFixed(2)}</span>
            </div>
          ) : null}

          <Button
            className="ml-auto"
            onClick={() => void runOptimize({ weight: wasteWeighted ? weight : 0 })}
            disabled={running}
          >
            {running ? "Searching…" : "Search best discount steps"}
          </Button>
        </div>

        {running ? (
          <div className="mt-3">
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-policy-markdown transition-[width]"
                style={{ width: `${Math.round((task?.progress ?? 0) * 100)}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {Math.round((task?.progress ?? 0) * 100)}% — this runs in the worker, so the rest of
              the page stays responsive.
            </p>
          </div>
        ) : null}

        {result ? (
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Button size="sm" onClick={() => applyOptimized(result.categories)}>
              Apply all to dashboard
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                setPolicy({
                  kind: "markdown",
                  tiers: [
                    { daysLeft: 2, discount: 0.2 },
                    { daysLeft: 1, discount: 0.4 },
                  ],
                })
              }
            >
              Compare with default rule
            </Button>
            <p className="text-xs text-muted-foreground">
              Trained on seeds {result.trainSeeds[0]}–{result.trainSeeds[result.trainSeeds.length - 1]};
              validated on {result.testSeeds[0]}–{result.testSeeds[result.testSeeds.length - 1]}.
            </p>
          </div>
        ) : null}
      </ChartCard>

      {!result ? (
        running ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <Card className="border-dashed p-6 text-sm text-muted-foreground">
            Run the search to find the best two-step rule for each category. Expect the elastic,
            short-life categories (Bakery, Deli) to prefer deeper last-day discounts, and the
            long-life ones (Dairy) to prefer gentler, earlier ones.
          </Card>
        )
      ) : (
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {result.categories.map((opt) => (
            <CategoryCard
              key={opt.category}
              opt={opt}
              onApply={() => setCategoryOverride(opt.category, opt.best)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
