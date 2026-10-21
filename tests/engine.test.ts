import { describe, expect, it } from "vitest";
import { simulate } from "@/sim/engine";
import { DEFAULT_PARAMS, PRODUCT_BY_ID, SAFETY_BY_CATEGORY } from "@/sim/catalog";
import { DEFAULT_MARKDOWN_POLICY, FIXED_POLICY } from "@/sim/policies";
import { dowOf, weekdayShape } from "@/sim/weekday";
import type { SimParams } from "@/sim/types";

function params(overrides: Partial<SimParams> = {}): SimParams {
  return { ...DEFAULT_PARAMS, ...overrides };
}

const BREAD = PRODUCT_BY_ID["bread-white"];

describe("simulate", () => {
  it("records one row per product and reported day", () => {
    const { records } = simulate(params(), FIXED_POLICY);
    expect(records).toHaveLength(20 * 30);
    expect(Math.min(...records.map((r) => r.day))).toBe(0);
    expect(Math.max(...records.map((r) => r.day))).toBe(29);
  });

  it("starts the reported window on a Monday (day 0 = Monday)", () => {
    const { records } = simulate(params(), FIXED_POLICY);
    const first = records.find((r) => r.productId === BREAD.id && r.day === 0);
    expect(first).toBeDefined();
  });

  it("is deterministic for the same seed and policy", () => {
    const a = simulate(params(), FIXED_POLICY);
    const b = simulate(params(), FIXED_POLICY);
    expect(a.records).toEqual(b.records);
  });

  it("differs for a different seed", () => {
    const a = simulate(params({ seed: 1 }), FIXED_POLICY);
    const b = simulate(params({ seed: 2 }), FIXED_POLICY);
    expect(a.records).not.toEqual(b.records);
  });

  it("never marks anything down under the fixed policy", () => {
    const { records } = simulate(params(), FIXED_POLICY);
    for (const record of records) {
      expect(record.maxDiscount).toBe(0);
      expect(record.soldAtMarkdown).toBe(0);
      expect(record.deals).toEqual([]);
    }
  });

  it("marks batches down under the markdown policy", () => {
    const { records } = simulate(params(), DEFAULT_MARKDOWN_POLICY);
    const marked = records.filter((r) => r.maxDiscount > 0);
    expect(marked.length).toBeGreaterThan(0);
    expect(marked.some((r) => r.soldAtMarkdown > 0)).toBe(true);
  });

  it("keeps stock non-negative and conserves units", () => {
    const { records } = simulate(params(), DEFAULT_MARKDOWN_POLICY);
    const byProduct = new Map<string, typeof records>();
    for (const record of records) {
      const list = byProduct.get(record.productId) ?? [];
      list.push(record);
      byProduct.set(record.productId, list);
    }

    for (const list of byProduct.values()) {
      list.sort((a, b) => a.day - b.day);
      for (let i = 0; i < list.length; i++) {
        const record = list[i];
        const closing = record.startStock + record.received - record.sold - record.wasted;
        expect(closing).toBeGreaterThanOrEqual(0);
        if (i + 1 < list.length) {
          expect(list[i + 1].startStock).toBe(closing);
        }
      }
    }
  });

  it("wastes units only on the day a batch expires", () => {
    const { records } = simulate(params(), DEFAULT_MARKDOWN_POLICY);
    const wasteDays = new Map<string, number[]>();
    for (const record of records) {
      if (record.wasted > 0) {
        const list = wasteDays.get(record.productId) ?? [];
        list.push(record.day);
        wasteDays.set(record.productId, list);
      }
    }

    for (const [productId, days] of wasteDays) {
      const product = PRODUCT_BY_ID[productId];
      for (const day of days) {
        const absoluteDay = day + DEFAULT_PARAMS.warmupDays;
        // A batch received on day r expires at the end of day r + shelfLife - 1.
        const expiryDays = new Set<number>();
        for (let r = 0; r < absoluteDay + product.shelfLife; r++) {
          if (r % product.deliveryInterval === product.deliveryPhase) {
            expiryDays.add(r + product.shelfLife - 1);
          }
        }
        expect(expiryDays.has(absoluteDay)).toBe(true);
      }
    }
  });

  it("sells at most the stock it has", () => {
    const { records } = simulate(params(), DEFAULT_MARKDOWN_POLICY);
    for (const record of records) {
      const available = record.startStock + record.received;
      expect(record.sold).toBeLessThanOrEqual(available);
      expect(record.sold).toBeGreaterThanOrEqual(0);
      expect(record.lostSales).toBeGreaterThanOrEqual(0);
    }
  });

  it("replenishes by forecast plus safety factor, rounded up to packs", () => {
    const { records } = simulate(params(), FIXED_POLICY);
    const shape = weekdayShape("Bakery", DEFAULT_PARAMS.weekdayMode);

    for (const record of records) {
      const product = PRODUCT_BY_ID[record.productId];
      const absoluteDay = record.day + DEFAULT_PARAMS.warmupDays;
      const isDeliveryDay = absoluteDay % product.deliveryInterval === product.deliveryPhase;

      if (!isDeliveryDay) {
        expect(record.received).toBe(0);
        continue;
      }

      const categoryShape = weekdayShape(product.category, DEFAULT_PARAMS.weekdayMode);
      let forecast = 0;
      for (let k = 0; k < product.deliveryInterval; k++) {
        forecast += product.avgDailyDemand * categoryShape[dowOf(absoluteDay + k)];
      }
      const target = forecast * (1 + SAFETY_BY_CATEGORY[product.category]);
      const shortfall = target - record.startStock;
      const expected =
        shortfall <= 0 ? 0 : Math.ceil(shortfall / product.packSize) * product.packSize;
      expect(record.received).toBe(expected);
    }
    expect(shape.length).toBe(7);
  });

  it("orders the same quantity from the same starting stock, whatever the policy", () => {
    const fixed = simulate(params(), FIXED_POLICY);
    const markdown = simulate(params(), DEFAULT_MARKDOWN_POLICY);
    const key = (r: (typeof fixed.records)[number]) => `${r.day}:${r.productId}`;

    const fixedByKey = new Map(fixed.records.map((r) => [key(r), r]));
    for (const record of markdown.records) {
      const counterpart = fixedByKey.get(key(record))!;
      if (counterpart.startStock !== record.startStock) continue;
      expect(record.received).toBe(counterpart.received);
    }
  });

  it("keeps the same baseline demand under both policies (common random numbers)", () => {
    const fixed = simulate(params(), FIXED_POLICY);
    const markdown = simulate(params(), DEFAULT_MARKDOWN_POLICY);
    const demandOf = (records: typeof fixed.records) =>
      records.map((r) => `${r.day}:${r.productId}:${r.demand}`).join("|");
    expect(demandOf(markdown.records)).toBe(demandOf(fixed.records));
  });

  it("honours a product filter", () => {
    const { records, products } = simulate(params(), FIXED_POLICY, (p) => p.category === "Dairy");
    expect(products.every((p) => p.category === "Dairy")).toBe(true);
    expect(records.every((r) => r.productId.startsWith("milk") || PRODUCT_BY_ID[r.productId].category === "Dairy")).toBe(true);
  });
});
