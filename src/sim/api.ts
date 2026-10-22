/**
 * The surface the UI talks to (plans/02 §4).
 *
 * Kept in its own module so the React code can import the *type* without
 * pulling the worker entry point — and its `Comlink.expose` side effect —
 * into the main bundle.
 */

import { comparePolicies, runSeeds, runSim } from "./runner";
import { buildTradeoff } from "./tradeoff";
import { runSensitivity } from "./sensitivity";
import { optimizeCategories } from "./optimizer";

export const api = {
  /** One policy, one seed. */
  run: runSim,
  /** Fixed price against the markdown rule on the same seed — the dashboard's main call. */
  compare: comparePolicies,
  /** The same comparison across a list of seeds. */
  runSeeds,
  /** The blanket point and discount sweep the trade-off chart adds (plans/03 §3). */
  tradeoff: buildTradeoff,
  /** The tornado sweep over assumption ranges (plans/04 §3.2). */
  sensitivity: runSensitivity,
  /** Best discount steps per category, train/test split (plans/04 §2). */
  optimize: optimizeCategories,
};

export type SimWorkerApi = typeof api;
