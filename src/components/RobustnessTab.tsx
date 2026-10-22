"use client";

/**
 * The robustness tab (plans/03 §6): the judges' "does it hold up?" screen.
 *
 * Three questions, in order of how much they cost us if we are wrong:
 * does the result survive ten seeds, does it survive shoppers responding half
 * as strongly, and which assumption can flip it. All three run in the worker
 * and are kicked off when the tab is opened.
 */

import { useEffect } from "react";
import { useSimStore } from "@/store/useSimStore";
import { EvalCard } from "@/components/EvalCard";
import { ResponseCompare } from "@/components/ResponseCompare";
import { TornadoChart } from "@/components/TornadoChart";

export function RobustnessTab() {
  const evalResult = useSimStore((state) => state.evalResult);
  const responseCompare = useSimStore((state) => state.responseCompare);
  const sensitivity = useSimStore((state) => state.sensitivity);
  const task = useSimStore((state) => state.task);
  const runEvaluation = useSimStore((state) => state.runEvaluation);
  const runResponseCompare = useSimStore((state) => state.runResponseCompare);
  const runSensitivity = useSimStore((state) => state.runSensitivity);

  // Kick the work off the first time the tab is shown; the buttons re-run it.
  useEffect(() => {
    if (task) return;
    if (!evalResult) void runEvaluation();
    if (!responseCompare) void runResponseCompare();
    if (!sensitivity) void runSensitivity();
  }, [evalResult, responseCompare, sensitivity, task, runEvaluation, runResponseCompare, runSensitivity]);

  return (
    <div className="space-y-4">
      <EvalCard
        result={evalResult}
        loading={task?.kind === "evaluation"}
        onRun={() => void runEvaluation()}
      />
      <ResponseCompare
        rows={responseCompare}
        loading={task?.kind === "response"}
        onRun={() => void runResponseCompare()}
      />
      <TornadoChart
        result={sensitivity}
        loading={task?.kind === "sensitivity"}
        onRun={() => void runSensitivity()}
      />
    </div>
  );
}
