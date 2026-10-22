import { describe, expect, it } from "vitest";
import {
  CATEGORY_PRIOR,
  WEEKDAY_INDEX,
  dowOf,
  normalizeToMeanOne,
  weekdayShape,
} from "@/sim/weekday";
import { CATEGORIES } from "@/sim/types";

describe("the ingested UCI weekday index", () => {
  it("is either absent or a normalized 7-day vector with a source", () => {
    // A null index (data not generated) is a valid state — the app falls back
    // to the prior and says so. When present, it must be well-formed.
    if (WEEKDAY_INDEX.monToSun === null) return;
    expect(WEEKDAY_INDEX.monToSun).toHaveLength(7);
    const mean = WEEKDAY_INDEX.monToSun.reduce((sum, value) => sum + value, 0) / 7;
    expect(mean).toBeCloseTo(1, 2);
    expect(WEEKDAY_INDEX.source).toBeTruthy();
  });
});

describe("dowOf", () => {
  it("maps absolute day 7 to Monday", () => {
    expect(dowOf(7)).toBe(0);
  });

  it("cycles through the week", () => {
    expect([0, 1, 2, 3, 4, 5, 6].map((d) => dowOf(7 + d))).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });
});

describe("normalizeToMeanOne", () => {
  it("scales a vector so that its mean is 1", () => {
    const out = normalizeToMeanOne([1, 2, 3]);
    expect(out[0]).toBeCloseTo(0.5, 10);
    expect(out[1]).toBeCloseTo(1, 10);
    expect(out[2]).toBeCloseTo(1.5, 10);
  });

  it("leaves an already-normalized vector alone", () => {
    const out = normalizeToMeanOne([0.5, 1, 1.5]);
    expect(out).toEqual([0.5, 1, 1.5]);
  });
});

describe("weekdayShape", () => {
  it("is flat in flat mode", () => {
    for (const category of CATEGORIES) {
      expect(weekdayShape(category, "flat")).toEqual([1, 1, 1, 1, 1, 1, 1]);
    }
  });

  it("uses the documented grocery prior in prior mode", () => {
    const bakery = weekdayShape("Bakery", "prior");
    CATEGORY_PRIOR.Bakery.forEach((value, i) => {
      expect(bakery[i]).toBeCloseTo(value, 10);
    });
  });

  it("blends the UCI shape with the prior in uci mode", () => {
    const flatUci = [1, 1, 1, 1, 1, 1, 1];
    const shape = weekdayShape("Bakery", "uci", flatUci);
    CATEGORY_PRIOR.Bakery.forEach((value, i) => {
      expect(shape[i]).toBeCloseTo(0.5 + 0.5 * value, 10);
    });
  });

  it("falls back to the prior when no UCI data is available", () => {
    expect(weekdayShape("Bakery", "uci", null)).toEqual(weekdayShape("Bakery", "prior"));
  });

  it("has a mean of 1 in every mode, for every category", () => {
    for (const category of CATEGORIES) {
      for (const mode of ["flat", "prior", "uci"] as const) {
        const shape = weekdayShape(category, mode, [1.2, 0.8, 0.9, 1.1, 1, 1.3, 0.7]);
        const mean = shape.reduce((a, b) => a + b, 0) / shape.length;
        expect(mean).toBeCloseTo(1, 10);
      }
    }
  });
});
