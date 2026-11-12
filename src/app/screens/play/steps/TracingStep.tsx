import { useRef, useState } from "react";
import { PlayLayout } from "../PlayLayout";
import { AksharaButton } from "../../../components/AksharaButton";
import { TracingCanvas } from "../../../components/TracingCanvas";
import { ACTIVE_TRACING_MODEL } from "../../../utils/tracingEvaluator";
import type { StepProps } from "../types";

/**
 * Tries after which the child may move on without a passing trace (TODO E4).
 * Next used to stay locked until a trace passed, with no limit — a child who
 * could not reach the pass mark was held on this screen for good, and since G1
 * every letter's first lesson has it. Moving on this way is recorded as not
 * passed, with the best score reached.
 */
export const TRIES_BEFORE_MOVING_ON = 3;

export function TracingStep({ letter, onComplete }: StepProps) {
  const [best, setBest] = useState<{ score: number; passed: boolean } | null>(null);
  // State as well as a ref: the button has to redraw on the try that unlocks it,
  // and a try that does not beat the best one changes nothing else on screen.
  const tries = useRef(0);
  const [tried, setTried] = useState(0);

  return (
    <PlayLayout
      centerBody={false}
      footer={
        <AksharaButton
          fullWidth
          disabled={!best?.passed && tried < TRIES_BEFORE_MOVING_ON}
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
          setTried(tries.current);
          setBest((prev) =>
            !prev || score > prev.score ? { score, passed: success } : prev,
          );
        }}
        onClear={() => setBest(null)}
      />
    </PlayLayout>
  );
}
