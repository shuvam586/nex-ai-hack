/**
 * The surface the UI talks to (plans/02 §4).
 *
 * Kept in its own module so the React code can import the *type* without
 * pulling the worker entry point — and its `Comlink.expose` side effect —
 * into the main bundle.
 */

import { comparePolicies, runSeeds, runSim } from "./runner";

export const api = {
  /** One policy, one seed. */
  run: runSim,
  /** Fixed price against the markdown rule on the same seed — the dashboard's main call. */
  compare: comparePolicies,
  /** The same comparison across a list of seeds. */
  runSeeds,
};

export type SimWorkerApi = typeof api;
