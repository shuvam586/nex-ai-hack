import { describe, expect, it } from "vitest";
import {
  DEFAULT_URL_STATE,
  parseUrlState,
  parseUrlStateFromRecord,
  serializeUrlState,
  type UrlState,
} from "@/lib/urlState";

const parse = (query: string) => parseUrlState(new URLSearchParams(query));

describe("parseUrlState", () => {
  it("falls back to the defaults for an empty query", () => {
    expect(parse("")).toEqual(DEFAULT_URL_STATE);
  });

  it("reads the seed, the two tiers and the response scale", () => {
    const state = parse("seed=7&t1=3&d1=15&t2=1&d2=50&s=1.5");
    expect(state.seed).toBe(7);
    expect(state.tiers).toEqual([
      { daysLeft: 3, discount: 0.15 },
      { daysLeft: 1, discount: 0.5 },
    ]);
    expect(state.responseScale).toBe(1.5);
  });

  it("ignores junk instead of breaking", () => {
    const state = parse("seed=abc&t1=99&d1=-5&t2=x&d2=40&s=9");
    expect(state.seed).toBe(DEFAULT_URL_STATE.seed);
    expect(state.tiers[0].daysLeft).toBe(4);
    expect(state.tiers[0].discount).toBe(0);
    expect(state.responseScale).toBe(1.5);
  });

  it("keeps a tier that only has one valid half out of the way", () => {
    const state = parse("t1=3");
    expect(state.tiers).toEqual(DEFAULT_URL_STATE.tiers);
  });

  it("clamps the threshold to the 1–4 range the sliders allow", () => {
    expect(parse("t1=0&d1=20&t2=9&d2=40").tiers[0].daysLeft).toBe(1);
    expect(parse("t1=0&d1=20&t2=9&d2=40").tiers[1].daysLeft).toBe(4);
  });

  it("clamps the discount to the 0–60% range the sliders allow", () => {
    expect(parse("t1=2&d1=90&t2=1&d2=20").tiers[0].discount).toBe(0.6);
  });

  it("clamps the shopper response to 0.5–1.5", () => {
    expect(parse("s=0.1").responseScale).toBe(0.5);
    expect(parse("s=3").responseScale).toBe(1.5);
  });
});

describe("serializeUrlState", () => {
  it("writes the parameter names the plan uses", () => {
    expect(serializeUrlState(DEFAULT_URL_STATE)).toBe("?seed=42&t1=2&d1=20&t2=1&d2=40&s=1");
  });

  it("writes discounts as whole percentages", () => {
    const state: UrlState = {
      seed: 9,
      tiers: [
        { daysLeft: 3, discount: 0.15 },
        { daysLeft: 1, discount: 0.5 },
      ],
      responseScale: 0.5,
    };
    expect(serializeUrlState(state)).toBe("?seed=9&t1=3&d1=15&t2=1&d2=50&s=0.5");
  });

  it("round-trips through parse", () => {
    const state: UrlState = {
      seed: 123,
      tiers: [
        { daysLeft: 4, discount: 0.05 },
        { daysLeft: 2, discount: 0.25 },
      ],
      responseScale: 1.25,
    };
    expect(parse(serializeUrlState(state))).toEqual(state);
  });
});

describe("parseUrlStateFromRecord", () => {
  it("reads the record shape a Next.js page receives", () => {
    const state = parseUrlStateFromRecord({
      seed: "5",
      t1: "3",
      d1: "25",
      t2: "1",
      d2: "60",
      s: "1.25",
    });
    expect(state.seed).toBe(5);
    expect(state.tiers).toEqual([
      { daysLeft: 3, discount: 0.25 },
      { daysLeft: 1, discount: 0.6 },
    ]);
    expect(state.responseScale).toBe(1.25);
  });

  it("ignores missing and repeated values", () => {
    const state = parseUrlStateFromRecord({
      seed: undefined,
      t1: ["3", "4"],
      extra: "ignored",
    });
    expect(state.seed).toBe(DEFAULT_URL_STATE.seed);
    // A tier needs both halves; with only a threshold it keeps its default.
    expect(state.tiers[0]).toEqual(DEFAULT_URL_STATE.tiers[0]);
  });

  it("falls back to the defaults for an empty record", () => {
    expect(parseUrlStateFromRecord({})).toEqual(DEFAULT_URL_STATE);
  });
});
