import { describe, expect, it } from "vitest";
import {
  formatMoney,
  formatUnits,
  formatPercent,
  formatPoints,
  formatSignedPercent,
  formatDeltaMoney,
} from "@/lib/format";

describe("formatMoney", () => {
  it("rounds large amounts to whole dollars", () => {
    expect(formatMoney(322083.4)).toBe("$322,083");
  });

  it("keeps cents on small amounts", () => {
    expect(formatMoney(12.345)).toBe("$12.35");
  });

  it("handles zero and negative values", () => {
    expect(formatMoney(0)).toBe("$0");
    expect(formatMoney(-15.5)).toBe("-$15.50");
  });
});

describe("formatUnits", () => {
  it("groups thousands", () => {
    expect(formatUnits(135918)).toBe("135,918");
  });

  it("keeps zero plain", () => {
    expect(formatUnits(0)).toBe("0");
  });
});

describe("formatPercent", () => {
  it("turns a fraction into a percentage", () => {
    expect(formatPercent(0.3912)).toBe("39.1%");
    expect(formatPercent(0.0706)).toBe("7.1%");
  });

  it("rounds to the requested precision", () => {
    expect(formatPercent(0.123456, 0)).toBe("12%");
    expect(formatPercent(0.123456, 2)).toBe("12.35%");
  });
});

describe("formatPoints", () => {
  it("signs percentage-point differences", () => {
    expect(formatPoints(1.764)).toBe("+1.8 pts");
    expect(formatPoints(-2.5)).toBe("-2.5 pts");
  });

  it("leaves zero unsigned", () => {
    expect(formatPoints(0)).toBe("0.0 pts");
  });
});

describe("formatSignedPercent", () => {
  it("signs percentage differences", () => {
    expect(formatSignedPercent(0.0356)).toBe("+3.6%");
    expect(formatSignedPercent(-0.0356)).toBe("-3.6%");
  });

  it("leaves zero unsigned", () => {
    expect(formatSignedPercent(0)).toBe("0.0%");
  });
});

describe("formatDeltaMoney", () => {
  it("signs money differences", () => {
    expect(formatDeltaMoney(1234)).toBe("+$1,234");
    expect(formatDeltaMoney(-1234)).toBe("-$1,234");
  });

  it("keeps cents on small differences", () => {
    expect(formatDeltaMoney(-12.5)).toBe("-$12.50");
  });
});
