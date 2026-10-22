"use client";

/**
 * Per-category markdown overrides (plans/03 §2, plans/04 §2.4).
 *
 * The optimiser hands back a different best rule per category; this is where
 * those land, and where a human can nudge them. Editing any category creates
 * an override for it; "Reset" hands the category back to the shared rule.
 */

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CATEGORIES, type Category, type Tier } from "@/sim/types";
import { useCategoryOverrides, useSimStore, useTiers } from "@/store/useSimStore";

const DEFAULT_TIERS: Tier[] = [
  { daysLeft: 2, discount: 0.2 },
  { daysLeft: 1, discount: 0.4 },
];

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function CategoryOverrides() {
  const overrides = useCategoryOverrides();
  const baseTiers = useTiers();
  const setCategoryOverride = useSimStore((state) => state.setCategoryOverride);

  const effectiveFor = (category: Category): Tier[] => {
    const own = overrides[category];
    if (own && own.length > 0) return own;
    return baseTiers.length > 0 ? baseTiers : DEFAULT_TIERS;
  };

  return (
    <div className="space-y-2">
      {CATEGORIES.map((category) => {
        const tiers = effectiveFor(category).slice(0, 2);
        const overridden = Boolean(overrides[category]);
        return (
          <div key={category} className="rounded-lg border p-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium">{category}</span>
              {overridden ? (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 px-2 text-xs"
                  onClick={() => setCategoryOverride(category, null)}
                >
                  Reset
                </Button>
              ) : null}
            </div>
            <div className="mt-1 space-y-1">
              {tiers.map((tier, index) => (
                <div key={index} className="flex items-center gap-1.5">
                  <span className="w-6 text-[10px] text-muted-foreground">T{index + 1}</span>
                  <Input
                    type="number"
                    min={1}
                    max={4}
                    value={tier.daysLeft}
                    aria-label={`${category} tier ${index + 1} days`}
                    className="h-7 w-12"
                    onChange={(event) => {
                      const next = tiers.map((existing, i) =>
                        i === index
                          ? { ...existing, daysLeft: clamp(Number(event.target.value) || 1, 1, 4) }
                          : existing,
                      );
                      setCategoryOverride(category, next);
                    }}
                  />
                  <span className="text-[10px] text-muted-foreground">days →</span>
                  <Input
                    type="number"
                    min={0}
                    max={60}
                    step={5}
                    value={Math.round(tier.discount * 100)}
                    aria-label={`${category} tier ${index + 1} percent`}
                    className="h-7 w-14"
                    onChange={(event) => {
                      const next = tiers.map((existing, i) =>
                        i === index
                          ? {
                              ...existing,
                              discount: clamp(Number(event.target.value) || 0, 0, 60) / 100,
                            }
                          : existing,
                      );
                      setCategoryOverride(category, next);
                    }}
                  />
                  <span className="text-[10px] text-muted-foreground">%</span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
