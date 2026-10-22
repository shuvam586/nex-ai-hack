/**
 * Chart colours and axis helpers (plans/03 §1).
 *
 * The consistency rule from the spec lives here as data: fixed price is
 * always slate, markdown is always green, waste is always red — in every
 * chart and every table, so the reader never has to re-learn the legend.
 */

export const CHART_COLORS = {
  fixed: "#64748b", // slate — fixed price, everywhere
  markdown: "#16a34a", // green — markdown, everywhere
  waste: "#dc2626", // red — waste
  tier20: "#fbbf24", // amber
  tier40: "#f97316", // orange
  tier60: "#ea580c", // deep red-orange
  grid: "#e2e8f0",
  muted: "#94a3b8",
} as const;

/** Axis ticks for money: compact enough to fit, precise enough to read. */
export function compactMoney(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `$${Math.round(value / 1000)}k`;
  return `$${Math.round(value)}`;
}

/** Axis ticks for a fraction: 0.4 → "40%". */
export function percentTick(value: number): string {
  return `${Math.round(value * 100)}%`;
}

/**
 * Colour for a batch by days-to-expiry: red nearest expiry through green for
 * fresh (plans/03 §4, "fresh → green, 2 left → amber, 1 left → red").
 */
export function ageColor(daysLeft: number): string {
  if (daysLeft <= 1) return CHART_COLORS.waste;
  if (daysLeft === 2) return CHART_COLORS.tier40;
  if (daysLeft === 3) return CHART_COLORS.tier20;
  return "#22c55e"; // fresh
}
