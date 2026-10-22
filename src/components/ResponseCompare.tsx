"use client";

/**
 * The half-strength shopper-response panel (plans/03 §6.2).
 *
 * "What if shoppers respond half as strongly to discounts?" The same measure
 * at 0.5× / 1.0× / 1.5× shows how much of the result leans on that one
 * assumption — and we show it even when it makes the rule look worse.
 */

import { Button } from "@/components/ui/button";
import { ChartCard } from "@/components/ChartCard";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPercent, formatPoints } from "@/lib/format";
import type { ResponseRow } from "@/store/useSimStore";

export function ResponseCompare({
  rows,
  loading,
  onRun,
}: {
  rows: ResponseRow[] | null;
  loading: boolean;
  onRun: () => void;
}) {
  return (
    <ChartCard
      title="If shoppers respond half as strongly"
      description="Same rule, same seeds, only the shopper-response scale changes."
      action={
        <Button size="sm" variant="outline" onClick={onRun} disabled={loading}>
          {loading ? "Running…" : "Re-run"}
        </Button>
      }
    >
      {loading || !rows ? (
        <Skeleton className="h-40 w-full" />
      ) : (
        <div className="grid gap-3 sm:grid-cols-3">
          {rows.map((row) => {
            const profitUp = row.result.profitChangePct.mean >= 0;
            return (
              <div key={row.scale} className="rounded-lg border p-3">
                <p className="text-sm font-semibold tabular-nums">{row.scale.toFixed(1)}× response</p>
                <dl className="mt-2 space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <dt className="text-muted-foreground">Waste reduction</dt>
                    <dd className="font-mono tabular-nums">
                      {formatPercent(row.result.wasteReductionPct.mean)}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-muted-foreground">Margin change</dt>
                    <dd className="font-mono tabular-nums">
                      {formatPoints(row.result.marginChangePts.mean)}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-muted-foreground">Profit change</dt>
                    <dd
                      className={`font-mono tabular-nums ${
                        profitUp ? "text-policy-markdown" : "text-waste"
                      }`}
                    >
                      {formatPercent(row.result.profitChangePct.mean)}
                    </dd>
                  </div>
                </dl>
                <p className="mt-2 text-xs text-muted-foreground">
                  {profitUp ? "Profit still improves." : "Profit falls — the rule is too aggressive here."}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </ChartCard>
  );
}
