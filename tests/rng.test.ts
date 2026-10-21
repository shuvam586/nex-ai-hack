import { describe, expect, it } from "vitest";
import { hash32, makeStreams, mulberry32, normalFromUniforms, poisson } from "@/sim/rng";

describe("hash32", () => {
  it("returns the same value for the same input", () => {
    expect(hash32("seed|1|2|n0")).toBe(hash32("seed|1|2|n0"));
  });

  it("returns an unsigned 32-bit integer", () => {
    for (const s of ["", "a", "hello world", "seed|9|3|td"]) {
      const h = hash32(s);
      expect(Number.isInteger(h)).toBe(true);
      expect(h).toBeGreaterThanOrEqual(0);
      expect(h).toBeLessThan(2 ** 32);
    }
  });

  it("separates different inputs", () => {
    expect(hash32("a")).not.toBe(hash32("b"));
    expect(hash32("seed|1|2|n0")).not.toBe(hash32("seed|1|2|n1"));
  });
});

describe("mulberry32", () => {
  it("produces the same sequence for the same seed", () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    const first = Array.from({ length: 20 }, () => a());
    const second = Array.from({ length: 20 }, () => b());
    expect(first).toEqual(second);
  });

  it("produces different sequences for different seeds", () => {
    const a = mulberry32(1);
    const b = mulberry32(2);
    expect(a()).not.toBe(b());
  });

  it("stays inside [0, 1)", () => {
    const next = mulberry32(7);
    for (let i = 0; i < 10000; i++) {
      const u = next();
      expect(u).toBeGreaterThanOrEqual(0);
      expect(u).toBeLessThan(1);
    }
  });

  it("is roughly uniform", () => {
    const next = mulberry32(99);
    let sum = 0;
    const n = 10000;
    for (let i = 0; i < n; i++) sum += next();
    expect(Math.abs(sum / n - 0.5)).toBeLessThan(0.02);
  });
});

describe("poisson", () => {
  it("returns 0 for a non-positive rate", () => {
    expect(poisson(0, 0.5)).toBe(0);
    expect(poisson(-1, 0.5)).toBe(0);
  });

  it("returns 0 for the smallest uniform", () => {
    expect(poisson(5, 0)).toBe(0);
  });

  it("is non-decreasing in the uniform", () => {
    let previous = poisson(5, 0);
    for (let i = 1; i <= 100; i++) {
      const value = poisson(5, i / 100);
      expect(value).toBeGreaterThanOrEqual(previous);
      previous = value;
    }
  });

  it("is non-decreasing in the rate for a fixed uniform (common random numbers)", () => {
    let previous = poisson(0, 0.5);
    for (let lambda = 0.5; lambda <= 20; lambda += 0.5) {
      const value = poisson(lambda, 0.5);
      expect(value).toBeGreaterThanOrEqual(previous);
      previous = value;
    }
  });

  it("matches the Poisson mean and variance over 10k draws", () => {
    const lambda = 4;
    const next = mulberry32(2024);
    const n = 10000;
    let sum = 0;
    let sumSq = 0;
    for (let i = 0; i < n; i++) {
      const k = poisson(lambda, next());
      sum += k;
      sumSq += k * k;
    }
    const mean = sum / n;
    const variance = sumSq / n - mean * mean;
    expect(Math.abs(mean - lambda) / lambda).toBeLessThan(0.05);
    expect(Math.abs(variance - lambda) / lambda).toBeLessThan(0.15);
  });

  it("handles a rate large enough to underflow a naive recurrence", () => {
    // exp(-1000) underflows to zero, so a multiplicative pmf recurrence would
    // stall at zero and never terminate.
    const value = poisson(1000, 0.5);
    expect(value).toBeGreaterThan(950);
    expect(value).toBeLessThan(1050);
  });

  it("keeps the mean at a large rate", () => {
    const lambda = 500;
    const next = mulberry32(5150);
    const n = 2000;
    let sum = 0;
    for (let i = 0; i < n; i++) sum += poisson(lambda, next());
    expect(Math.abs(sum / n - lambda) / lambda).toBeLessThan(0.05);
  });
});

describe("normalFromUniforms", () => {
  it("has mean near 0 and standard deviation near 1 over 10k draws", () => {
    const next = mulberry32(31337);
    const n = 10000;
    let sum = 0;
    let sumSq = 0;
    for (let i = 0; i < n; i++) {
      const z = normalFromUniforms(next(), next());
      sum += z;
      sumSq += z * z;
    }
    const mean = sum / n;
    const sd = Math.sqrt(sumSq / n - mean * mean);
    expect(Math.abs(mean)).toBeLessThan(0.05);
    expect(Math.abs(sd - 1)).toBeLessThan(0.05);
  });

  it("survives a zero uniform", () => {
    expect(Number.isFinite(normalFromUniforms(0, 0.5))).toBe(true);
  });
});

describe("makeStreams", () => {
  it("is deterministic for the same seed", () => {
    const a = makeStreams(42);
    const b = makeStreams(42);
    for (let day = 0; day < 5; day++) {
      expect(a.next(0, day, "n0")).toBe(b.next(0, day, "n0"));
    }
  });

  it("produces different values for different seeds", () => {
    const a = makeStreams(1);
    const b = makeStreams(2);
    expect(a.next(0, 0, "n0")).not.toBe(b.next(0, 0, "n0"));
  });

  it("keeps product, day and stream independent of each other", () => {
    const rng = makeStreams(42);
    const base = rng.next(0, 0, "n0");
    expect(rng.next(1, 0, "n0")).not.toBe(base);
    expect(rng.next(0, 1, "n0")).not.toBe(base);
    expect(rng.next(0, 0, "n1")).not.toBe(base);
  });

  it("advances within a stream instead of repeating the first value", () => {
    const rng = makeStreams(42);
    const first = rng.next(0, 0, "td");
    const second = rng.next(0, 0, "td");
    expect(second).not.toBe(first);
  });

  it("gives the same value to a stream key no matter when it is first touched", () => {
    const early = makeStreams(42);
    early.next(0, 0, "n0");
    const later = makeStreams(42);
    expect(later.next(0, 3, "n1")).toBe(makeStreams(42).next(0, 3, "n1"));
  });
});
