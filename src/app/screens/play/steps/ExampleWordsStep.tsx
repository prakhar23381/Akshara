import { useRef } from "react";
import { PlayLayout } from "../PlayLayout";
import { AksharaButton } from "../../../components/AksharaButton";
import { getLetterContent } from "../../../data/letterContent";
import { speakHindi } from "../../../utils/speech";
import type { StepProps } from "../types";

export function ExampleWordsStep({ letter, onComplete }: StepProps) {
  const { exampleWords } = getLetterContent(letter);
  const startedAt = useRef(Date.now());

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
      <h1 className="t-2 font-bold text-gray-800 tracking-wide text-center shrink-0">
        Words with “{letter}”
      </h1>

      <div
        className="flex-1 min-h-0 w-full grid content-center"
        style={{
          gap: "var(--gap-screen)",
          gridTemplateColumns: `repeat(${Math.min(exampleWords.length, 3)}, minmax(0, 1fr))`,
          gridAutoRows: "minmax(0, 1fr)",
          maxWidth: "min(48rem, 100%)",
          justifySelf: "center",
        }}
      >
        {exampleWords.map((item) => (
          <button
            key={item.word}
            onClick={() => speakHindi(item.word)}
            className="bg-white border-4 border-gray-300 flex flex-col items-center justify-center min-h-0 min-w-0 hover:shadow-xl transition-all"
            style={{
              borderRadius: "var(--card-radius)",
              padding: "calc(var(--pad-screen) / 1.5)",
              gap: "calc(var(--gap-screen) / 2)",
            }}
          >
            <span className="t-3 leading-none">{item.image}</span>
            <span className="letter-glyph t-1 font-bold text-gray-800 tracking-wider">
              {item.word}
            </span>
            <span className="t--1 text-gray-500">{item.meaning}</span>
          </button>
        ))}
      </div>
    </PlayLayout>
  );
}
