import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PlayLayout } from "../PlayLayout";
import { OptionGrid } from "../../../components/OptionGrid";
import { StepDots } from "../StepDots";
import { useSession } from "../../../contexts/SessionContext";
import { useHesitationLadder } from "../../../hooks/useHesitationLadder";
import { playErrorSound, playSuccessSound } from "../../../utils/soundEffects";
import { makeOptions } from "./IdentifyStep";
import type { StepProps } from "../types";

/** Wrong taps on one question before the answer is shown, as in Listen & tap. */
const FAIL_FORCE = 2;

/**
 * See & match (G3, docs/12 §7): the letter is shown — no sound — and the
 * child finds the same one among its look-alikes.
 *
 * Listen & tap asks the child to hear a sound and find its letter, so a wrong
 * tap there can be a hearing mistake as much as a seeing one: nine look-alike
 * pairs also sound alike (design_guidelines §9, point 2). Here nothing is
 * heard, so a wrong tap is a seeing mistake. Its answers are recorded as
 * `see_match` and shown in the report as their own skill; they never decide a
 * letter's stage (the user's choice, 2026-11-19).
 *
 * The questions are planned (`levelConfig.see_match`): three on the lesson's
 * letter in Find it, six across a pair in a lesson side by side.
 */
export function SeeMatchStep({ letter, levelConfig, onComplete }: StepProps) {
  const { recordAttempt } = useSession();
  const planned = levelConfig.see_match ?? [];
  const questions = useMemo(
    () => planned.map((q) => ({ target: q.target, options: makeOptions(q.target, q.pool, q.confused) })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [levelConfig.see_match],
  );
  const total = questions.length;
  const [index, setIndex] = useState(0);
  const [chosen, setChosen] = useState<string | null>(null);
  const [fails, setFails] = useState(0);
  const [done, setDone] = useState(false);
  const busy = useRef(false);
  const shownAt = useRef(performance.now());
  const q = questions[index];

  useEffect(() => {
    if (total === 0) onComplete();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total]);

  const advance = useCallback(() => {
    if (index < total - 1) {
      setIndex((i) => i + 1);
      setChosen(null);
      setFails(0);
      setDone(false);
      busy.current = false;
      shownAt.current = performance.now();
    } else onComplete();
  }, [index, total, onComplete]);

  const log = useCallback(
    (selected: string, guided: boolean) =>
      recordAttempt("see_match", {
        target_letter: q.target,
        selected_letter: selected,
        module_type: "similar",
        time_to_interact_ms: guided ? 0 : Math.max(0, Math.round(performance.now() - shownAt.current)),
        was_guided_win: guided,
        hover_duration_ms: 0,
        jitter_count: 0,
        q: index,
      }),
    [q, index, recordAttempt],
  );

  const supply = useCallback(() => {
    if (!q) return;
    busy.current = true;
    log(q.target, true);
    setChosen(q.target);
    setDone(true);
    playSuccessSound();
    setTimeout(advance, 1200);
  }, [q, log, advance]);

  function pick(option: string) {
    if (busy.current || done || !q) return;
    busy.current = true;
    log(option, false);
    setChosen(option);
    if (option === q.target) {
      setDone(true);
      playSuccessSound();
      setTimeout(advance, 1000);
      return;
    }
    playErrorSound();
    const next = fails + 1;
    setFails(next);
    setTimeout(() => {
      if (next >= FAIL_FORCE) supply();
      else {
        setChosen(null);
        busy.current = false;
        shownAt.current = performance.now();
      }
    }, 1200);
  }

  const phase = useHesitationLadder({
    stage1Ms: levelConfig.hesitation_trigger_stage1_ms,
    stage2Ms: levelConfig.hesitation_trigger_stage2_ms,
    resetKey: `${index}:${fails}`,
    active: !done && Boolean(q),
    onRescue: () => {
      if (!busy.current) supply();
    },
  });

  if (!q) return null;

  return (
    <PlayLayout centerBody={false}>
      <StepDots total={total} current={index} />
      <h1 className="shrink-0 t-1 font-bold text-gray-800 text-center">Find the same letter 👀</h1>

      <div className="shrink-0 flex justify-center">
        <span
          className="letter-glyph font-black text-gray-800 bg-white border-4 border-[#4A90E2] grid place-items-center select-none"
          style={{
            fontSize: "clamp(2.6rem, 14vmin, 5rem)",
            width: "clamp(5rem, 26vmin, 9rem)",
            height: "clamp(5rem, 26vmin, 9rem)",
            borderRadius: "var(--card-radius)",
          }}
          aria-label={`The letter ${q.target}`}
        >
          {q.target}
        </span>
      </div>

      <OptionGrid
        items={q.options}
        keyOf={(o) => o}
        render={(option) => {
          const isAnswer = option === q.target;
          const dimmed = !done && phase !== "default" && !isAnswer;
          const state = done
            ? isAnswer
              ? "bg-[#4CAF50] border-[#4CAF50] text-white"
              : "bg-white border-gray-300 opacity-40"
            : option === chosen
              ? "bg-white border-[#E76F51]"
              : phase === "hint" && isAnswer
                ? "bg-[#FFD166] border-[#FFD166] animate-pulse"
                : dimmed
                  ? "bg-white border-gray-300 opacity-30"
                  : "bg-white border-gray-300";
          return (
            <button
              onClick={() => pick(option)}
              disabled={done || dimmed}
              className={`w-full h-full flex items-center justify-center border-4 transition-all min-h-0 ${state}`}
              style={{ borderRadius: "var(--card-radius)" }}
            >
              <span className="letter-glyph tile-glyph font-bold">{option}</span>
            </button>
          );
        }}
      />
    </PlayLayout>
  );
}
