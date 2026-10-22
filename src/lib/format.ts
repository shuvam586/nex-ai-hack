/**
 * Number formatting for the view layer (plans/02 §8).
 *
 * The simulation keeps money as plain numbers and percentages as fractions.
 * Nothing is rounded until it reaches a component, so the totals always add
 * up to what the model produced.
 */

function currency(value: number, fractionDigits: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

function decimalsFor(value: number): number {
  // Cents only when they are the point: nothing to show on a round zero, and
  // cents on a four-figure total is noise.
  return value === 0 || Math.abs(value) >= 100 ? 0 : 2;
}

/** Money for display. Large amounts lose the cents; small ones keep them. */
export function formatMoney(value: number): string {
  return currency(value, decimalsFor(value));
}

/** A signed money difference, e.g. "+$1,234". */
export function formatDeltaMoney(value: number): string {
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${sign}${currency(Math.abs(value), decimalsFor(Math.abs(value)))}`;
}

/** A count of units. */
export function formatUnits(value: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);
}

/** A fraction as a percentage: 0.3912 → "39.1%". */
export function formatPercent(fraction: number, decimals = 1): string {
  return `${(fraction * 100).toFixed(decimals)}%`;
}

/** A signed fraction as a percentage: 0.0356 → "+3.6%". */
export function formatSignedPercent(fraction: number, decimals = 1): string {
  const value = fraction * 100;
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${sign}${Math.abs(value).toFixed(decimals)}%`;
}

/** A signed difference in percentage points: 1.764 → "+1.8 pts". */
export function formatPoints(points: number, decimals = 1): string {
  const sign = points > 0 ? "+" : points < 0 ? "-" : "";
  return `${sign}${Math.abs(points).toFixed(decimals)} pts`;
}
