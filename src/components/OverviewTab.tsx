"use client";

import { AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KpiPair } from "@/components/KpiPair";
import { VerdictBanner } from "@/components/VerdictBanner";
import { buildKpis } from "@/lib/kpis";
import { useSimStore } from "@/store/useSimStore";

/**
 * The money screen: waste and margin side by side, never one without the
 * other.
 *
 * A rule that cuts waste but eats margin has to look like that on the same
 * screen, which is the whole point of the project.
 */
export function OverviewTab() {
  const comparison = useSimStore((state) => state.comparison);
  const loading = useSimStore((state) => state.loading);
  const error = useSimStore((state) => state.error);
  const seed = useSimStore((state) => state.seed);

  if (error) {
    return (
      <Card className="border-waste/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-waste">
            <AlertTriangle className="size-4" />
            The run failed
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!comparison) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {["Units wasted", "Revenue", "Profit", "Net margin"].map((title) => (
          <KpiPair
            key={title}
            title={title}
            fixedValue=""
            markdownValue=""
            delta=""
            tone="flat"
            loading
          />
        ))}
      </div>
    );
  }

  const kpis = buildKpis(comparison);
  const fixedWaste = comparison.fixed.totals.wasted;
  const wasteReduction =
    fixedWaste === 0 ? 0 : (fixedWaste - comparison.markdown.totals.wasted) / fixedWaste;
  const fixedProfit = comparison.fixed.totals.profit;
  const profitChange =
    fixedProfit === 0
      ? 0
      : (comparison.markdown.totals.profit - fixedProfit) / fixedProfit;

  return (
    <div className="space-y-4">
      <VerdictBanner
        seed={seed}
        wasteReduction={wasteReduction}
        profitChange={profitChange}
        loading={loading && false}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <KpiPair
            key={kpi.id}
            title={kpi.title}
            fixedValue={kpi.fixedValue}
            markdownValue={kpi.markdownValue}
            delta={kpi.delta}
            tone={kpi.tone}
            footnote={kpi.footnote}
            loading={loading}
          />
        ))}
      </div>
    </div>
  );
}
