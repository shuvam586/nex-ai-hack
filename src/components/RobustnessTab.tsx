"use client";

/**
 * The robustness tab (plans/03 §6): the judges' "does it hold up?" screen.
 *
 
 * Three questions, in order of how much they cost us if we are wrong:
 * does the result survive ten seeds, does it survive shoppers responding half
 * as strongly, and which assumption can flip it. All three run in the worker
 * and are kicked off when the tab is opened.
 */

import { useEffect, useMemo, useState } from "react";
import { DEFAULT_EVAL_SEEDS, useSimStore } from "@/store/useSimStore";
import { EvalCard } from "@/components/EvalCard";
import { ResponseCompare } from "@/components/ResponseCompare";
import { TornadoChart } from "@/components/TornadoChart";

export function RobustnessTab() {
  const seed = useSimStore((state) => state.seed);
  const evalResult = useSimStore((state) => state.evalResult);
  const responseCompare = useSimStore((state) => state.responseCompare);
  const sensitivity = useSimStore((state) => state.sensitivity);
  const task = useSimStore((state) => state.task);
  const runEvaluation = useSimStore((state) => state.runEvaluation);
  const runResponseCompare = useSimStore((state) => state.runResponseCompare);
  const runSensitivity = useSimStore((state) => state.runSensitivity);
  const [evaluationMode, setEvaluationMode] = useState<"benchmark" | "current">("benchmark");

  const evaluationSeeds = useMemo(
    () =>
      evaluationMode === "benchmark"
        ? DEFAULT_EVAL_SEEDS
        : Array.from({ length: 10 }, (_, index) => seed + index),
    [evaluationMode, seed],
  );
  const evaluationKey = evaluationSeeds.join(",");
  const resultKey = evalResult?.seeds.join(",");

  // Run whenever the selected range differs from the result currently shown.
  useEffect(() => {
    if (task) return;
    if (resultKey !== evaluationKey) void runEvaluation(evaluationSeeds);
    if (!responseCompare) void runResponseCompare();
    if (!sensitivity) void runSensitivity();
  }, [
    evaluationKey,
    evaluationSeeds,
    responseCompare,
    resultKey,
    runEvaluation,
    runResponseCompare,
    runSensitivity,
    sensitivity,
    task,
  ]);

  return (
    <div className="space-y-4">
      <EvalCard
        result={evalResult}
        loading={task?.kind === "evaluation"}
        mode={evaluationMode}
        seeds={evaluationSeeds}
        onModeChange={setEvaluationMode}
        onRun={() => void runEvaluation(evaluationSeeds)}
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
