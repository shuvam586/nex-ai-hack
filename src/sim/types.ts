/**
 * TypeScript contracts for the simulation core.
 *
 * This file is the ONLY contract between the engine and the UI (plans/02 §5).
 * It is pure types — no runtime code, no React, no DOM.
 *
 * Day index convention
 * --------------------
 * The engine runs `warmupDays + days` absolute days (plans/01 §1: absolute
 * day 7 is a Monday, absolute days 0–6 are warm-up and are discarded).
 * Records exposed to the UI use the RELATIVE day index inside the reported
 * window: `day` 0…days-1, where relative day 0 is the first reported day
 * (a Monday). Because the reported window starts on absolute day 7, the
 * weekday of a relative day is simply `day % 7`.
 */

export type Category = "Bakery" | "Dairy" | "Produce" | "Meat & Fish" | "Deli";

export const CATEGORIES: readonly Category[] = [
  "Bakery",
  "Dairy",
  "Produce",
  "Meat & Fish",
  "Deli",
];

export interface Product {
  id: string;
  name: string;
  category: Category;
  shelfLife: number; // days (A1)
  unitCost: number;
  basePrice: number;
  avgDailyDemand: number; // λ, units/day (A2)
  priceSensitivity: number; // e (A5)
  packSize: number;
  deliveryInterval: number;
  deliveryPhase: number; // delivery happens when `day % deliveryInterval === deliveryPhase`
}

export interface Tier {
  daysLeft: number; // threshold: applies to batches with at most this many days left
  discount: number; // fraction off, 0…0.9
}

export type PolicyConfig =
  | { kind: "fixed" }
  | { kind: "blanket"; discount: number } // reference policy (plans/01 §7)
  | { kind: "markdown"; tiers: Tier[]; byCategory?: Partial<Record<Category, Tier[]>> };

export interface SimParams {
  seed: number;
  days: number; // reported window length (30)
  warmupDays: number; // discarded warm-up days (7)
  responseScale: number; // s — shopper response scale (A5/A6/A7)
  tradeDownK: number; // κ — trade-down strength (A6)
  dealReach: number; // ρ — share of elasticity lift that is new traffic (A7)
  demandSigma: number; // σ — lognormal demand noise (A4)
  overorderScale: number; // multiplies the category safety factor (A8)
  shelfLifeShift: number; // ±1 day shift of every shelf life (A1)
  demandScale: number; // multiplies λ (A2)
  weekdayMode: "uci" | "prior" | "flat";
}

/** A discounted batch on the shelf at the start of the day (plans/04 §4.2). */
export interface DealSnapshot {
  daysLeft: number;
  discount: number;
  qty: number;
}

export interface DayProductRecord {
  /** Relative day index inside the reported window, 0…days-1. */
  day: number;
  productId: string;
  /** Units on hand at the start of the day, BEFORE today's delivery. */
  startStock: number;
  /** Units received today (a new batch). */
  received: number;
  sold: number;
  /** Units sold at a discount (m < 1). */
  soldAtMarkdown: number;
  wasted: number;
  /** Shoppers who wanted to buy but found no stock. */
  lostSales: number;
  /** Baseline shoppers who would have bought at full price (N0). */
  demand: number;
  /** Highest discount live that day (0 if none). */
  maxDiscount: number;
  /** Start-of-day (post-delivery) stock split by days-to-expiry. */
  stockByDaysLeft: Record<number, number>;
  revenue: number;
  /** Discounted batches on the shelf at the start of the day. */
  deals: DealSnapshot[];
}

export interface Totals {
  received: number;
  sold: number;
  wasted: number;
  lostSales: number;
  revenue: number;
  cogs: number;
  wasteCost: number;
  profit: number;
  netMarginPct: number; // profit / revenue — includes waste (A13)
  grossMarginPct: number; // (revenue − cogs) / revenue — ignores waste
  wastePct: number; // wasted / received
  soldAtMarkdown: number;
}

export interface SimResult {
  params: SimParams;
  policy: PolicyConfig;
  records: DayProductRecord[];
  totals: Totals;
  byProduct: Record<string, Totals>;
  byCategory: Record<Category, Totals>;
  byDay: { day: number; revenue: number; wasted: number; profit: number }[];
}

export interface Comparison {
  fixed: SimResult;
  markdown: SimResult;
  /** markdown − fixed, field by field. */
  delta: Totals;
}

export interface SeedStat {
  mean: number;
  sd: number;
  ci95: [number, number];
  winRate?: number;
}

export interface EvalResult {
  seeds: number[];
  wasteReductionPct: SeedStat; // (wasteFixed − wasteMd) / wasteFixed
  marginChangePts: SeedStat; // netMargin% md − fixed, in percentage points
  profitChangePct: SeedStat;
  revenueChangePct: SeedStat;
  perSeed: {
    seed: number;
    wasteReductionPct: number;
    marginChangePts: number;
    profitChangePct: number;
    /** Per-seed revenue change. Added to the plans/02 §5 contract: the
     *  `revenueChangePct` summary needs the per-seed values to compute. */
    revenueChangePct: number;
  }[];
}
