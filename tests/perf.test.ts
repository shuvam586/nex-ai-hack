import { describe, expect, it } from "vitest";
import { comparePolicies, runSeeds, runSim } from "@/sim/runner";
import { DEFAULT_PARAMS } from "@/sim/catalog";
import { DEFAULT_MARKDOWN_POLICY, FIXED_POLICY } from "@/sim/policies";

describe("performance budget (plans/02 §7)", () => {
  it("stays well inside the budget", () => {
    const seeds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

    // warm up
    runSim(DEFAULT_PARAMS, FIXED_POLICY);

    let t = performance.now();
    for (let i = 0; i < 50; i++) runSim({ ...DEFAULT_PARAMS, seed: i + 1 }, FIXED_POLICY);
    const oneRun = (performance.now() - t) / 50;

    t = performance.now();
    for (let i = 0; i < 20; i++) {
      comparePolicies({ ...DEFAULT_PARAMS, seed: i + 1 }, DEFAULT_MARKDOWN_POLICY);
    }
    const compare = (performance.now() - t) / 20;

    t = performance.now();
    runSeeds(DEFAULT_PARAMS, seeds, DEFAULT_MARKDOWN_POLICY);
    const tenSeeds = performance.now() - t;

    console.log(
      [
        `runSim           ${oneRun.toFixed(2)} ms   (budget 15 ms)`,
        `compare          ${compare.toFixed(2)} ms   (budget 40 ms)`,
        `runSeeds(10)     ${tenSeeds.toFixed(2)} ms   (budget 400 ms)`,
      ].join("\n"),
    );

    // Loose guards: 5x the budget, so a pathological regression fails but a
    // slow CI machine does not.
    expect(oneRun).toBeLessThan(75);
    expect(compare).toBeLessThan(200);
    expect(tenSeeds).toBeLessThan(2000);
  });
});
