import { useEffect, useRef } from "react";
import { PlayLayout } from "../PlayLayout";
import { AudioButton } from "../../../components/AudioButton";
import { LetterDisplay } from "../../../components/LetterDisplay";
import { useLetterAudio } from "../../../hooks/useLetterAudio";
import type { StepProps } from "../types";

const DWELL_MS = 3000;

export function IntroStep({ letter, onComplete }: StepProps) {
  const { play } = useLetterAudio(letter);
  const startedAt = useRef(Date.now());
  const done = useRef(false);

  useEffect(() => {
    play();
    const timer = setTimeout(() => {
      if (done.current) return;
      done.current = true;
      // Record that it was seen, and for how long, so "shown" is
      // distinguishable from "skipped" in the report.
      onComplete({ kind: "viewed", dwell_ms: Date.now() - startedAt.current });
    }, DWELL_MS);
    return () => clearTimeout(timer);
  }, [play, onComplete]);

  return (
    <PlayLayout>
      <h1 className="t-2 font-bold text-gray-800 tracking-wide shrink-0">
        Meet the letter
      </h1>
      <div className="flex-1 min-h-0 flex items-center justify-center">
        <LetterDisplay letter={letter} animated />
      </div>
      {/* This autoplays and then moves on. Before, the only audio affordance
          was the caption below — not a control — so a child who missed the
          sound, or whose browser blocked autoplay, had no way to hear it. */}
      <AudioButton onPlay={play} />
    </PlayLayout>
  );
}
