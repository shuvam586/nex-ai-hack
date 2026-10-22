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

describe("the catalog matches the table in plans/01 §3", () => {
  // The table in plans/01 §3, verbatim. `unitCost` is deliberately excluded:
  // calibration (§10) raised the costs so the gross margin sits inside the
  // 40–55% band that assumption A14 states. Every other field must still
  // match the spec exactly.
  const specTable = [
    { name: "White bread loaf", category: "Bakery", shelfLife: 3, basePrice: 2.0, avgDailyDemand: 40, priceSensitivity: 1.8, packSize: 10, deliveryInterval: 1 },
    { name: "Whole-wheat bread", category: "Bakery", shelfLife: 3, basePrice: 2.4, avgDailyDemand: 25, priceSensitivity: 1.8, packSize: 10, deliveryInterval: 1 },
    { name: "Croissant", category: "Bakery", shelfLife: 2, basePrice: 1.5, avgDailyDemand: 30, priceSensitivity: 2.0, packSize: 10, deliveryInterval: 1 },
    { name: "Bagels (6-pack)", category: "Bakery", shelfLife: 4, basePrice: 3.0, avgDailyDemand: 12, priceSensitivity: 1.8, packSize: 6, deliveryInterval: 1 },
    { name: "Milk 1 L", category: "Dairy", shelfLife: 6, basePrice: 1.2, avgDailyDemand: 60, priceSensitivity: 1.2, packSize: 12, deliveryInterval: 2 },
    { name: "Greek yogurt", category: "Dairy", shelfLife: 9, basePrice: 1.9, avgDailyDemand: 28, priceSensitivity: 1.4, packSize: 12, deliveryInterval: 2 },
    { name: "Cheddar block", category: "Dairy", shelfLife: 12, basePrice: 4.5, avgDailyDemand: 10, priceSensitivity: 1.3, packSize: 6, deliveryInterval: 3 },
    { name: "Fresh cream", category: "Dairy", shelfLife: 6, basePrice: 2.3, avgDailyDemand: 8, priceSensitivity: 1.4, packSize: 6, deliveryInterval: 2 },
    { name: "Bananas (kg)", category: "Produce", shelfLife: 5, basePrice: 1.4, avgDailyDemand: 35, priceSensitivity: 1.5, packSize: 10, deliveryInterval: 2 },
    { name: "Tomatoes (kg)", category: "Produce", shelfLife: 6, basePrice: 2.2, avgDailyDemand: 25, priceSensitivity: 1.5, packSize: 10, deliveryInterval: 2 },
    { name: "Spinach bag", category: "Produce", shelfLife: 4, basePrice: 1.9, avgDailyDemand: 18, priceSensitivity: 1.6, packSize: 6, deliveryInterval: 2 },
    { name: "Strawberries", category: "Produce", shelfLife: 3, basePrice: 3.5, avgDailyDemand: 15, priceSensitivity: 1.7, packSize: 6, deliveryInterval: 1 },
    { name: "Apples (kg)", category: "Produce", shelfLife: 9, basePrice: 2.3, avgDailyDemand: 22, priceSensitivity: 1.4, packSize: 10, deliveryInterval: 3 },
    { name: "Chicken breast", category: "Meat & Fish", shelfLife: 3, basePrice: 5.8, avgDailyDemand: 20, priceSensitivity: 1.6, packSize: 6, deliveryInterval: 1 },
    { name: "Salmon fillet", category: "Meat & Fish", shelfLife: 3, basePrice: 8.5, avgDailyDemand: 10, priceSensitivity: 1.6, packSize: 4, deliveryInterval: 1 },
    { name: "Ground beef", category: "Meat & Fish", shelfLife: 3, basePrice: 5.5, avgDailyDemand: 14, priceSensitivity: 1.6, packSize: 6, deliveryInterval: 1 },
    { name: "Sandwich", category: "Deli", shelfLife: 2, basePrice: 3.2, avgDailyDemand: 22, priceSensitivity: 1.8, packSize: 6, deliveryInterval: 1 },
    { name: "Salad bowl", category: "Deli", shelfLife: 3, basePrice: 3.5, avgDailyDemand: 14, priceSensitivity: 1.7, packSize: 6, deliveryInterval: 1 },
    { name: "Hummus", category: "Deli", shelfLife: 6, basePrice: 2.2, avgDailyDemand: 12, priceSensitivity: 1.5, packSize: 6, deliveryInterval: 2 },
    { name: "Fresh pasta", category: "Deli", shelfLife: 5, basePrice: 2.5, avgDailyDemand: 12, priceSensitivity: 1.5, packSize: 6, deliveryInterval: 2 },
  ];

  it("keeps every field except the calibrated cost identical to the spec", () => {
    expect(CATALOG).toHaveLength(specTable.length);

    for (const [index, spec] of specTable.entries()) {
      const product = CATALOG[index];
      expect(product.name).toBe(spec.name);
      expect(product.category).toBe(spec.category);
      expect(product.shelfLife).toBe(spec.shelfLife);
      expect(product.basePrice).toBe(spec.basePrice);
      expect(product.avgDailyDemand).toBe(spec.avgDailyDemand);
      expect(product.priceSensitivity).toBe(spec.priceSensitivity);
      expect(product.packSize).toBe(spec.packSize);
      expect(product.deliveryInterval).toBe(spec.deliveryInterval);
    }
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
