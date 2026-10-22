"use client";

/**
 * The UI store (plans/02 §3, §4, §6).
 *
 * Holds the inputs (seed, markdown rule, shopper response), the results, and
 * the wiring to the simulation worker:
 *
 *  - the worker is created lazily, because Next has no `Worker` on the server;
 *  - if the worker cannot be created or fails, the same pure functions run on
 *    the main thread instead;
 *  - slider changes are debounced, and a request counter drops the answer of
 *    a run that has already been superseded;
 *  - the URL follows the state, so a link always reproduces the numbers.
 */

import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { createStore, useStore } from "zustand";
import * as Comlink from "comlink";
import type { Remote } from "comlink";
import { DEFAULT_PARAMS } from "@/sim/catalog";
import { comparePolicies, runSeeds as evaluateSeeds } from "@/sim/runner";
import type { SimWorkerApi } from "@/sim/api";
import type {
  Category,
  Comparison,
  EvalResult,
  PolicyConfig,
  SimParams,
  Tier,
} from "@/sim/types";
import { writeUrlState, type UrlState } from "@/lib/urlState";

export interface SimStore {
  seed: number;
  policy: PolicyConfig;
  params: SimParams;
  comparison: Comparison | null;
  evalResult: EvalResult | null;
  loading: boolean;
  error: string | null;
  /** False once the worker has failed and the sim runs on the main thread. */
  workerActive: boolean;

  setSeed: (seed: number) => void;
  setTier: (index: number, tier: Tier) => void;
  setResponseScale: (scale: number) => void;
  setPolicy: (policy: PolicyConfig) => void;
  runEvaluation: (seeds?: number[]) => Promise<void>;
  reset: () => void;
}

export type SimStoreApi = ReturnType<typeof createSimStore>;

/** Slider changes are debounced so a drag does not run the sim 60 times. */
const RECOMPUTE_DEBOUNCE_MS = 120;

export const DEFAULT_EVAL_SEEDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

// --- worker plumbing -------------------------------------------------------

let workerApi: Remote<SimWorkerApi> | null = null;
let workerUnavailable = false;
let usedWorker = false;

/**
 * The worker, or null when it cannot be used.
 *
 * `new Worker(new URL(...), { type: "module" })` is the pattern Next.js
 * bundles; it only works in the browser, so the server path never touches it.
 */
function getWorkerApi(): Remote<SimWorkerApi> | null {
  if (workerUnavailable) return null;
  if (workerApi) return workerApi;
  if (typeof window === "undefined" || typeof Worker === "undefined") {
    workerUnavailable = true;
    return null;
  }

  try {
    const worker = new Worker(new URL("../sim/worker.ts", import.meta.url), {
      type: "module",
    });
    workerApi = Comlink.wrap<SimWorkerApi>(worker);
  } catch (error) {
    workerUnavailable = true;
    console.warn("Sim worker unavailable — running on the main thread instead.", error);
  }

  return workerApi;
}

/** Run through the worker when possible, on the main thread when not. */
async function withFallback<T>(
  viaWorker: (api: Remote<SimWorkerApi>) => Promise<T>,
  direct: () => T,
): Promise<T> {
  const api = getWorkerApi();
  if (!api) {
    usedWorker = false;
    return direct();
  }

  try {
    const value = await viaWorker(api);
    usedWorker = true;
    return value;
  } catch (error) {
    workerUnavailable = true;
    workerApi = null;
    usedWorker = false;
    console.warn("Sim worker failed — running on the main thread instead.", error);
    return direct();
  }
}

// --- url state -------------------------------------------------------------

export function urlStateFrom(state: SimStore): UrlState {
  const tiers =
    state.policy.kind === "markdown"
      ? state.policy.tiers.map((tier) => ({ ...tier }))
      : [];
  return {
    seed: state.seed,
    tiers: tiers.length > 0 ? tiers : [{ daysLeft: 2, discount: 0.2 }],
    responseScale: state.params.responseScale,
  };
}

// --- the store -------------------------------------------------------------

export function createSimStore(initial: UrlState) {
  const pending = { timer: null as ReturnType<typeof setTimeout> | null, request: 0 };

  async function runComparison(store: SimStoreApi): Promise<void> {
    const requestId = ++pending.request;
    const { params, policy } = store.getState();
    store.setState({ loading: true });

    try {
      const comparison = await withFallback(
        (worker) => worker.compare(params, policy),
        () => comparePolicies(params, policy),
      );
      // A newer run has already been started — this answer is stale.
      if (requestId !== pending.request) return;
      store.setState({
        comparison,
        loading: false,
        error: null,
        workerActive: usedWorker,
      });
    } catch (error) {
      if (requestId !== pending.request) return;
      console.error(error);
      store.setState({
        loading: false,
        error: "The simulation could not be run. Check the console for details.",
      });
    }
  }

  function scheduleUpdate(store: SimStoreApi): void {
    if (pending.timer) clearTimeout(pending.timer);
    pending.timer = setTimeout(() => {
      pending.timer = null;
      writeUrlState(urlStateFrom(store.getState()));
      void runComparison(store);
    }, RECOMPUTE_DEBOUNCE_MS);
  }

  // The third argument is the store itself — `get()` only returns the state.
  const store = createStore<SimStore>((set, get, api) => ({
    seed: initial.seed,
    policy: {
      kind: "markdown",
      tiers: initial.tiers.map((tier) => ({ ...tier })),
    },
    params: {
      ...DEFAULT_PARAMS,
      seed: initial.seed,
      responseScale: initial.responseScale,
    },
    comparison: null,
    evalResult: null,
    loading: true,
    error: null,
    workerActive: true,

    setSeed(seed) {
      set({ seed, params: { ...get().params, seed } });
      scheduleUpdate(api);
    },

    setTier(index, tier) {
      const policy = get().policy;
      if (policy.kind !== "markdown") return;
      const tiers = policy.tiers.map((existing, i) => (i === index ? { ...tier } : existing));
      set({ policy: { ...policy, tiers } });
      scheduleUpdate(api);
    },

    setResponseScale(scale) {
      set({ params: { ...get().params, responseScale: scale } });
      scheduleUpdate(api);
    },

    setPolicy(policy) {
      set({ policy });
      scheduleUpdate(api);
    },

    async runEvaluation(seeds = DEFAULT_EVAL_SEEDS) {
      const { params, policy } = get();
      set({ loading: true });
      try {
        const evalResult = await withFallback(
          (worker) => worker.runSeeds(params, seeds, policy),
          () => evaluateSeeds(params, seeds, policy),
        );
        set({ evalResult, loading: false, workerActive: usedWorker });
      } catch (error) {
        console.error(error);
        set({ loading: false, error: "The multi-seed evaluation could not be run." });
      }
    },

    reset() {
      set({
        seed: DEFAULT_PARAMS.seed,
        policy: {
          kind: "markdown",
          tiers: [
            { daysLeft: 2, discount: 0.2 },
            { daysLeft: 1, discount: 0.4 },
          ],
        },
        params: { ...DEFAULT_PARAMS },
      });
      scheduleUpdate(api);
    },
  }));

  // The first run happens as soon as the store exists, so the page never
  // sits on empty numbers waiting for someone to move a slider.
  scheduleUpdate(store);

  return store;
}

// --- react binding ---------------------------------------------------------

const SimStoreContext = createContext<SimStoreApi | null>(null);

export function SimStoreProvider({
  initialState,
  children,
}: {
  initialState: UrlState;
  children: ReactNode;
}) {
  // One store per provider, created lazily on the first render.
  const [store] = useState(() => createSimStore(initialState));
  return <SimStoreContext.Provider value={store}>{children}</SimStoreContext.Provider>;
}

export function useSimStore<T>(selector: (state: SimStore) => T): T {
  const store = useContext(SimStoreContext);
  if (!store) {
    throw new Error("useSimStore must be used inside a <SimStoreProvider>.");
  }
  return useStore(store, selector);
}

/** Convenience selectors. */
export const useTiers = (): Tier[] =>
  useSimStore((state) =>
    state.policy.kind === "markdown"
      ? state.policy.tiers
      : [{ daysLeft: 2, discount: 0.2 }],
  );

export const useCategoryOverrides = (): Partial<Record<Category, Tier[]>> =>
  useSimStore((state) =>
    state.policy.kind === "markdown" ? (state.policy.byCategory ?? {}) : {},
  );
