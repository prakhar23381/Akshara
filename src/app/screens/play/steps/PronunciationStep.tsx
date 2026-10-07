import { useEffect, useRef } from "react";
import { AudioButton } from "../../../components/AudioButton";
import { PlayLayout } from "../PlayLayout";
import { AksharaButton } from "../../../components/AksharaButton";
import { getLetterContent } from "../../../data/letterContent";
import { useLetterAudio } from "../../../hooks/useLetterAudio";
import type { StepProps } from "../types";

/**
 * Layout note: this used to place a fixed 192px card beside a fixed 256px card
 * in a non-wrapping flex row — 448px of content on a 375px screen, so both
 * cards hung off the edges. The letter and the hint now share one card that
 * sizes itself from the space available.
 */
export function PronunciationStep({ letter, onComplete }: StepProps) {
  const content = getLetterContent(letter);
  const { play } = useLetterAudio(letter);
  const startedAt = useRef(Date.now());

  useEffect(() => {
    play();
  }, [play]);

  return (
    <PlayLayout
      footer={
        <AksharaButton
          fullWidth
          onClick={() =>
            onComplete({
              kind: "viewed",
              dwell_ms: Date.now() - startedAt.current,
            })
          }
        >
          Next
        </AksharaButton>
      }
    >
      <h1 className="t-2 font-bold text-gray-800 tracking-wide shrink-0">
        How to say it
      </h1>

      <div className="flex-1 min-h-0 w-full flex items-center justify-center">
        <div
          className="bg-white border-4 border-gray-300 shadow-lg flex flex-col items-center justify-center w-full h-full"
          style={{
            borderRadius: "var(--card-radius)",
            maxWidth: "min(32rem, 100%)",
            gap: "var(--gap-screen)",
            padding: "var(--pad-screen)",
          }}
        >
          <span className="letter-glyph glyph-lg font-bold text-gray-800">
            {letter}
          </span>
          <div className="flex items-center gap-3 min-w-0">
            <span className="t-2 shrink-0">{content.mouthEmoji}</span>
            <p className="t-0 text-gray-600 tracking-wide leading-snug min-w-0">
              {content.pronunciationHint}
            </p>
          </div>
        </div>
      </div>

      <AudioButton onPlay={play} size="lg" />
    </PlayLayout>
  );
}
