"use client";

/**
 * The shopper-facing deals view (plans/04 §4).
 *
 * Runs the markdown policy for the URL's seed and rule, then reads one day's
 * snapshot out of the result. Deterministic: the same URL always renders the
 * same deals.
 */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Play, Pause } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { DealCard } from "@/components/DealCard";
import { DEFAULT_PARAMS, PRODUCT_BY_ID } from "@/sim/catalog";
import { runSim } from "@/sim/runner";
import { CATEGORIES, type Category, type Tier } from "@/sim/types";
import { formatMoney, formatUnits } from "@/lib/format";
import { DOW_LABELS } from "@/sim/weekday";

export function DealsView({
  seed,
  tiers,
  initialDay,
}: {
  seed: number;
  tiers: Tier[];
  initialDay: number;
}) {
  const [day, setDay] = useState(initialDay);
  const [playing, setPlaying] = useState(false);

  const totals = DEFAULT_PARAMS.days;

  // A plain serialized key keeps the memo dependency a simple expression while
  // still reacting to any change in the rule.
  const tiersKey = tiers.map((tier) => `${tier.daysLeft}:${tier.discount}`).join(",");
  const parsedTiers = useMemo(
    () =>
      tiersKey
        .split(",")
        .filter(Boolean)
        .map((pair) => {
          const [daysLeft, discount] = pair.split(":");
          return { daysLeft: Number(daysLeft), discount: Number(discount) };
        }),
    [tiersKey],
  );

  const result = useMemo(
    () => runSim({ ...DEFAULT_PARAMS, seed }, { kind: "markdown", tiers: parsedTiers }),
    [seed, parsedTiers],
  );

  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(() => {
      setDay((current) => (current + 1) % totals);
    }, 900);
    return () => clearInterval(timer);
  }, [playing, totals]);

  // Keep the URL shareable without navigating.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams();
    params.set("seed", String(seed));
    params.set("day", String(day));
    tiers.forEach((tier, index) => {
      params.set(`t${index + 1}`, String(tier.daysLeft));
      params.set(`d${index + 1}`, String(Math.round(tier.discount * 100)));
    });
    window.history.replaceState(
      window.history.state,
      "",
      `${window.location.pathname}?${params.toString()}`,
    );
  }, [seed, day, tiers]);

  const today = useMemo(
    () => result.records.filter((record) => record.day === day),
    [result, day],
  );

  const onMarkdown = today
    .filter((record) => record.deals.length > 0)
    .map((record) => {
      const deepest = record.deals.reduce((best, deal) =>
        deal.discount > best.discount ? deal : best,
      );
      const product = PRODUCT_BY_ID[record.productId];
      return {
        productId: record.productId,
        category: product.category,
        name: product.name,
        basePrice: product.basePrice,
        discount: deepest.discount,
        daysLeft: deepest.daysLeft,
        qty: deepest.qty,
      };
    })
    .sort((a, b) => b.discount - a.discount);

  const monthToDate = result.records.filter((record) => record.day <= day);
  const saved = monthToDate.reduce((sum, record) => {
    const product = PRODUCT_BY_ID[record.productId];
    return sum + record.soldAtMarkdown * product.basePrice * record.maxDiscount;
  }, 0);
  const rescued = monthToDate.reduce((sum, record) => sum + record.soldAtMarkdown, 0);

  const byCategory = new Map<Category, typeof onMarkdown>();
  for (const category of CATEGORIES) byCategory.set(category, []);
  for (const deal of onMarkdown) byCategory.get(deal.category)!.push(deal);

  return (
    <div className="min-h-screen bg-[#fafaf7] text-[#1f2937]">
      <header className="border-b bg-white px-4 py-4 sm:px-8">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-heading text-lg font-semibold">🥖 Today&apos;s deals</h1>
            <p className="text-xs text-muted-foreground">
              Demo store · {DOW_LABELS[day % 7]} · day {day + 1} of {totals} · seed {seed}
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href={`/?seed=${seed}`}>Open in dashboard ↗</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-6 sm:px-8">
        <div className="grid grid-cols-3 gap-3 rounded-2xl border bg-white p-4 text-center">
          <div>
            <p className="font-mono text-2xl font-bold">{onMarkdown.length}</p>
            <p className="text-xs text-muted-foreground">items on markdown</p>
          </div>
          <div>
            <p className="font-mono text-2xl font-bold text-[#16a34a]">{formatMoney(saved)}</p>
            <p className="text-xs text-muted-foreground">saved by shoppers</p>
          </div>
          <div>
            <p className="font-mono text-2xl font-bold text-[#16a34a]">{formatUnits(rescued)}</p>
            <p className="text-xs text-muted-foreground">units rescued (month to date)</p>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3 rounded-2xl border bg-white p-4">
          <Button
            size="icon"
            variant="outline"
            aria-label={playing ? "Pause" : "Play"}
            onClick={() => setPlaying((value) => !value)}
          >
            {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
          </Button>
          <Slider
            min={0}
            max={totals - 1}
            step={1}
            value={[day]}
            onValueChange={([value]) => setDay(value)}
            aria-label="Day"
          />
          <span className="w-16 text-right font-mono text-xs tabular-nums">
            day {day + 1}
          </span>
        </div>

        {onMarkdown.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-dashed p-10 text-center">
            <p className="font-medium">No markdowns today — fresh everywhere.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Widen the rule in the dashboard, or scrub to a later day.
            </p>
          </div>
        ) : (
          <div className="mt-6 space-y-6">
            {CATEGORIES.map((category) => {
              const deals = byCategory.get(category)!;
              if (deals.length === 0) return null;
              return (
                <section key={category}>
                  <h2 className="mb-3 text-sm font-semibold text-muted-foreground">{category}</h2>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {deals.map((deal) => (
                      <DealCard
                        key={deal.productId}
                        name={deal.name}
                        category={deal.category}
                        basePrice={deal.basePrice}
                        discount={deal.discount}
                        daysLeft={deal.daysLeft}
                        qty={deal.qty}
                      />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
