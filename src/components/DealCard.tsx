"use client";

/**
 * One deal, as a shopper would see it (plans/04 §4.3).
 *
 * Price-tag styling, deliberately not the dashboard chrome: this page is the
 * same simulation read from the other end of the shop.
 */

import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/format";

export interface DealCardProps {
  name: string;
  category: string;
  basePrice: number;
  discount: number;
  daysLeft: number;
  qty: number;
}

function expiryLabel(daysLeft: number): string {
  if (daysLeft <= 1) return "Expires tonight";
  return `${daysLeft} days left`;
}

export function DealCard({ name, category, basePrice, discount, daysLeft, qty }: DealCardProps) {
  const price = basePrice * (1 - discount);
  return (
    <div className="relative overflow-hidden rounded-2xl border bg-white p-4 shadow-sm ring-1 ring-black/5">
      <span className="absolute top-3 -right-8 rotate-45 bg-[#dc2626] px-8 py-1 text-[10px] font-bold tracking-wide text-white">
        {Math.round(discount * 100)}% OFF
      </span>

      <p className="text-xs text-muted-foreground">{category}</p>
      <h3 className="mt-0.5 font-semibold text-[#1f2937]">{name}</h3>

      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-2xl font-bold text-[#16a34a]">{formatMoney(price)}</span>
        <span className="text-sm text-muted-foreground line-through">{formatMoney(basePrice)}</span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Badge variant="secondary">{expiryLabel(daysLeft)}</Badge>
        <span className="text-xs text-muted-foreground">Only {qty} left</span>
      </div>

      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-black/5">
        <div
          className="h-full bg-[#16a34a]"
          style={{ width: `${Math.min(100, qty * 8)}%` }}
        />
      </div>
    </div>
  );
}
