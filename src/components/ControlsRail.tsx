"use client";

import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { CategoryOverrides } from "@/components/CategoryOverrides";
import { useSimStore, useTiers } from "@/store/useSimStore";
import type { Tier } from "@/sim/types";

const PRESETS: { name: string; tiers: Tier[] }[] = [
  {
    name: "Default",
    tiers: [
      { daysLeft: 2, discount: 0.2 },
      { daysLeft: 1, discount: 0.4 },
    ],
  },
  {
    name: "Aggressive",
    tiers: [
      { daysLeft: 3, discount: 0.3 },
      { daysLeft: 1, discount: 0.6 },
    ],
  },
  {
    name: "Gentle",
    tiers: [
      { daysLeft: 2, discount: 0.1 },
      { daysLeft: 1, discount: 0.2 },
    ],
  },
];

/**
 * The left rail: the markdown rule and how much shoppers respond to it.
 *
 * Every change is debounced and recomputes the whole simulation, so the
 * numbers on the right always belong to the rule on the left.
 */
export function ControlsRail() {
  const tiers = useTiers();
  const setTier = useSimStore((state) => state.setTier);
  const setPolicy = useSimStore((state) => state.setPolicy);
  const responseScale = useSimStore((state) => state.params.responseScale);
  const setResponseScale = useSimStore((state) => state.setResponseScale);
  const overridesEnabled = useSimStore((state) => state.overridesEnabled);
  const setOverridesEnabled = useSimStore((state) => state.setOverridesEnabled);

  return (
    <aside className="w-full shrink-0 border-b bg-card p-4 lg:w-72 lg:border-r lg:border-b-0">
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-semibold">Markdown rule</h2>
        {overridesEnabled ? <Badge variant="secondary">Per-category</Badge> : null}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Discount a batch when it is this close to expiring.
      </p>

      <div className="mt-4 space-y-5">
        {tiers.map((tier, index) => (
          <div key={index} className="space-y-3 rounded-lg border p-3">
            <p className="text-xs font-medium text-muted-foreground">Tier {index + 1}</p>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor={`tier-${index}-days`} className="text-xs">
                  Within
                </Label>
                <span className="font-mono text-xs tabular-nums">
                  {tier.daysLeft} day{tier.daysLeft === 1 ? "" : "s"}
                </span>
              </div>
              <Slider
                id={`tier-${index}-days`}
                min={1}
                max={4}
                step={1}
                value={[tier.daysLeft]}
                onValueChange={([daysLeft]) =>
                  setTier(index, { ...tier, daysLeft })
                }
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor={`tier-${index}-discount`} className="text-xs">
                  Off
                </Label>
                <span className="font-mono text-xs tabular-nums">
                  {Math.round(tier.discount * 100)}%
                </span>
              </div>
              <Slider
                id={`tier-${index}-discount`}
                min={0}
                max={60}
                step={5}
                value={[Math.round(tier.discount * 100)]}
                onValueChange={([percent]) =>
                  setTier(index, { ...tier, discount: percent / 100 })
                }
              />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5 space-y-2">
        <p className="text-xs font-medium text-muted-foreground">Presets</p>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((preset) => (
            <Button
              key={preset.name}
              variant="outline"
              size="sm"
              onClick={() => setPolicy({ kind: "markdown", tiers: preset.tiers })}
            >
              {preset.name}
            </Button>
          ))}
        </div>
      </div>

      <div className="mt-6 space-y-2 border-t pt-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="response" className="text-xs">
            Shopper response
          </Label>
          <span className="font-mono text-xs tabular-nums">
            {responseScale.toFixed(2)}×
          </span>
        </div>
        <Slider
          id="response"
          min={0.5}
          max={1.5}
          step={0.05}
          value={[responseScale]}
          onValueChange={([scale]) => setResponseScale(scale)}
        />
        <p className="text-xs text-muted-foreground">
          How strongly shoppers react to a discount. At 0.5× they barely notice
          it.
        </p>
      </div>

      <div className="mt-6 space-y-3 border-t pt-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="overrides" className="text-xs">
            Per-category override
          </Label>
          <Switch
            id="overrides"
            checked={overridesEnabled}
            onCheckedChange={(checked) => setOverridesEnabled(checked)}
          />
        </div>
        {overridesEnabled ? (
          <CategoryOverrides />
        ) : (
          <p className="text-xs text-muted-foreground">
            One rule for every category. Turn this on to tune categories separately, or apply an
            optimised rule from the Optimize tab.
          </p>
        )}
      </div>
    </aside>
  );
}
