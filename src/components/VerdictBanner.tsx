"use client";

import { Info } from "lucide-react";
import { cn } from "cn";
import { Skeleton } from "@/components/ui/skeleton";

export interface VerdictBannerProps {
  seed: number;
  /** Fraction, e.g. 0.35 for "35% less waste". */
  wasteReduction: number;
  /** Fraction, e.g. 0.032 for "3.2% more profit". Negative when profit fell. */
  profitChange: number;
  loading?: boolean;
}

/**
 * One sentence, written from the numbers, saying what the rule actually did.
 *
 * When the rule costs money it says so. A banner that only ever
 * congratulates itself is not worth trusting.
 */
export function VerdictBanner({
  seed,
  wasteReduction,
  profitChange,
  loading = false,
}: VerdictBannerProps) {
  if (loading) {
    return <Skeleton className="h-12 w-full" />;
  }

  const wasteText = `cut waste by ${(wasteReduction * 100).toFixed(1)}%`;
  const profitUp = profitChange >= 0;
  const profitText = profitUp
    ? `raised profit by ${(profitChange * 100).toFixed(1)}%`
    : `reduced profit by ${(Math.abs(profitChange) * 100).toFixed(1)}%`;

  return (
    <div
      role="status"
      className={cn(
        "flex items-start gap-3 rounded-xl border px-4 py-3 text-sm",
        profitUp
          ? "border-policy-markdown/30 bg-policy-markdown/5"
          : "border-tier-40/40 bg-tier-40/5",
      )}
    >
      <Info
        className={cn("mt-0.5 size-4 shrink-0", profitUp ? "text-policy-markdown" : "text-tier-40")}
        aria-hidden="true"
      />
      <p className="leading-relaxed">
        <span className="font-medium">Markdown</span> {wasteText} but {profitText} on{" "}
        <span className="font-mono font-medium">seed {seed}</span>
        {profitUp ? "." : " — this rule is too aggressive."}
      </p>
    </div>
  );
}
