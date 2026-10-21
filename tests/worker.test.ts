import { describe, expect, it } from "vitest";
import { api } from "@/sim/worker";
import { MOCK_RESULT } from "@/sim/mock";
import { DEFAULT_PARAMS } from "@/sim/catalog";
import { DEFAULT_MARKDOWN_POLICY } from "@/sim/policies";

describe("worker api", () => {
  it("exposes the calls the UI needs", () => {
    expect(typeof api.run).toBe("function");
    expect(typeof api.runSeeds).toBe("function");
  });

  it("runs a simulation through the api", () => {
    const result = api.run(DEFAULT_PARAMS, DEFAULT_MARKDOWN_POLICY);
    expect(result.totals.revenue).toBeGreaterThan(0);
    expect(result.records).toHaveLength(20 * DEFAULT_PARAMS.days);
  });

  it("evaluates seeds through the api", () => {
    const result = api.runSeeds(DEFAULT_PARAMS, [1, 2, 3], DEFAULT_MARKDOWN_POLICY);
    expect(result.perSeed).toHaveLength(3);
  });
});

describe("mock result", () => {
  it("has the same shape as a real run", () => {
    expect(MOCK_RESULT.records).toHaveLength(20 * DEFAULT_PARAMS.days);
    expect(Object.keys(MOCK_RESULT.byProduct)).toHaveLength(20);
    expect(Object.keys(MOCK_RESULT.byCategory)).toHaveLength(5);
    expect(MOCK_RESULT.byDay).toHaveLength(DEFAULT_PARAMS.days);
  });

  it("carries plausible numbers", () => {
    expect(MOCK_RESULT.totals.revenue).toBeGreaterThan(0);
    expect(MOCK_RESULT.totals.profit).toBeGreaterThan(0);
    expect(MOCK_RESULT.totals.wastePct).toBeGreaterThan(0);
  });
});
