"use client";

/**
 * The UI store (plans/02 §3, §4, §6).
 *
 * Holds the inputs (seed, markdown rule, shopper response, assumption
 * overrides), the results, and the wiring to the simulation worker:
 *
 *  - the worker is created lazily, because Next has no `Worker` on the server;
 *  - if the worker cannot be created or fails, the same pure functions run on
 *    the main thread instead;
 *  - slider changes are debounced, and a request counter drops the answer of
 *    a run that has already been superseded;
 *  - the URL follows the state, so a link always reproduces the numbers.
 */

import { createContext, useContext, useState, type ReactNode } from "react";
import { createStore, useStore } from "zustand";
import * as Comlink from "comlink";
import type { Remote } from "comlink";
import { DEFAULT_PARAMS } from "@/sim/catalog";
import { comparePolicies, runSeeds as evaluateSeeds } from "@/sim/runner";
import { buildTradeoff } from "@/sim/tradeoff";
import { runSensitivity } from "@/sim/sensitivity";
import { optimizeCategories, optimizedPolicy } from "@/sim/optimizer";
import type { SimWorkerApi } from "@/sim/api";
import type {
  Category,
  CategoryOpt,
  Comparison,
  EvalResult,
  OptimizeResult,
  PolicyConfig,
  SensitivityResult,
  SimParams,
  Tier,
  TradeoffExtras,
} from "@/sim/types";
import { writeUrlState, type UrlState } from "@/lib/urlState";

/** One shopper-response arm of the half-strength panel (plans/03 §6.2). */
export interface ResponseRow {
  scale: number;
  result: EvalResult;
}

export type TaskKind = "evaluation" | "response" | "sensitivity" | "optimize";

export interface TaskState {
  kind: TaskKind;
  /** 0…1 for tasks that report progress, else null. */
  progress: number | null;
}

export interface SimStore {
  seed: number;
  policy: PolicyConfig;
  params: SimParams;
  comparison: Comparison | null;
  extras: TradeoffExtras | null;
  evalResult: EvalResult | null;
  responseCompare: ResponseRow[] | null;
  sensitivity: SensitivityResult | null;
  optimizeResult: OptimizeResult | null;
  loading: boolean;
  task: TaskState | null;
  error: string | null;
  /** False once the worker has failed and the sim runs on the main thread. */
  workerActive: boolean;
  /** Per-category markdown overrides, if any (plans/03 §2). */
  overridesEnabled: boolean;

  setSeed: (seed: number) => void;
  setTier: (index: number, tier: Tier) => void;
  setResponseScale: (scale: number) => void;
  setPolicy: (policy: PolicyConfig) => void;
  setParam: (patch: Partial<SimParams>) => void;
  resetParams: () => void;
  setOverridesEnabled: (enabled: boolean) => void;
  setCategoryOverride: (category: Category, tiers: Tier[] | null) => void;
  runEvaluation: (seeds?: number[]) => Promise<void>;
  runResponseCompare: () => Promise<void>;
  runSensitivity: () => Promise<void>;
  runOptimize: (options?: { trainSeeds?: number[]; testSeeds?: number[]; weight?: number }) => Promise<void>;
  applyOptimized: (categories: CategoryOpt[]) => void;
  reset: () => void;
}

export type SimStoreApi = ReturnType<typeof createSimStore>;

/** Slider changes are debounced so a drag does not run the sim 60 times. */
const RECOMPUTE_DEBOUNCE_MS = 120;

export const DEFAULT_EVAL_SEEDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
export const DEFAULT_TRAIN_SEEDS = DEFAULT_EVAL_SEEDS;
export const DEFAULT_TEST_SEEDS = [101, 102, 103, 104, 105, 106, 107, 108, 109, 110];
export const RESPONSE_SCALES = [0.5, 1, 1.5];

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
  direct: () => T | Promise<T>,
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

  function setProgress(store: SimStoreApi, kind: TaskKind, done: number, total: number): void {
    store.setState({ task: { kind, progress: total > 0 ? done / total : null } });
  }

  async function runComparison(store: SimStoreApi): Promise<void> {
    const requestId = ++pending.request;
    const { params, policy } = store.getState();
    store.setState({ loading: true });

    try {
      const [comparison, extras] = await Promise.all([
        withFallback(
          (worker) => worker.compare(params, policy),
          () => comparePolicies(params, policy),
        ),
        withFallback(
          (worker) => worker.tradeoff(params),
          () => buildTradeoff(params),
        ),
      ]);
      // A newer run has already been started — this answer is stale.
      if (requestId !== pending.request) return;
      store.setState({
        comparison,
        extras,
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
    extras: null,
    evalResult: null,
    responseCompare: null,
    sensitivity: null,
    optimizeResult: null,
    loading: true,
    task: null,
    error: null,
    workerActive: true,
    overridesEnabled: false,

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
      set({ policy, overridesEnabled: Boolean(policy.kind === "markdown" && policy.byCategory) });
      scheduleUpdate(api);
    },

    setParam(patch) {
      set({ params: { ...get().params, ...patch } });
      scheduleUpdate(api);
    },

    resetParams() {
      set({ params: { ...DEFAULT_PARAMS, seed: get().seed } });
      scheduleUpdate(api);
    },

    setOverridesEnabled(enabled) {
      const policy = get().policy;
      if (policy.kind !== "markdown") return;
      if (!enabled) {
        set({
          policy: { kind: "markdown", tiers: policy.tiers },
          overridesEnabled: false,
        });
      } else {
        set({ policy: { ...policy, byCategory: policy.byCategory ?? {} }, overridesEnabled: true });
      }
      scheduleUpdate(api);
    },

    setCategoryOverride(category, tiers) {
      const policy = get().policy;
      if (policy.kind !== "markdown") return;
      const byCategory = { ...(policy.byCategory ?? {}) };
      if (tiers === null) delete byCategory[category];
      else byCategory[category] = tiers;
      set({ policy: { ...policy, byCategory }, overridesEnabled: true });
      scheduleUpdate(api);
    },

    async runEvaluation(seeds = DEFAULT_EVAL_SEEDS) {
      const { params, policy } = get();
      set({ task: { kind: "evaluation", progress: null } });
      try {
        const evalResult = await withFallback(
          (worker) => worker.runSeeds(params, seeds, policy),
          () => evaluateSeeds(params, seeds, policy),
        );
        set({ evalResult, task: null, workerActive: usedWorker });
      } catch (error) {
        console.error(error);
        set({ task: null, error: "The multi-seed evaluation could not be run." });
      }
    },

    async runResponseCompare() {
      const { params, policy } = get();
      set({ task: { kind: "response", progress: null } });
      try {
        const rows = await withFallback(
          (worker) =>
            Promise.all(
              RESPONSE_SCALES.map(async (scale) => ({
                scale,
                result: await worker.runSeeds(
                  { ...params, responseScale: scale },
                  DEFAULT_EVAL_SEEDS,
                  policy,
                ),
              })),
            ),
          () =>
            RESPONSE_SCALES.map((scale) => ({
              scale,
              result: evaluateSeeds({ ...params, responseScale: scale }, DEFAULT_EVAL_SEEDS, policy),
            })),
        );
        set({ responseCompare: rows, task: null, workerActive: usedWorker });
      } catch (error) {
        console.error(error);
        set({ task: null, error: "The shopper-response comparison could not be run." });
      }
    },

    async runSensitivity() {
      const { params, policy } = get();
      set({ task: { kind: "sensitivity", progress: null } });
      try {
        const sensitivity = await withFallback(
          (worker) => worker.sensitivity(params, policy, DEFAULT_EVAL_SEEDS),
          () => runSensitivity(params, policy, DEFAULT_EVAL_SEEDS),
        );
        set({ sensitivity, task: null, workerActive: usedWorker });
      } catch (error) {
        console.error(error);
        set({ task: null, error: "The sensitivity sweep could not be run." });
      }
    },

    async runOptimize(options = {}) {
      const { params } = get();
      const trainSeeds = options.trainSeeds ?? DEFAULT_TRAIN_SEEDS;
      const testSeeds = options.testSeeds ?? DEFAULT_TEST_SEEDS;
      const weight = options.weight ?? 0;
      set({ task: { kind: "optimize", progress: 0 } });
      try {
        const optimizeResult = await withFallback(
          (worker) =>
            worker.optimize(params, trainSeeds, testSeeds, weight, (done, total) =>
              setProgress(api, "optimize", done, total),
            ),
          () => optimizeCategories(params, trainSeeds, testSeeds, weight, (done, total) =>
            setProgress(api, "optimize", done, total),
          ),
        );
        set({ optimizeResult, task: null, workerActive: usedWorker });
      } catch (error) {
        console.error(error);
        set({ task: null, error: "The optimiser could not be run." });
      }
    },

    applyOptimized(categories) {
      set({ policy: optimizedPolicy(categories), overridesEnabled: true });
      scheduleUpdate(api);
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
        overridesEnabled: false,
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
