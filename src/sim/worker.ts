/**
 * Worker entry point (plans/02 §4).
 *
 * The simulation runs off the main thread so sliders stay responsive. The API
 * surface is deliberately small and typed; the UI falls back to calling the
 * same functions directly when a Worker cannot be created.
 *
 * `optimizeCategories` and `runSensitivity` arrive with plans/04.
 */

import * as Comlink from "comlink";
import { api } from "./api";

export type { SimWorkerApi } from "./api";

/**
 * Only expose inside a real worker.
 *
 * `postMessage` alone is not enough to tell: a browser window has it too,
 * and exposing there would attach a Comlink listener to the window itself.
 * `WorkerGlobalScope` only exists inside a worker.
 */
const isWorkerScope =
  typeof (globalThis as { WorkerGlobalScope?: unknown }).WorkerGlobalScope !== "undefined";

if (isWorkerScope) {
  Comlink.expose(api);
}
