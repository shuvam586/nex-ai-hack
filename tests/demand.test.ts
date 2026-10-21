import { describe, expect, it } from "vitest";
import { drawDemand } from "@/sim/demand";
import { makeStreams } from "@/sim/rng";
import { PRODUCT_BY_ID, DEFAULT_PARAMS } from "@/sim/catalog";
import type { SimParams } from "@/sim/types";

const product = PRODUCT_BY_ID["bread-white"]; // λ = 40, e = 1.8

function params(overrides: Partial<SimParams> = {}): SimParams {
  return { ...DEFAULT_PARAMS, ...overrides };
}

function input(overrides: Partial<Parameters<typeof drawDemand>[1]> = {}) {
  return {
    product,
    params: params(),
    productIdx: 0,
    day: 7,
    weekdayFactor: 1,
    minMultiplier: 1,
    ...overrides,
  };
}

describe("drawDemand", () => {
  it("draws a baseline count around the expected mean", () => {
    const rng = makeStreams(42);
    let total = 0;
    const n = 2000;
    for (let i = 0; i < n; i++) total += drawDemand(rng, input({ day: i })).n0;
    expect(total / n).toBeGreaterThan(40 * 0.85);
    expect(total / n).toBeLessThan(40 * 1.15);
  });

  it("keeps the demand shock mean-preserving", () => {
    const rng = makeStreams(7);
    let total = 0;
    const n = 4000;
    for (let i = 0; i < n; i++) total += drawDemand(rng, input({ day: i })).lambdaT;
    expect(total / n).toBeGreaterThan(40 * 0.9);
    expect(total / n).toBeLessThan(40 * 1.1);
  });

  it("scales demand with the weekday shape", () => {
    const rng = makeStreams(11);
    let total = 0;
    const n = 2000;
    for (let i = 0; i < n; i++) total += drawDemand(rng, input({ day: i, weekdayFactor: 1.2 })).lambdaT;
    expect(total / n).toBeGreaterThan(40 * 1.2 * 0.9);
    expect(total / n).toBeLessThan(40 * 1.2 * 1.1);
  });

  it("is deterministic for the same seed and day", () => {
    const a = drawDemand(makeStreams(42), input());
    const b = drawDemand(makeStreams(42), input());
    expect(a).toEqual(b);
  });

  it("differs for a different seed", () => {
    const a = drawDemand(makeStreams(1), input());
    const b = drawDemand(makeStreams(2), input());
    expect(a.n0).not.toBe(b.n0);
  });

  it("trades down nobody and attracts nobody at full price", () => {
    const draw = drawDemand(makeStreams(42), input({ minMultiplier: 1 }));
    expect(draw.h).toBe(0);
    expect(draw.n1).toBe(0);
  });

  it("trades down 30% of shoppers at a 20% discount", () => {
    const draw = drawDemand(makeStreams(42), input({ minMultiplier: 0.8 }));
    expect(draw.h).toBeCloseTo(0.3, 10);
  });

  it("halves the trade-down at half response", () => {
    const draw = drawDemand(
      makeStreams(42),
      input({ minMultiplier: 0.8, params: params({ responseScale: 0.5 }) }),
    );
    expect(draw.h).toBeCloseTo(0.15, 10);
  });

  it("never trades down more than every shopper", () => {
    const draw = drawDemand(
      makeStreams(42),
      input({ minMultiplier: 0.1, params: params({ tradeDownK: 10 }) }),
    );
    expect(draw.h).toBe(1);
  });

  it("attracts incremental shoppers when a batch is discounted", () => {
    const rng = makeStreams(42);
    let total = 0;
    const n = 2000;
    for (let i = 0; i < n; i++) total += drawDemand(rng, input({ day: i, minMultiplier: 0.6 })).n1;
    const expected = 0.4 * 40 * (Math.pow(0.6, -1.8) - 1);
    expect(total / n).toBeGreaterThan(expected * 0.8);
    expect(total / n).toBeLessThan(expected * 1.2);
  });

  it("gives both policies the same baseline demand (common random numbers)", () => {
    const cheap = drawDemand(makeStreams(42), input({ minMultiplier: 0.6 }));
    const full = drawDemand(makeStreams(42), input({ minMultiplier: 1 }));
    expect(cheap.n0).toBe(full.n0);
    expect(cheap.lambdaT).toBe(full.lambdaT);
  });
});
