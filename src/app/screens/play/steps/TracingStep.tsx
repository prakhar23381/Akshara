import { useRef, useState } from "react";
import { PlayLayout } from "../PlayLayout";
import { AksharaButton } from "../../../components/AksharaButton";
import { TracingCanvas } from "../../../components/TracingCanvas";
import { ACTIVE_TRACING_MODEL } from "../../../utils/tracingEvaluator";
import type { StepProps } from "../types";

export function TracingStep({ letter, onComplete }: StepProps) {
  const [best, setBest] = useState<{ score: number; passed: boolean } | null>(null);
  const tries = useRef(0);

  return (
    <PlayLayout
      centerBody={false}
      footer={
        <AksharaButton
          fullWidth
          disabled={!best?.passed}
          onClick={() =>
            onComplete({
              kind: "tracing",
              // The score used to be handed to the screen and dropped on the
              // floor; only the pass/fail reached the UI and nothing reached
              // the report.
              score: best?.score ?? 0,
              passed: best?.passed ?? false,
              tries: tries.current,
              model: ACTIVE_TRACING_MODEL,
            })
          }
        >
          Next
        </AksharaButton>
      }
    >
      <div className="shrink-0 text-center">
        <h1 className="t-2 font-bold text-gray-800 tracking-wide">
          Trace “{letter}”
        </h1>
        <p className="t--1 text-gray-500">Follow the guide path ✨</p>
      </div>

      <TracingCanvas
        letter={letter}
        onComplete={(score, success) => {
          tries.current += 1;
          setBest((prev) =>
            !prev || score > prev.score ? { score, passed: success } : prev,
          );
        }}
        onClear={() => setBest(null)}
      />
    </PlayLayout>
  );
}
