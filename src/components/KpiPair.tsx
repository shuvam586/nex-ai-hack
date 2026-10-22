"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "cn";
import type { DeltaTone } from "@/lib/kpis";

export interface KpiPairProps {
  title: string;
  /** Value under the fixed-price policy. */
  fixedValue: string;
  /** Value under the markdown rule. */
  markdownValue: string;
  delta: string;
  tone: DeltaTone;
  footnote?: string;
  loading?: boolean;
  /** Nothing to show yet — a rule that never fires, or a run that failed. */
  empty?: boolean;
  emptyMessage?: string;
}

const toneClasses: Record<DeltaTone, string> = {
  good: "text-policy-markdown",
  bad: "text-waste",
  warn: "text-tier-40",
  flat: "text-muted-foreground",
};

/**
 * One headline number, with the fixed price and the markdown rule side by side.
 *
 * Colour is never the only signal: the delta always carries a sign, and the
 * policy is named next to each value.
 */
export function KpiPair({
  title,
  fixedValue,
  markdownValue,
  delta,
  tone,
  footnote,
  loading = false,
  empty = false,
  emptyMessage = "No result yet.",
}: KpiPairProps) {
  if (loading) {
    return (
      <Card className="gap-2 shadow-sm">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-6 w-28" />
          <Skeleton className="h-6 w-28" />
          <Skeleton className="h-4 w-20" />
        </CardContent>
      </Card>
    );
  }

  if (empty) {
    return (
      <Card className="gap-2 shadow-sm">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="gap-2 shadow-sm">
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-baseline justify-between gap-3">
          <span className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="size-2 rounded-full bg-policy-fixed" aria-hidden="true" />
            Fixed
          </span>
          <span className="font-mono text-lg tabular-nums">{fixedValue}</span>
        </div>

        <div className="flex items-baseline justify-between gap-3">
          <span className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="size-2 rounded-full bg-policy-markdown" aria-hidden="true" />
            Markdown
          </span>
          <span className="font-mono text-lg font-semibold tabular-nums">{markdownValue}</span>
        </div>

        <div className="flex items-center justify-between gap-3 pt-1">
          <span className="text-xs text-muted-foreground">Change</span>
          <span className={cn("font-mono text-sm font-semibold tabular-nums", toneClasses[tone])}>
            {delta}
          </span>
        </div>

        {footnote ? <p className="pt-1 text-xs text-muted-foreground">{footnote}</p> : null}
      </CardContent>
    </Card>
  );
}
