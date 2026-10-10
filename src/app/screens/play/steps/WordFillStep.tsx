import { useCallback, useMemo, useRef, useState } from "react";
import { AudioButton } from "../../../components/AudioButton";
import { PlayLayout } from "../PlayLayout";
import { OptionGrid } from "../../../components/OptionGrid";
import { StepDots } from "../StepDots";
import { useSession } from "../../../contexts/SessionContext";
import { speakHindi } from "../../../utils/speech";
import { playSuccessSound, playErrorSound } from "../../../utils/soundEffects";
import { useHesitationLadder } from "../../../hooks/useHesitationLadder";
import { buildFillQuestions, QUESTIONS_PER_ROUND } from "./wordQuestions";
import type { StepProps } from "../types";

export function WordFillStep({ letter, levelConfig, onComplete }: StepProps) {
  const { recordAttempt } = useSession();
  // The child's own confusions lead, so the wrong options are the letters this
  // child actually mixes up with this one rather than a fixed list.
  const questions = useMemo(
    () =>
      buildFillQuestions(letter, [
        ...(levelConfig.confused_letters ?? []),
        ...levelConfig.distractor_pool,
      ]),
    [letter, levelConfig.confused_letters, levelConfig.distractor_pool],
  );
  const [index, setIndex] = useState(0);
  const [chosen, setChosen] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);
  const shownAt = useRef(performance.now());

  const q = questions[index];

  const advance = useCallback(() => {
    if (index < Math.min(questions.length, QUESTIONS_PER_ROUND) - 1) {
      setIndex((i) => i + 1);
      setChosen(null);
      setLocked(false);
      shownAt.current = performance.now();
    } else {
      onComplete();
    }
  }, [index, questions.length, onComplete]);

  function pick(option: string) {
    if (locked || !q) return;
    setChosen(option);
    setLocked(true);

    // These games use confusable distractors, so they measure fine feature
    // discrimination, not gross shape recognition.
    recordAttempt("word_fill", {
      target_letter: q.answer,
      selected_letter: option,
      module_type: "similar",
      time_to_interact_ms: Math.max(0, Math.round(performance.now() - shownAt.current)),
      was_guided_win: false,
      hover_duration_ms: 0,
      jitter_count: 0,
    });

    if (option === q.answer) playSuccessSound();
    else playErrorSound();
    setTimeout(advance, option === q.answer ? 900 : 1400);
  }

  // Stalled? Dim, then hint, then answer for the child — the same ladder
  // Listen-to-Letter uses. Without it a child who froze here had no way on.
  const rescue = useCallback(() => {
    if (locked || !q) return;
    setChosen(q.answer);
    setLocked(true);
    recordAttempt("word_fill", {
      target_letter: q.answer,
      selected_letter: q.answer,
      module_type: "similar",
      time_to_interact_ms: 0,
      was_guided_win: true,
      hover_duration_ms: 0,
      jitter_count: 0,
    });
    playSuccessSound();
    setTimeout(advance, 1200);
  }, [locked, q, recordAttempt, advance]);

  const phase = useHesitationLadder({
    stage1Ms: levelConfig.hesitation_trigger_stage1_ms,
    stage2Ms: levelConfig.hesitation_trigger_stage2_ms,
    resetKey: index,
    active: !locked && Boolean(q),
    onRescue: rescue,
  });

  if (!q) {
    return (
      <PlayLayout>
        <p className="t-0 text-gray-500">No words available for this letter.</p>
      </PlayLayout>
    );
  }

  const chars = [...q.word];

  return (
    <PlayLayout centerBody={false}>
      <StepDots total={Math.min(questions.length, QUESTIONS_PER_ROUND)} current={index} />

      <h1 className="shrink-0 t-1 font-bold text-gray-800 text-center">
        Fill in the missing letter ✏️
      </h1>

      <div className="flex-1 min-h-0 w-full flex flex-col items-center justify-center" style={{ gap: "var(--gap-screen)" }}>
        <span className="t-3 leading-none">{q.image}</span>
        {/* The speaker and the meaning were one control, so the icon looked
            like decoration on a label. Split: one tappable thing, one caption. */}
        <div className="shrink-0 flex items-center justify-center gap-2 flex-wrap">
          <AudioButton onPlay={() => speakHindi(q.word)} />
          <span className="t--1 text-gray-500 tracking-wide">{q.meaning}</span>
        </div>
        <p className="letter-glyph t-3 font-bold text-gray-800 tracking-wide">
          {chars.map((c, i) =>
            i === q.blankIndex ? (
              <span key={i} className="text-[#4A90E2]">
                {chosen ?? "?"}
              </span>
            ) : (
              <span key={i}>{c}</span>
            ),
          )}
        </p>
      </div>

      <OptionGrid
        items={q.options}
        keyOf={(o) => o}
        render={(option) => {
          const isAnswer = option === q.answer;
          const dimmed = !locked && phase !== "default" && !isAnswer;
          const state = !locked
            ? phase === "hint" && isAnswer
              ? "bg-[#FFD166] border-[#FFD166] animate-pulse"
              : dimmed
                ? "bg-white border-gray-300 opacity-30"
                : "bg-white border-gray-300"
            : option === chosen
              ? isAnswer
                ? "bg-[#4CAF50] border-[#4CAF50] text-white"
                : "bg-white border-[#E76F51]"
              : isAnswer
                ? "bg-[#4CAF50]/20 border-[#4CAF50]"
                : "bg-white border-gray-300 opacity-40";
          return (
            <button
              onClick={() => pick(option)}
              disabled={locked || dimmed}
              className={`w-full h-full flex items-center justify-center border-4 transition-all min-h-0 ${state}`}
              style={{ borderRadius: "var(--card-radius)" }}
            >
              <span className="letter-glyph font-black" style={{ fontSize: "clamp(1.25rem, 6vmin, 2.5rem)" }}>
                {option}
              </span>
            </button>
          );
        }}
      />
    </PlayLayout>
  );
}
