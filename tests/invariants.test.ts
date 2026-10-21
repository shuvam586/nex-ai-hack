import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { comparePolicies, runSim } from "@/sim/runner";
import { DEFAULT_PARAMS, PRODUCT_BY_ID } from "@/sim/catalog";
import { DEFAULT_MARKDOWN_POLICY, FIXED_POLICY } from "@/sim/policies";
import type { SimParams } from "@/sim/types";

const SEEDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

function params(overrides: Partial<SimParams> = {}): SimParams {
  return { ...DEFAULT_PARAMS, ...overrides };
}

describe("invariant 1 — units are conserved", () => {
  it("keeps opening + received = sold + wasted + closing for every product", () => {
    const result = runSim(params(), DEFAULT_MARKDOWN_POLICY);

    const byProduct = new Map<string, typeof result.records>();
    for (const record of result.records) {
      const list = byProduct.get(record.productId) ?? [];
      list.push(record);
      byProduct.set(record.productId, list);
    }

    for (const list of byProduct.values()) {
      list.sort((a, b) => a.day - b.day);
      const opening = list[0].startStock;
      const received = list.reduce((sum, r) => sum + r.received, 0);
      const sold = list.reduce((sum, r) => sum + r.sold, 0);
      const wasted = list.reduce((sum, r) => sum + r.wasted, 0);
      const last = list[list.length - 1];
      const closing = last.startStock + last.received - last.sold - last.wasted;

      expect(opening + received).toBe(sold + wasted + closing);
    }
  });
});

describe("invariant 2 — no negative stock, no sale after expiry", () => {
  it("never sells more than it holds and never carries a negative closing stock", () => {
    const result = runSim(params(), DEFAULT_MARKDOWN_POLICY);

    for (const record of result.records) {
      const closing = record.startStock + record.received - record.sold - record.wasted;
      expect(closing).toBeGreaterThanOrEqual(0);
      expect(record.sold).toBeLessThanOrEqual(record.startStock + record.received);
      expect(record.sold).toBeGreaterThanOrEqual(0);
      for (const qty of Object.values(record.stockByDaysLeft)) {
        expect(qty).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("carries the closing stock of one day into the next", () => {
    const result = runSim(params(), DEFAULT_MARKDOWN_POLICY);
    const byProduct = new Map<string, typeof result.records>();
    for (const record of result.records) {
      const list = byProduct.get(record.productId) ?? [];
      list.push(record);
      byProduct.set(record.productId, list);
    }

    for (const list of byProduct.values()) {
      list.sort((a, b) => a.day - b.day);
      for (let i = 0; i + 1 < list.length; i++) {
        const closing = list[i].startStock + list[i].received - list[i].sold - list[i].wasted;
        expect(list[i + 1].startStock).toBe(closing);
      }
    }
  });
});

describe("invariant 3 — same seed, same numbers", () => {
  it("replays identically", () => {
    expect(runSim(params({ seed: 7 }), DEFAULT_MARKDOWN_POLICY)).toEqual(
      runSim(params({ seed: 7 }), DEFAULT_MARKDOWN_POLICY),
    );
  });

  it("changes with the seed", () => {
    const a = runSim(params({ seed: 7 }), DEFAULT_MARKDOWN_POLICY);
    const b = runSim(params({ seed: 8 }), DEFAULT_MARKDOWN_POLICY);
    expect(a.records).not.toEqual(b.records);
  });
});

describe("invariant 4 — the fixed policy never marks anything down", () => {
  it("sells everything at base price", () => {
    const result = runSim(params(), FIXED_POLICY);
    for (const record of result.records) {
      expect(record.maxDiscount).toBe(0);
      expect(record.soldAtMarkdown).toBe(0);
      expect(record.deals).toEqual([]);
      const product = PRODUCT_BY_ID[record.productId];
      expect(record.revenue).toBeCloseTo(record.sold * product.basePrice, 8);
    }
  });
});

describe("invariant 5 — discounting without a response cannot pay", () => {
  it("gives no more profit than the fixed policy when shoppers ignore the discount", () => {
    const noResponse = params({ responseScale: 0 });
    const fixed = runSim(noResponse, FIXED_POLICY);
    const markdown = runSim(noResponse, DEFAULT_MARKDOWN_POLICY);

    expect(markdown.totals.profit).toBeLessThanOrEqual(fixed.totals.profit + 1e-9);
  });
});

describe("invariant 6 — a zero-discount rule is exactly the fixed policy", () => {
  it("replays the same numbers (common random numbers)", () => {
    const fixed = runSim(params(), FIXED_POLICY);
    const zeroDiscount = runSim(params(), {
      kind: "markdown",
      tiers: [{ daysLeft: 1, discount: 0 }],
    });

    expect(zeroDiscount.records).toEqual(fixed.records);
    expect(zeroDiscount.totals).toEqual(fixed.totals);
  });
});

describe("invariant 7 — revenue is the sum of units times price", () => {
  it("adds up exactly at full price", () => {
    const result = runSim(params(), FIXED_POLICY);
    for (const record of result.records) {
      const product = PRODUCT_BY_ID[record.productId];
      expect(record.revenue).toBeCloseTo(record.sold * product.basePrice, 8);
      expect(record.revenue).toBeGreaterThanOrEqual(0);
    }
  });

  it("stays between the cheapest and the dearest possible price for the sold units", () => {
    const result = runSim(params(), DEFAULT_MARKDOWN_POLICY);
    for (const record of result.records) {
      const product = PRODUCT_BY_ID[record.productId];
      const fullPriceUnits = record.sold - record.soldAtMarkdown;
      const cheapest = fullPriceUnits * product.basePrice + record.soldAtMarkdown * product.basePrice * 0.1;
      const dearest = fullPriceUnits * product.basePrice + record.soldAtMarkdown * product.basePrice * 0.9;
      expect(record.revenue).toBeGreaterThanOrEqual(cheapest - 1e-9);
      expect(record.revenue).toBeLessThanOrEqual(dearest + 1e-9);
    }
  });
});

describe("invariant 8 — waste happens only on the last day of a batch", () => {
  it("never wastes units on a day the batch is not expiring", () => {
    const result = runSim(params(), DEFAULT_MARKDOWN_POLICY);

    const wasteDays = new Map<string, number[]>();
    for (const record of result.records) {
      if (record.wasted === 0) continue;
      const list = wasteDays.get(record.productId) ?? [];
      list.push(record.day + DEFAULT_PARAMS.warmupDays);
      wasteDays.set(record.productId, list);
    }

    for (const [productId, days] of wasteDays) {
      const product = PRODUCT_BY_ID[productId];
      // A batch received on day r expires at the end of day r + shelfLife - 1.
      const expiryDays = new Set<number>();
      for (let r = 0; r <= 60; r++) {
        if (r % product.deliveryInterval === product.deliveryPhase) {
          expiryDays.add(r + product.shelfLife - 1);
        }
      }
      for (const absoluteDay of days) {
        expect(expiryDays.has(absoluteDay)).toBe(true);
      }
    }
  });
});

describe("common random numbers — both policies meet the same shoppers", () => {
  it("draws the same baseline demand per product and day", () => {
    const fixed = runSim(params(), FIXED_POLICY);
    const markdown = runSim(params(), DEFAULT_MARKDOWN_POLICY);

    const demandOf = (records: typeof fixed.records) =>
      records.map((r) => `${r.day}:${r.productId}:${r.demand}`).join("|");
    expect(demandOf(markdown.records)).toBe(demandOf(fixed.records));
  });
});

describe("determinism guard — no Math.random in the simulation core", () => {
  it("keeps src/sim free of Math.random", () => {
    const simDir = join(process.cwd(), "src", "sim");
    const offenders: string[] = [];

    const walk = (dir: string) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const path = join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(path);
          continue;
        }
        if (!/\.(ts|tsx)$/.test(entry.name)) continue;
        const source = readFileSync(path, "utf8")
          .replace(/\/\*[\s\S]*?\*\//g, "") // block comments
          .replace(/\/\/.*$/gm, ""); // line comments
        if (/Math\s*\.\s*random/.test(source)) offenders.push(path);
      }
    };
    walk(simDir);

    expect(offenders).toEqual([]);
  });
});

describe("the comparison runs both policies on the same seed", () => {
  it("produces a delta that matches the two runs", () => {
    const comparison = comparePolicies(params(), DEFAULT_MARKDOWN_POLICY);
    expect(comparison.delta.wasted).toBe(
      comparison.markdown.totals.wasted - comparison.fixed.totals.wasted,
    );
    expect(comparison.fixed.params.seed).toBe(comparison.markdown.params.seed);
  });
});

describe("seed sweep — the sim is stable across seeds", () => {
  it("runs every seed without a negative or infinite number", () => {
    for (const seed of SEEDS) {
      const result = runSim(params({ seed }), DEFAULT_MARKDOWN_POLICY);
      expect(result.totals.revenue).toBeGreaterThan(0);
      expect(result.totals.wasted).toBeGreaterThanOrEqual(0);
      expect(Number.isFinite(result.totals.profit)).toBe(true);
    }
  });
});
