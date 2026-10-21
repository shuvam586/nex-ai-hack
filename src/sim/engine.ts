/**
 * The store simulator (plans/01 §5, §6.3, §10).
 *
 * One day, one product:
 *
 *   1. receive the delivery (if it is a delivery day),
 *   2. price every batch by days-to-expiry,
 *   3. draw the day's demand,
 *   4. sell: deal shoppers first, regulars afterwards,
 *   5. expire whatever is left on its last day — that is the waste.
 *
 * The replenishment rule never looks at prices, so every difference between
 * two policies comes from pricing (plans/01 §4).
 */

import { CATALOG, SAFETY_BY_CATEGORY } from "./catalog";
import { drawDemand, type DemandDraw } from "./demand";
import { priceMultiplier } from "./policies";
import { makeStreams, type SimRng } from "./rng";
import { CATEGORIES } from "./types";
import { dowOf, weekdayShape, type WeekdayMode } from "./weekday";
import type {
  Category,
  DayProductRecord,
  DealSnapshot,
  PolicyConfig,
  Product,
  SimParams,
} from "./types";

interface Batch {
  id: string;
  productId: string;
  receivedDay: number;
  qtyReceived: number;
  qtyRemaining: number;
}

/** A batch on the shelf, with the price it is selling at today. */
interface ShelfItem {
  batch: Batch;
  daysLeft: number;
  multiplier: number;
}

interface ProductState {
  product: Product;
  /** Index in the full catalog — the RNG stream key never depends on filters. */
  productIdx: number;
  shelfLife: number;
  batches: Batch[];
}

export interface EngineOutput {
  records: DayProductRecord[];
  products: Product[];
}

/** Reusable buffer for the per-shopper trade-down coins. */
interface Scratch {
  coins: Float64Array;
}

interface Sales {
  sold: number;
  soldAtMarkdown: number;
  revenue: number;
  lostSales: number;
}

export function simulate(
  params: SimParams,
  policy: PolicyConfig,
  productFilter?: (product: Product) => boolean,
): EngineOutput {
  const indexById = new Map(CATALOG.map((product, index) => [product.id, index]));
  const products = CATALOG.filter((product) =>
    productFilter ? productFilter(product) : true,
  );

  const states: ProductState[] = products.map((product) => ({
    product,
    productIdx: indexById.get(product.id) ?? 0,
    shelfLife: Math.max(1, product.shelfLife + params.shelfLifeShift),
    batches: [],
  }));

  const shapes = new Map<Category, number[]>();
  for (const category of CATEGORIES) {
    shapes.set(category, weekdayShape(category, params.weekdayMode as WeekdayMode));
  }

  const rng = makeStreams(params.seed);
  const scratch: Scratch = { coins: new Float64Array(256) };
  const records: DayProductRecord[] = [];

  const totalDays = params.warmupDays + params.days;
  for (let day = 0; day < totalDays; day++) {
    for (const state of states) {
      runProductDay(state, day, params, policy, rng, shapes, records, scratch);
    }
  }

  return { records, products };
}

function runProductDay(
  state: ProductState,
  day: number,
  params: SimParams,
  policy: PolicyConfig,
  rng: SimRng,
  shapes: Map<Category, number[]>,
  records: DayProductRecord[],
  scratch: Scratch,
): void {
  const { product, productIdx, shelfLife } = state;
  const startStock = state.batches.reduce((sum, batch) => sum + batch.qtyRemaining, 0);

  // 1. Replenishment. The rule reads stock and the calendar, never prices.
  let received = 0;
  if (day % product.deliveryInterval === product.deliveryPhase) {
    const orderQty = orderQuantity(product, day, params, startStock, shapes);
    if (orderQty > 0) {
      state.batches.push({
        id: `${product.id}@${day}`,
        productId: product.id,
        receivedDay: day,
        qtyReceived: orderQty,
        qtyRemaining: orderQty,
      });
      received = orderQty;
    }
  }

  // 2. Price the shelf.
  const items: ShelfItem[] = [];
  for (const batch of state.batches) {
    if (batch.qtyRemaining <= 0) continue;
    const daysLeft = batch.receivedDay + shelfLife - day;
    items.push({
      batch,
      daysLeft,
      multiplier: priceMultiplier(policy, product, daysLeft),
    });
  }

  // 3. Snapshot the shelf as the shopper sees it: after the delivery, before
  //    any sale.
  const stockByDaysLeft: Record<number, number> = {};
  const deals: DealSnapshot[] = [];
  let maxDiscount = 0;
  let minMultiplier = 1;
  for (const item of items) {
    stockByDaysLeft[item.daysLeft] =
      (stockByDaysLeft[item.daysLeft] ?? 0) + item.batch.qtyRemaining;
    const discount = 1 - item.multiplier;
    if (discount > maxDiscount) maxDiscount = discount;
    if (discount > 0) {
      deals.push({ daysLeft: item.daysLeft, discount, qty: item.batch.qtyRemaining });
    }
    if (item.multiplier < minMultiplier) minMultiplier = item.multiplier;
  }

  // 4. Demand.
  const weekdayFactor = shapes.get(product.category)![dowOf(day)];
  const demand = drawDemand(rng, {
    product,
    params,
    productIdx,
    day,
    weekdayFactor,
    minMultiplier,
  });

  // 5. Sell.
  const sales = allocate(items, demand, product, rng, productIdx, day, scratch);

  // 6. Expire: a batch with one day left is written off at cost.
  let wasted = 0;
  for (const item of items) {
    if (item.daysLeft === 1 && item.batch.qtyRemaining > 0) {
      wasted += item.batch.qtyRemaining;
      item.batch.qtyRemaining = 0;
    }
  }
  state.batches = state.batches.filter((batch) => batch.qtyRemaining > 0);

  // 7. Record the day (reported window only).
  if (day >= params.warmupDays) {
    records.push({
      day: day - params.warmupDays,
      productId: product.id,
      startStock,
      received,
      sold: sales.sold,
      soldAtMarkdown: sales.soldAtMarkdown,
      wasted,
      lostSales: sales.lostSales,
      demand: demand.n0,
      maxDiscount,
      stockByDaysLeft,
      revenue: sales.revenue,
      deals,
    });
  }
}

/**
 * How much to order on a delivery day (plans/01 §4).
 *
 *   cover    = days until the next delivery
 *   forecast = λ summed over the weekday shape of those days
 *   target   = forecast × (1 + safety)
 *   order    = the gap to target, rounded up to whole packs
 */
function orderQuantity(
  product: Product,
  day: number,
  params: SimParams,
  onHand: number,
  shapes: Map<Category, number[]>,
): number {
  const shape = shapes.get(product.category)!;
  const lambda = product.avgDailyDemand * params.demandScale;

  let forecast = 0;
  for (let k = 0; k < product.deliveryInterval; k++) {
    forecast += lambda * shape[dowOf(day + k)];
  }

  const safety = SAFETY_BY_CATEGORY[product.category] * params.overorderScale;
  const targetStock = forecast * (1 + safety);
  const shortfall = targetStock - onHand;
  if (shortfall <= 0) return 0;
  return Math.ceil(shortfall / product.packSize) * product.packSize;
}

/**
 * Sell the day's shoppers (plans/01 §6.3).
 *
 * Within the "deal group" the order is an explicit modelling choice: the
 * incremental shoppers are served first because they have no alternative —
 * they only buy discounted stock, and leave if there is none. Deal-seekers
 * follow (cheapest batch first) and can still fall back to a full-price
 * batch, so no baseline shopper is lost. Regulars come last and take the
 * freshest batch.
 */
function allocate(
  items: ShelfItem[],
  demand: DemandDraw,
  product: Product,
  rng: SimRng,
  productIdx: number,
  day: number,
  scratch: Scratch,
): Sales {
  const sales: Sales = { sold: 0, soldAtMarkdown: 0, revenue: 0, lostSales: 0 };

  // One coin per baseline shopper: below the threshold the shopper is a
  // deal-seeker, above it a regular. The coins are drawn whatever happens, so
  // the stream is consumed identically under every policy.
  const n0 = demand.n0;
  if (scratch.coins.length < n0) scratch.coins = new Float64Array(n0);
  const coins = scratch.coins;
  for (let i = 0; i < n0; i++) {
    coins[i] = rng.next(productIdx, day, "td");
  }

  // (a) Incremental deal-driven shoppers: discounted batches only.
  for (let i = 0; i < demand.n1; i++) {
    const item = cheapestDiscounted(items);
    if (!item) break; // the rest of them leave without buying
    sellOne(item, product, sales);
  }

  // (b) Deal-seekers: cheapest batch first (ties → oldest).
  for (let i = 0; i < n0; i++) {
    if (coins[i] >= demand.h) continue;
    const item = cheapest(items);
    if (item) sellOne(item, product, sales);
    else sales.lostSales += 1;
  }

  // (c) Regulars: freshest batch first — shoppers reach to the back of the
  //     shelf, which is exactly why old stock expires at full price.
  for (let i = 0; i < n0; i++) {
    if (coins[i] < demand.h) continue;
    const item = freshest(items);
    if (item) sellOne(item, product, sales);
    else sales.lostSales += 1;
  }

  return sales;
}

function sellOne(item: ShelfItem, product: Product, sales: Sales): void {
  item.batch.qtyRemaining -= 1;
  sales.sold += 1;
  sales.revenue += product.basePrice * item.multiplier;
  if (item.multiplier < 1) sales.soldAtMarkdown += 1;
}

/** Cheapest batch with stock; ties go to the oldest batch. */
function cheapest(items: ShelfItem[]): ShelfItem | undefined {
  let best: ShelfItem | undefined;
  for (const item of items) {
    if (item.batch.qtyRemaining <= 0) continue;
    if (!best) {
      best = item;
      continue;
    }
    if (item.multiplier < best.multiplier) {
      best = item;
    } else if (item.multiplier === best.multiplier && item.daysLeft < best.daysLeft) {
      best = item;
    }
  }
  return best;
}

/** Cheapest *discounted* batch with stock; ties go to the oldest batch. */
function cheapestDiscounted(items: ShelfItem[]): ShelfItem | undefined {
  let best: ShelfItem | undefined;
  for (const item of items) {
    if (item.batch.qtyRemaining <= 0 || item.multiplier >= 1) continue;
    if (!best) {
      best = item;
      continue;
    }
    if (item.multiplier < best.multiplier) {
      best = item;
    } else if (item.multiplier === best.multiplier && item.daysLeft < best.daysLeft) {
      best = item;
    }
  }
  return best;
}

/** Freshest batch with stock. */
function freshest(items: ShelfItem[]): ShelfItem | undefined {
  let best: ShelfItem | undefined;
  for (const item of items) {
    if (item.batch.qtyRemaining <= 0) continue;
    if (!best) {
      best = item;
      continue;
    }
    if (item.daysLeft > best.daysLeft) {
      best = item;
    } else if (
      item.daysLeft === best.daysLeft &&
      item.batch.receivedDay < best.batch.receivedDay
    ) {
      best = item;
    }
  }
  return best;
}
