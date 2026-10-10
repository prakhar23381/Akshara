import { useEffect, useRef, useState } from "react";

export type LadderPhase = "default" | "hesitation" | "hint";

/**
 * The nudge sequence for a child who has stopped answering.
 *
 *   default → (stage 1) hesitation: the wrong options dim
 *           → (stage 2) hint: the right option pulses
 *           → (stage 2 + 12s) rescue: the answer is given for the child
 *
 * The stage timings come from the level config, which now derives them from
 * the child's own response times, so a slow, careful reader is not nudged as
 * early as a quick one.
 *
 * Listen-to-Letter has had this ladder since the start. The two word games had
 * none, so a child who stalled there simply sat on the screen with no help and
 * no way forward. This is the same ladder, extracted so the word games can share
 * it. `IdentifyStep` still runs its own copy, because its ladder is entangled
 * with its slow-audio retry; folding it in is a separate change.
 *
 * `resetKey` restarts the ladder (pass the question index). `active` pauses it
 * (pass false once the child has answered) and returns the phase to default.
 */
export function useHesitationLadder({
  stage1Ms,
  stage2Ms,
  rescueAfterMs = 12000,
  resetKey,
  active,
  onRescue,
}: {
  stage1Ms: number;
  stage2Ms: number;
  rescueAfterMs?: number;
  resetKey: unknown;
  active: boolean;
  onRescue: () => void;
}): LadderPhase {
  const [phase, setPhase] = useState<LadderPhase>("default");
  // The latest callback, so the timers never call a stale closure and a new
  // callback identity does not restart the ladder.
  const rescue = useRef(onRescue);
  rescue.current = onRescue;

  useEffect(() => {
    setPhase("default");
    if (!active) return;
    const t1 = setTimeout(() => setPhase("hesitation"), stage1Ms);
    const t2 = setTimeout(() => setPhase("hint"), stage2Ms);
    const t3 = setTimeout(() => rescue.current(), stage2Ms + rescueAfterMs);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [resetKey, active, stage1Ms, stage2Ms, rescueAfterMs]);

  return phase;
}
