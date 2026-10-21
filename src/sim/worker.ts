/**
 * Worker entry point (plans/02 §4).
 *
 * The simulation runs off the main thread so sliders stay responsive. The
 * API surface is deliberately small and typed; the UI falls back to calling
 * these same functions directly when a Worker cannot be created.
 *
 * `optimizeCategories` and `runSensitivity` arrive with plans/04.
 */

import * as Comlink from "comlink";
import { runSeeds, runSim } from "./runner";

export const api = {
  run: runSim,
  runSeeds,
};

export type SimWorkerApi = typeof api;

// Only expose when we really are inside a worker scope; importing this module
// in Node (tests, or the direct-call fallback) must not throw.
const isWorkerScope =
  typeof globalThis.addEventListener === "function" &&
  typeof (globalThis as { postMessage?: unknown }).postMessage === "function";

if (isWorkerScope) {
  Comlink.expose(api);
}
