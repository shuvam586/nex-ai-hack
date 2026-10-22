import { describe, expect, it } from "vitest";
import { createSimStore } from "@/store/useSimStore";
import { DEFAULT_URL_STATE } from "@/lib/urlState";

/**
 * The store has to work outside the browser too: the fallback path (the
 * simulation runs on the main thread because there is no Worker in Node) is
 * the same code path a judge hits if the worker fails to start.
 */
const settle = () => new Promise((resolve) => setTimeout(resolve, 350));

describe("the simulation store", () => {
  it("computes a comparison as soon as it is created", async () => {
    const store = createSimStore(DEFAULT_URL_STATE);
    await settle();

    const state = store.getState();
    expect(state.comparison).not.toBeNull();
    expect(state.comparison!.fixed.totals.wasted).toBeGreaterThan(0);
    expect(state.comparison!.markdown.totals.wasted).toBeLessThan(
      state.comparison!.fixed.totals.wasted,
    );
    expect(state.loading).toBe(false);
    expect(state.error).toBeNull();
  });

  it("recomputes when the seed changes", async () => {
    const store = createSimStore(DEFAULT_URL_STATE);
    await settle();

    store.getState().setSeed(7);
    await settle();

    const state = store.getState();
    expect(state.seed).toBe(7);
    expect(state.params.seed).toBe(7);
    expect(state.comparison!.markdown.params.seed).toBe(7);
  });

  it("recomputes when a tier changes", async () => {
    const store = createSimStore(DEFAULT_URL_STATE);
    await settle();

    store.getState().setTier(0, { daysLeft: 3, discount: 0.5 });
    await settle();

    expect(store.getState().policy).toEqual({
      kind: "markdown",
      tiers: [
        { daysLeft: 3, discount: 0.5 },
        { daysLeft: 1, discount: 0.4 },
      ],
    });
  });

  it("recomputes when the shopper response changes", async () => {
    const store = createSimStore(DEFAULT_URL_STATE);
    await settle();

    store.getState().setResponseScale(0.5);
    await settle();

    expect(store.getState().params.responseScale).toBe(0.5);
    expect(store.getState().comparison!.markdown.params.responseScale).toBe(0.5);
  });

  it("runs the multi-seed evaluation", async () => {
    const store = createSimStore(DEFAULT_URL_STATE);
    await settle();

    await store.getState().runEvaluation([1, 2, 3]);

    const evalResult = store.getState().evalResult;
    expect(evalResult).not.toBeNull();
    expect(evalResult!.perSeed).toHaveLength(3);
    expect(evalResult!.perSeed.map((row) => row.seed)).toEqual([1, 2, 3]);
  });

  it("resets back to the defaults", async () => {
    const store = createSimStore(DEFAULT_URL_STATE);
    await settle();

    store.getState().setSeed(99);
    store.getState().setTier(0, { daysLeft: 4, discount: 0.6 });
    await settle();

    store.getState().reset();
    await settle();

    expect(store.getState().seed).toBe(DEFAULT_URL_STATE.seed);
    expect(store.getState().policy).toEqual({
      kind: "markdown",
      tiers: DEFAULT_URL_STATE.tiers,
    });
  });
});
