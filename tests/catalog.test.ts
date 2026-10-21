import { describe, expect, it } from "vitest";
import { CATALOG, DEFAULT_PARAMS, PRODUCT_BY_ID, SAFETY_BY_CATEGORY } from "@/sim/catalog";
import { CATEGORIES } from "@/sim/types";

describe("catalog", () => {
  it("holds the 20 products the prompt asks for", () => {
    expect(CATALOG).toHaveLength(20);
  });

  it("uses unique, non-empty ids", () => {
    const ids = CATALOG.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id.length).toBeGreaterThan(0);
  });

  it("gives every product sane economic values", () => {
    for (const p of CATALOG) {
      expect(p.shelfLife).toBeGreaterThanOrEqual(1);
      expect(p.unitCost).toBeGreaterThan(0);
      expect(p.basePrice).toBeGreaterThan(p.unitCost);
      expect(p.avgDailyDemand).toBeGreaterThan(0);
      expect(p.priceSensitivity).toBeGreaterThan(0);
      expect(p.packSize).toBeGreaterThanOrEqual(1);
      expect(p.deliveryInterval).toBeGreaterThanOrEqual(1);
      expect(p.deliveryPhase).toBeGreaterThanOrEqual(0);
      expect(p.deliveryPhase).toBeLessThan(p.deliveryInterval);
    }
  });

  it("covers all five categories with a safety factor each", () => {
    for (const category of CATEGORIES) {
      expect(CATALOG.some((p) => p.category === category)).toBe(true);
      expect(SAFETY_BY_CATEGORY[category]).toBeGreaterThan(0);
    }
  });

  it("keeps the gross margin above 40% (assumption A14)", () => {
    for (const p of CATALOG) {
      const margin = (p.basePrice - p.unitCost) / p.basePrice;
      expect(margin).toBeGreaterThanOrEqual(0.4);
    }
  });

  it("keeps a 40%-off price above unit cost, so a rescued unit still pays (plans/01 §3)", () => {
    for (const p of CATALOG) {
      expect(p.basePrice * 0.6).toBeGreaterThan(p.unitCost);
    }
  });

  it("staggers delivery days so orders do not all land together", () => {
    for (let day = 0; day < 7; day++) {
      const delivering = CATALOG.filter((p) => day % p.deliveryInterval === p.deliveryPhase);
      expect(delivering.length).toBeGreaterThan(0);
      expect(delivering.length).toBeLessThan(CATALOG.length);
    }
  });

  it("indexes products by id", () => {
    expect(PRODUCT_BY_ID.croissant.name).toBe("Croissant");
    expect(PRODUCT_BY_ID.croissant.shelfLife).toBe(2);
  });
});

describe("DEFAULT_PARAMS", () => {
  it("matches the calibration setup in the spec", () => {
    expect(DEFAULT_PARAMS.days).toBe(30);
    expect(DEFAULT_PARAMS.warmupDays).toBe(7);
    expect(DEFAULT_PARAMS.responseScale).toBe(1);
    expect(DEFAULT_PARAMS.tradeDownK).toBe(1.5);
    expect(DEFAULT_PARAMS.dealReach).toBe(0.4);
    expect(DEFAULT_PARAMS.demandSigma).toBeCloseTo(0.2, 10);
    expect(DEFAULT_PARAMS.overorderScale).toBe(1);
    expect(DEFAULT_PARAMS.shelfLifeShift).toBe(0);
    expect(DEFAULT_PARAMS.demandScale).toBe(1);
  });
});
