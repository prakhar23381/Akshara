import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AudioButton } from "../../../components/AudioButton";
import { PlayLayout } from "../PlayLayout";
import { OptionGrid } from "../../../components/OptionGrid";
import { StepDots } from "../StepDots";
import { useSession } from "../../../contexts/SessionContext";
import { useLetterAudio } from "../../../hooks/useLetterAudio";
import { FEATURE_HIGHLIGHT_POSITIONS } from "../../../types/levelConfig";
import type { ModuleType } from "../../../types/levelConfig";
import {
  playSuccessSound,
  playErrorSound,
  playEncouragementSound,
} from "../../../utils/soundEffects";
import type { StepProps } from "../types";

type Phase = "default" | "hesitation" | "hint" | "wrong" | "correct";

const QUESTIONS = 5;
const FAIL_FORCE = 2;

/**
 * One question's options: the target and three distractors.
 *
 * The child's own confusions are always among them. This used to shuffle the
 * whole pool and take three, so a letter the child keeps mistaking for the
 * target was left out of a question by chance. Only the remaining slots are
 * random, which keeps the five questions varied.
 */
function makeOptions(target: string, pool: string[], confused: string[] = []): string[] {
  const personal = confused.filter((l) => l !== target && pool.includes(l));
  const rest = pool.filter((l) => l !== target && !personal.includes(l));
  for (let i = rest.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [rest[i], rest[j]] = [rest[j], rest[i]];
  }
  const opts = [target, ...[...personal, ...rest].slice(0, 3)];
  for (let i = opts.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [opts[i], opts[j]] = [opts[j], opts[i]];
  }
  return opts;
}

export function IdentifyStep({ letter, levelConfig, onComplete }: StepProps) {
  const { recordAttempt } = useSession();
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("default");
  const [chosen, setChosen] = useState<string | null>(null);
  const [fails, setFails] = useState(0);
  const [slow, setSlow] = useState(false);

  const answeredAt = useRef<number | null>(null);
  const phaseRef = useRef<Phase>("default");
  phaseRef.current = phase;

  const markAudioEnd = useCallback(() => {
    answeredAt.current = performance.now();
  }, []);
  const { play } = useLetterAudio(letter, slow, markAudioEnd);

  const questions = useMemo(
    () =>
      Array.from({ length: QUESTIONS }, () =>
        makeOptions(letter, levelConfig.distractor_pool, levelConfig.confused_letters),
      ),
    [letter, levelConfig.distractor_pool, levelConfig.confused_letters],
  );
  const options = questions[index] ?? [];

  const moduleType: ModuleType =
    levelConfig.distractor_similarity === "low"
      ? "dissimilar"
      : levelConfig.visual_aid_intensity === "none"
        ? "similar"
        : "scaffold";

  useEffect(() => {
    play();
  }, [index, play]);
  useEffect(() => {
    if (slow) play();
  }, [slow, play]);

  const advance = useCallback(() => {
    if (index < QUESTIONS - 1) {
      setIndex((i) => i + 1);
      setPhase("default");
      setChosen(null);
      setFails(0);
      setSlow(false);
    } else {
      onComplete();
    }
  }, [index, onComplete]);

  const log = useCallback(
    (selected: string, guided: boolean) => {
      const latency =
        answeredAt.current != null
          ? Math.max(0, Math.round(performance.now() - answeredAt.current))
          : 0;
      recordAttempt("identify", {
        target_letter: letter,
        selected_letter: selected,
        module_type: moduleType,
        time_to_interact_ms: guided ? 0 : latency,
        was_guided_win: guided,
        hover_duration_ms: 0,
        jitter_count: 0,
      });
      answeredAt.current = null;
    },
    [letter, moduleType, recordAttempt],
  );

  // The hesitation ladder: dim, then pulse, then answer for the child so a
  // session can never dead-end.
  useEffect(() => {
    const s1 = levelConfig.hesitation_trigger_stage1_ms;
    const s2 = levelConfig.hesitation_trigger_stage2_ms;
    const t1 = setTimeout(() => {
      if (phaseRef.current === "default") setPhase("hesitation");
    }, s1);
    const t2 = setTimeout(() => {
      if (phaseRef.current === "hesitation") setPhase("hint");
    }, s2);
    const t3 = setTimeout(() => {
      if (phaseRef.current !== "hint") return;
      log(letter, true);
      setPhase("correct");
      playSuccessSound();
      setTimeout(advance, 1200);
    }, s2 + 12000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [index, levelConfig, letter, log, advance]);

  function pick(option: string) {
    if (phase === "correct" || phase === "wrong") return;
    setChosen(option);
    log(option, false);

    if (option === letter) {
      setPhase("correct");
      playSuccessSound();
      setTimeout(advance, 1200);
      return;
    }

    const next = fails + 1;
    setFails(next);
    setPhase("wrong");
    playErrorSound();

    setTimeout(() => {
      if (next >= FAIL_FORCE) {
        log(letter, true);
        setPhase("correct");
        playSuccessSound();
        setTimeout(advance, 1200);
      } else {
        setSlow(true);
        setPhase("hint");
        setChosen(null);
        playEncouragementSound();
      }
    }, 1400);
  }

  const assessment = levelConfig.cognitive_state === "insufficient_data";
  const proactive = !assessment && levelConfig.visual_aid_intensity === "animated";
  const hinting = phase === "hint" || phase === "hesitation";
  const showDot = !assessment && (proactive || hinting);
  const feature = levelConfig.feature_to_highlight
    ? FEATURE_HIGHLIGHT_POSITIONS[levelConfig.feature_to_highlight]
    : null;

  function stateOf(option: string) {
    if (phase === "correct" && option === letter) return "correct";
    if (phase === "wrong" && option === chosen) return "wrong";
    if (phase === "hint" && option === letter) return "hint";
    if (phase === "hesitation" && option !== letter) return "dimmed";
    if (fails >= FAIL_FORCE && option !== letter) return "dimmed";
    return "default";
  }

  const tileStyle: Record<string, string> = {
    default: "bg-white border-gray-300",
    correct: "bg-[#4CAF50] border-[#4CAF50] text-white",
    wrong: "bg-white border-[#E76F51]",
    hint: "bg-[#FFD166] border-[#FFD166] animate-pulse",
    dimmed: "bg-white border-gray-300 opacity-30",
  };

  return (
    <PlayLayout centerBody={false}>
      <StepDots total={QUESTIONS} current={index} />

      {/* Every other activity names itself; this one only had the instruction
          caption, so it was the one screen with no title. */}
      <h1 className="shrink-0 t-1 font-bold text-gray-800 text-center">
        Listen to the letter 👂
      </h1>

      {/* The replay deliberately carries no "0.8x speed" badge. Slowing the
          audio is a scaffold for the child, not a status for them to read: it
          labelled the child as needing help, in words a struggling reader
          cannot read anyway. `slow` still drives the playback rate. */}
      <div className="shrink-0 flex flex-col items-center gap-1">
        <AudioButton onPlay={play} size="lg" />
        <p className="t-0 text-gray-500 tracking-wide">Tap the letter you heard 👆</p>
      </div>

      <OptionGrid
        items={options}
        keyOf={(o) => o}
        render={(option) => (
          <button
            onClick={() => pick(option)}
            disabled={stateOf(option) === "dimmed"}
            className={`relative w-full h-full flex items-center justify-center border-4 transition-all min-h-0 ${tileStyle[stateOf(option)]}`}
            style={{ borderRadius: "var(--card-radius)" }}
          >
            <span
              className="letter-glyph font-bold"
              style={{ fontSize: "clamp(1.5rem, 7vmin, 3rem)" }}
            >
              {option}
            </span>

            {/* The guiding dot. The percentages mark a point on the glyph, so
                the dot must be centred on that point — previously it was
                positioned by its top-left corner, which put it off by half its
                own size plus the card padding. */}
            {option === letter && feature && showDot && (
              <span
                aria-hidden
                className="absolute rounded-full bg-amber-400 pointer-events-none"
                style={{
                  ...feature,
                  width: "clamp(0.6rem, 2.2vmin, 1.1rem)",
                  height: "clamp(0.6rem, 2.2vmin, 1.1rem)",
                  transform: "translate(-50%, -50%)",
                  opacity: hinting ? 1 : levelConfig.scaffold_intensity,
                  animation:
                    proactive || hinting ? "breathe 2s ease-in-out infinite" : "none",
                }}
              />
            )}
          </button>
        )}
      />

      <style>{`
        @keyframes breathe {
          0%, 100% { transform: translate(-50%, -50%) scale(1); }
          50%      { transform: translate(-50%, -50%) scale(1.18); }
        }
      `}</style>
    </PlayLayout>
  );
}
