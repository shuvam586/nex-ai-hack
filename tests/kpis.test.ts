import { describe, expect, it } from "vitest";
import { buildKpis, buildVerdict } from "@/lib/kpis";
import { comparePolicies } from "@/sim/runner";
import { DEFAULT_PARAMS } from "@/sim/catalog";
import { BLANKET_POLICY, DEFAULT_MARKDOWN_POLICY } from "@/sim/policies";

const comparison = comparePolicies(DEFAULT_PARAMS, DEFAULT_MARKDOWN_POLICY);

describe("buildKpis", () => {
  it("reports one card per headline number", () => {
    const kpis = buildKpis(comparison);
    expect(kpis.map((kpi) => kpi.id)).toEqual(["waste", "revenue", "profit", "margin"]);
  });

  it("shows waste next to margin, never margin alone", () => {
    const kpis = buildKpis(comparison);
    const waste = kpis.find((kpi) => kpi.id === "waste")!;
    const margin = kpis.find((kpi) => kpi.id === "margin")!;
    expect(waste.fixedValue).toContain("units");
    expect(margin.fixedValue).toContain("%");
  });

  it("shows both policies on every card", () => {
    for (const kpi of buildKpis(comparison)) {
      expect(kpi.fixedValue).not.toBe("");
      expect(kpi.markdownValue).not.toBe("");
      expect(kpi.delta).not.toBe("");
    }
  });

  it("calls falling waste a good thing", () => {
    const waste = buildKpis(comparison).find((kpi) => kpi.id === "waste")!;
    expect(waste.tone).toBe("good");
  });

  it("warns when waste falls but profit falls too", () => {
    // plans/03 §3: "if profit falls while waste falls, chip turns amber".
    const blanket = comparePolicies(DEFAULT_PARAMS, BLANKET_POLICY);
    const profit = buildKpis(blanket).find((kpi) => kpi.id === "profit")!;
    expect(profit.tone).toBe("warn");
    expect(profit.delta.startsWith("-")).toBe(true);
  });

  it("calls a profit drop a plain loss when waste did not fall", () => {
    // No markdown at all: nothing changes, so neither tone applies.
    const fixedOnly = comparePolicies(DEFAULT_PARAMS, { kind: "fixed" });
    const profit = buildKpis(fixedOnly).find((kpi) => kpi.id === "profit")!;
    expect(profit.tone).toBe("flat");
  });
});

describe("buildVerdict", () => {
  it("says what happened in plain words", () => {
    const verdict = buildVerdict(comparison, 42);
    expect(verdict).toContain("seed 42");
    expect(verdict).toMatch(/waste/i);
    expect(verdict).toMatch(/profit/i);
  });

  it("says so when the rule costs money", () => {
    const blanket = comparePolicies(DEFAULT_PARAMS, BLANKET_POLICY);
    const verdict = buildVerdict(blanket, 7);
    expect(verdict).toMatch(/reduced profit|less profit|too aggressive/i);
  });
});
