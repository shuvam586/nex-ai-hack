import { describe, expect, it } from "vitest";
import { compare, summarize } from "@/sim/metrics";
import { CATALOG, DEFAULT_PARAMS } from "@/sim/catalog";
import { simulate } from "@/sim/engine";
import { DEFAULT_MARKDOWN_POLICY, FIXED_POLICY } from "@/sim/policies";

const fixedRun = simulate(DEFAULT_PARAMS, FIXED_POLICY);
const markdownRun = simulate(DEFAULT_PARAMS, DEFAULT_MARKDOWN_POLICY);

describe("summarize", () => {
  const result = summarize(fixedRun.records, fixedRun.products, DEFAULT_PARAMS, FIXED_POLICY);

  it("adds up the totals from the daily records", () => {
    const received = fixedRun.records.reduce((sum, r) => sum + r.received, 0);
    const sold = fixedRun.records.reduce((sum, r) => sum + r.sold, 0);
    const wasted = fixedRun.records.reduce((sum, r) => sum + r.wasted, 0);
    const revenue = fixedRun.records.reduce((sum, r) => sum + r.revenue, 0);
    expect(result.totals.received).toBe(received);
    expect(result.totals.sold).toBe(sold);
    expect(result.totals.wasted).toBe(wasted);
    expect(result.totals.revenue).toBeCloseTo(revenue, 6);
  });

  it("accounts for cost of goods and waste", () => {
    const expectedCogs = fixedRun.records.reduce(
      (sum, r) => sum + r.sold * CATALOG.find((p) => p.id === r.productId)!.unitCost,
      0,
    );
    const expectedWaste = fixedRun.records.reduce(
      (sum, r) => sum + r.wasted * CATALOG.find((p) => p.id === r.productId)!.unitCost,
      0,
    );
    expect(result.totals.cogs).toBeCloseTo(expectedCogs, 6);
    expect(result.totals.wasteCost).toBeCloseTo(expectedWaste, 6);
    expect(result.totals.profit).toBeCloseTo(
      result.totals.revenue - result.totals.cogs - result.totals.wasteCost,
      6,
    );
  });

  it("derives the margin and waste ratios from the totals", () => {
    const t = result.totals;
    expect(t.grossMarginPct).toBeCloseTo((t.revenue - t.cogs) / t.revenue, 10);
    expect(t.netMarginPct).toBeCloseTo(t.profit / t.revenue, 10);
    expect(t.wastePct).toBeCloseTo(t.wasted / t.received, 10);
  });

  it("splits the totals by product and by category", () => {
    const productSum = Object.values(result.byProduct).reduce(
      (sum, t) => sum + t.revenue,
      0,
    );
    const categorySum = Object.values(result.byCategory).reduce(
      (sum, t) => sum + t.revenue,
      0,
    );
    expect(productSum).toBeCloseTo(result.totals.revenue, 6);
    expect(categorySum).toBeCloseTo(result.totals.revenue, 6);
    expect(Object.keys(result.byProduct)).toHaveLength(20);
    expect(Object.keys(result.byCategory)).toHaveLength(5);
  });

  it("splits the totals by day", () => {
    expect(result.byDay).toHaveLength(30);
    const dayRevenue = result.byDay.reduce((sum, d) => sum + d.revenue, 0);
    expect(dayRevenue).toBeCloseTo(result.totals.revenue, 6);
    expect(result.byDay.map((d) => d.day)).toEqual([...Array(30).keys()]);
  });
});

describe("compare", () => {
  const fixed = summarize(fixedRun.records, fixedRun.products, DEFAULT_PARAMS, FIXED_POLICY);
  const markdown = summarize(
    markdownRun.records,
    markdownRun.products,
    DEFAULT_PARAMS,
    DEFAULT_MARKDOWN_POLICY,
  );
  const comparison = compare(fixed, markdown);

  it("keeps both runs and a field-by-field delta", () => {
    expect(comparison.fixed).toBe(fixed);
    expect(comparison.markdown).toBe(markdown);
    expect(comparison.delta.revenue).toBeCloseTo(markdown.totals.revenue - fixed.totals.revenue, 6);
    expect(comparison.delta.wasted).toBe(markdown.totals.wasted - fixed.totals.wasted);
    expect(comparison.delta.profit).toBeCloseTo(markdown.totals.profit - fixed.totals.profit, 6);
  });
});
