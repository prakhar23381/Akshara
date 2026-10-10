import { useCallback, useMemo, useRef, useState } from "react";
import { AudioButton } from "../../../components/AudioButton";
import { PlayLayout } from "../PlayLayout";
import { OptionGrid } from "../../../components/OptionGrid";
import { StepDots } from "../StepDots";
import { useSession } from "../../../contexts/SessionContext";
import { speakHindi } from "../../../utils/speech";
import { playSuccessSound, playErrorSound } from "../../../utils/soundEffects";
import { useHesitationLadder } from "../../../hooks/useHesitationLadder";
import { buildSpellingQuestions, QUESTIONS_PER_ROUND } from "./wordQuestions";
import type { StepProps } from "../types";

export function WordSpellingStep({ letter, levelConfig, onComplete }: StepProps) {
  const { recordAttempt } = useSession();
  // Misspellings are built by swapping in the letters this child actually
  // confuses with the target, so the wrong spellings are their wrong spellings.
  const questions = useMemo(
    () =>
      buildSpellingQuestions(letter, [
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
  const total = Math.min(questions.length, QUESTIONS_PER_ROUND);

  const advance = useCallback(() => {
    if (index < total - 1) {
      setIndex((i) => i + 1);
      setChosen(null);
      setLocked(false);
      shownAt.current = performance.now();
    } else {
      onComplete();
    }
  }, [index, total, onComplete]);

  function pick(option: string) {
    if (locked || !q) return;
    setChosen(option);
    setLocked(true);

    // The spelling differs from the answer by exactly one confusable letter,
    // so the attempt is recorded at letter level: which letter was accepted in
    // place of the target.
    const differingIndex = [...q.answer].findIndex(
      (c, i) => c !== [...option][i],
    );
    recordAttempt("word_spelling", {
      target_letter: letter,
      selected_letter:
        option === q.answer ? letter : [...option][differingIndex] ?? option,
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
    recordAttempt("word_spelling", {
      target_letter: letter,
      selected_letter: letter,
      module_type: "similar",
      time_to_interact_ms: 0,
      was_guided_win: true,
      hover_duration_ms: 0,
      jitter_count: 0,
    });
    playSuccessSound();
    setTimeout(advance, 1200);
  }, [locked, q, letter, recordAttempt, advance]);

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

  return (
    <PlayLayout centerBody={false}>
      <StepDots total={total} current={index} />

      <h1 className="shrink-0 t-1 font-bold text-gray-800 text-center">
        Which spelling is correct?
      </h1>

      <div className="shrink-0 flex items-center justify-center gap-3 flex-wrap">
        <span className="t-3 leading-none">{q.image}</span>
        <AudioButton onPlay={() => speakHindi(q.answer)} />
        <span className="t--1 text-gray-500 tracking-wide">{q.meaning}</span>
      </div>

      {/* Row shape: the options are whole words, so they need width, not a
          square tile. Four stacked full-width buttons used to overflow the
          bottom of the screen; the grid now divides the space it is given. */}
      <OptionGrid
        shape="row"
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
              className={`w-full h-full flex items-center justify-center border-4 transition-all min-h-0 px-3 ${state}`}
              style={{ borderRadius: "var(--card-radius)" }}
            >
              <span
                className="letter-glyph font-bold tracking-wide truncate"
                style={{ fontSize: "clamp(1rem, 4.5vmin, 1.9rem)" }}
              >
                {option}
              </span>
            </button>
          );
        }}
      />
    </PlayLayout>
  );
}
