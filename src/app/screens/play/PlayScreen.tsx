import { useEffect, useRef, type ReactElement } from "react";
import { useNavigate } from "react-router";
import { useSession } from "../../contexts/SessionContext";
import type { ActivityType } from "../../types/session";
import type { StepProps } from "./types";

import { IntroStep } from "./steps/IntroStep";
import { PronunciationStep } from "./steps/PronunciationStep";
import { ExampleWordsStep } from "./steps/ExampleWordsStep";
import { MatraStep } from "./steps/MatraStep";
import { TracingStep } from "./steps/TracingStep";
import { MemoryStep } from "./steps/MemoryStep";
import { IdentifyStep } from "./steps/IdentifyStep";
import { WordFillStep } from "./steps/WordFillStep";
import { WordSpellingStep } from "./steps/WordSpellingStep";
import { RewardStep } from "./steps/RewardStep";

// `null` is allowed: a step with nothing to show (a letter with no usable
// words) completes itself and renders nothing for the frame before it moves on.
const STEPS: Record<ActivityType, (p: StepProps) => ReactElement | null> = {
  intro: IntroStep,
  pronunciation: PronunciationStep,
  example_words: ExampleWordsStep,
  matras: MatraStep,
  tracing: TracingStep,
  memory: MemoryStep,
  identify: IdentifyStep,
  word_fill: WordFillStep,
  word_spelling: WordSpellingStep,
};

/**
 * The whole play-through, at one URL.
 *
 * Previously this was nine routes, each hardcoding the next with a navigate()
 * call, and all of the state that made them coherent lived in unpersisted React
 * context — so a refresh on /game reset the letter to म while the roadmap still
 * believed the child was on क, and the browser Back button stepped backwards
 * through an assessment.
 *
 * Now the step is derived from the session: it is the first activity not yet
 * completed. A refresh rehydrates the session from storage and lands on the
 * same step.
 */
export function PlayScreen() {
  const navigate = useNavigate();
  const { session, currentStep, beginActivity, completeActivity } = useSession();
  const booted = useRef(false);

  // Give the provider one tick to rehydrate an active session before deciding
  // there is nothing to play.
  useEffect(() => {
    if (session) {
      booted.current = true;
      return;
    }
    const t = setTimeout(() => {
      if (!booted.current) navigate("/roadmap", { replace: true });
    }, 250);
    return () => clearTimeout(t);
  }, [session, navigate]);

  useEffect(() => {
    if (session && currentStep) beginActivity(currentStep);
  }, [session, currentStep, beginActivity]);

  if (!session) return null;

  // Every activity done — close the session and celebrate.
  if (currentStep === null) {
    return <RewardStep />;
  }

  const Step = STEPS[currentStep];
  return (
    <Step
      letter={session.letter}
      levelConfig={session.level_config}
      onComplete={(outcome) => completeActivity(currentStep, outcome)}
    />
  );
}
