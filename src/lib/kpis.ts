/**
 * The headline numbers, computed away from the components.
 *
 * Waste and margin always travel together: the whole point of the dashboard
 * is that "less waste" is not the same as "more money", and the two have to
 * be visible side by side.
 */

import {
  formatDeltaMoney,
  formatMoney,
  formatPercent,
  formatPoints,
  formatSignedPercent,
  formatUnits,
} from "@/lib/format";
import type { Comparison } from "@/sim/types";

export type DeltaTone = "good" | "bad" | "warn" | "flat";

export interface Kpi {
  id: "waste" | "revenue" | "profit" | "margin";
  title: string;
  fixedValue: string;
  markdownValue: string;
  delta: string;
  tone: DeltaTone;
  footnote: string;
}

function relativeChange(next: number, previous: number): number {
  if (previous === 0) return 0;
  return (next - previous) / previous;
}

export function buildKpis(comparison: Comparison): Kpi[] {
  const fixed = comparison.fixed.totals;
  const markdown = comparison.markdown.totals;

  const wasteReduction =
    fixed.wasted === 0 ? 0 : (fixed.wasted - markdown.wasted) / fixed.wasted;
  const revenueChange = relativeChange(markdown.revenue, fixed.revenue);
  const profitChange = relativeChange(markdown.profit, fixed.profit);
  const marginChange = (markdown.netMarginPct - fixed.netMarginPct) * 100;

  // Waste down is good; profit down is bad. Waste down while profit is also
  // down is the "less food wasted, but at a margin cost" case — amber, not green.
  const wasteFell = wasteReduction > 0;
  const profitFell = profitChange < 0;

  return [
    {
      id: "waste",
      title: "Units wasted",
      fixedValue: `${formatUnits(fixed.wasted)} units · ${formatPercent(fixed.wastePct)}`,
      markdownValue: `${formatUnits(markdown.wasted)} units · ${formatPercent(markdown.wastePct)}`,
      delta: formatSignedPercent(wasteReduction),
      tone: wasteFell ? "good" : wasteReduction < 0 ? "bad" : "flat",
      footnote: "Share of units received that were written off.",
    },
    {
      id: "revenue",
      title: "Revenue",
      fixedValue: formatMoney(fixed.revenue),
      markdownValue: formatMoney(markdown.revenue),
      delta: formatSignedPercent(revenueChange),
      tone: revenueChange > 0 ? "good" : revenueChange < 0 ? "bad" : "flat",
      footnote: "What the store took over the 30 reported days.",
    },
    {
      id: "profit",
      title: "Profit",
      fixedValue: formatMoney(fixed.profit),
      markdownValue: formatMoney(markdown.profit),
      delta: `${formatSignedPercent(profitChange)} · ${formatDeltaMoney(markdown.profit - fixed.profit)}`,
      tone: profitFell ? (wasteFell ? "warn" : "bad") : profitChange > 0 ? "good" : "flat",
      footnote: "Revenue minus cost of goods sold minus the cost of waste.",
    },
    {
      id: "margin",
      title: "Net margin",
      fixedValue: formatPercent(fixed.netMarginPct),
      markdownValue: formatPercent(markdown.netMarginPct),
      delta: formatPoints(marginChange),
      tone: marginChange > 0 ? "good" : marginChange < 0 ? "bad" : "flat",
      footnote: "Profit as a share of revenue, after waste.",
    },
  ];
}

/**
 * One honest sentence about the rule, written from the numbers.
 *
 * When the rule costs money, it says so — a dashboard that only ever
 * congratulates itself is not worth trusting.
 */
export function buildVerdict(comparison: Comparison, seed: number): string {
  const fixed = comparison.fixed.totals;
  const markdown = comparison.markdown.totals;

  const wasteReduction =
    fixed.wasted === 0 ? 0 : (fixed.wasted - markdown.wasted) / fixed.wasted;
  const profitChange = relativeChange(markdown.profit, fixed.profit);

  const wasteText = `cut waste by ${(wasteReduction * 100).toFixed(1)}%`;
  const profitText = `raised profit by ${(profitChange * 100).toFixed(1)}%`;

  if (profitChange >= 0) {
    return `Markdown ${wasteText} and ${profitText} on seed ${seed}.`;
  }

  return `Markdown ${wasteText} but reduced profit by ${(
    Math.abs(profitChange) * 100
  ).toFixed(1)}% — this rule is too aggressive.`;
}
