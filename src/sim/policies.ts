/**
 * Pricing policies (plans/01 §7).
 *
 * A policy turns "days left until expiry" into a price multiplier. Three
 * kinds:
 *  - `fixed`   — no discount, ever.
 *  - `blanket` — the same discount every day; the reference policy that shows
 *                why discounting everything looks bad once margin is on screen.
 *  - `markdown` — tiered by days-to-expiry, optionally overridden per category.
 */

import type { PolicyConfig, Product, Tier } from "./types";

export const FIXED_POLICY: PolicyConfig = { kind: "fixed" };

export const DEFAULT_MARKDOWN_POLICY: PolicyConfig = {
  kind: "markdown",
  tiers: [
    { daysLeft: 2, discount: 0.2 },
    { daysLeft: 1, discount: 0.4 },
  ],
};

export const BLANKET_POLICY: PolicyConfig = { kind: "blanket", discount: 0.3 };

const MAX_DISCOUNT = 0.9;

function clampDiscount(discount: number): number {
  if (!Number.isFinite(discount)) return 0;
  return Math.min(MAX_DISCOUNT, Math.max(0, discount));
}

/** The tier list that applies to a product (category override wins). */
export function tiersFor(policy: PolicyConfig, product: Product): Tier[] {
  if (policy.kind !== "markdown") return [];
  return policy.byCategory?.[product.category] ?? policy.tiers;
}

interface EffectiveTier {
  /** Original threshold, used to break ties between clamped thresholds. */
  daysLeft: number;
  discount: number;
  /** Threshold after the "never discount a fresh batch" rule. */
  threshold: number;
}

/**
 * A tier only applies once the batch is within `daysLeft` of expiry, and a
 * batch is never discounted while it is fresh: the effective threshold is
 * capped at `shelfLife - 1`, so a 2-day sandwich is only marked down on its
 * last day (plans/01 §7).
 */
function effectiveTiers(tiers: Tier[], shelfLife: number): EffectiveTier[] {
  const cap = Math.max(1, shelfLife - 1);
  return tiers.map((tier) => ({
    daysLeft: tier.daysLeft,
    discount: clampDiscount(tier.discount),
    threshold: Math.min(tier.daysLeft, cap),
  }));
}

/**
 * Price multiplier for a batch with `daysLeft` days of shelf life left.
 * 1 means full price.
 */
export function priceMultiplier(policy: PolicyConfig, product: Product, daysLeft: number): number {
  if (policy.kind === "fixed") return 1;
  if (policy.kind === "blanket") return 1 - clampDiscount(policy.discount);

  const tiers = effectiveTiers(tiersFor(policy, product), product.shelfLife);

  // The tier with the smallest threshold that still covers `daysLeft` wins.
  // When two tiers clamp to the same threshold (short shelf life) the deeper
  // one — the tier originally set closer to expiry — wins.
  let best: EffectiveTier | undefined;
  for (const tier of tiers) {
    if (tier.threshold < daysLeft) continue;
    if (
      best === undefined ||
      tier.threshold < best.threshold ||
      (tier.threshold === best.threshold && tier.daysLeft < best.daysLeft)
    ) {
      best = tier;
    }
  }

  if (best === undefined) return 1;
  return 1 - best.discount;
}
