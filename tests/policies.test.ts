import { describe, expect, it } from "vitest";
import {
  BLANKET_POLICY,
  DEFAULT_MARKDOWN_POLICY,
  FIXED_POLICY,
  priceMultiplier,
  tiersFor,
} from "@/sim/policies";
import { PRODUCT_BY_ID } from "@/sim/catalog";

const bread = PRODUCT_BY_ID["bread-white"]; // shelf life 3
const croissant = PRODUCT_BY_ID.croissant; // shelf life 2
const cheddar = PRODUCT_BY_ID.cheddar; // shelf life 12

describe("fixed policy", () => {
  it("never discounts", () => {
    for (const daysLeft of [1, 2, 3, 12]) {
      expect(priceMultiplier(FIXED_POLICY, bread, daysLeft)).toBe(1);
    }
  });
});

describe("blanket policy", () => {
  it("discounts everything by the same amount", () => {
    expect(priceMultiplier(BLANKET_POLICY, bread, 1)).toBeCloseTo(0.7, 10);
    expect(priceMultiplier(BLANKET_POLICY, bread, 3)).toBeCloseTo(0.7, 10);
  });
});

describe("markdown policy", () => {
  it("discounts 20% with 2 days left and 40% with 1 day left", () => {
    expect(priceMultiplier(DEFAULT_MARKDOWN_POLICY, bread, 2)).toBeCloseTo(0.8, 10);
    expect(priceMultiplier(DEFAULT_MARKDOWN_POLICY, bread, 1)).toBeCloseTo(0.6, 10);
  });

  it("leaves a fresh batch alone", () => {
    expect(priceMultiplier(DEFAULT_MARKDOWN_POLICY, bread, 3)).toBe(1);
    expect(priceMultiplier(DEFAULT_MARKDOWN_POLICY, cheddar, 11)).toBe(1);
    expect(priceMultiplier(DEFAULT_MARKDOWN_POLICY, cheddar, 5)).toBe(1);
  });

  it("never discounts a batch on its first day", () => {
    expect(priceMultiplier(DEFAULT_MARKDOWN_POLICY, croissant, 2)).toBe(1);
  });

  it("gives a short-life product the deeper discount on its last day", () => {
    expect(priceMultiplier(DEFAULT_MARKDOWN_POLICY, croissant, 1)).toBeCloseTo(0.6, 10);
  });

  it("discounts a long-life product only near expiry", () => {
    expect(priceMultiplier(DEFAULT_MARKDOWN_POLICY, cheddar, 2)).toBeCloseTo(0.8, 10);
    expect(priceMultiplier(DEFAULT_MARKDOWN_POLICY, cheddar, 1)).toBeCloseTo(0.6, 10);
    expect(priceMultiplier(DEFAULT_MARKDOWN_POLICY, cheddar, 3)).toBe(1);
  });
});

describe("per-category overrides", () => {
  it("wins over the global tiers", () => {
    const policy = {
      kind: "markdown" as const,
      tiers: [
        { daysLeft: 2, discount: 0.2 },
        { daysLeft: 1, discount: 0.4 },
      ],
      byCategory: { Bakery: [{ daysLeft: 1, discount: 0.6 }] },
    };
    expect(priceMultiplier(policy, bread, 1)).toBeCloseTo(0.4, 10);
    expect(priceMultiplier(policy, PRODUCT_BY_ID["bread-wholewheat"], 1)).toBeCloseTo(0.4, 10);
  });
});

describe("tiersFor", () => {
  it("returns an empty list for the fixed policy", () => {
    expect(tiersFor(FIXED_POLICY, bread)).toEqual([]);
  });

  it("returns the category override when there is one", () => {
    const policy = {
      kind: "markdown" as const,
      tiers: [{ daysLeft: 1, discount: 0.4 }],
      byCategory: { Bakery: [{ daysLeft: 1, discount: 0.6 }] },
    };
    expect(tiersFor(policy, bread)).toEqual([{ daysLeft: 1, discount: 0.6 }]);
  });
});

describe("discount bounds", () => {
  it("clamps a discount into [0, 0.9]", () => {
    const policy = { kind: "markdown" as const, tiers: [{ daysLeft: 1, discount: 1.5 }] };
    expect(priceMultiplier(policy, bread, 1)).toBeCloseTo(0.1, 10);
  });

  it("never returns a negative multiplier", () => {
    const policy = { kind: "markdown" as const, tiers: [{ daysLeft: 1, discount: 0.99 }] };
    expect(priceMultiplier(policy, bread, 1)).toBeGreaterThan(0);
  });
});
