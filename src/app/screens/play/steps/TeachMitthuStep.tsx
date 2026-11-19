import { useCallback, useEffect, useRef, useState } from "react";
import { PlayLayout } from "../PlayLayout";
import { StepDots } from "../StepDots";
import { AudioButton } from "../../../components/AudioButton";
import { Mitthu, type Pose } from "../../../components/Mitthu";
import { useSession } from "../../../contexts/SessionContext";
import { useHesitationLadder } from "../../../hooks/useHesitationLadder";
import { useLetterAudio } from "../../../hooks/useLetterAudio";
import { playErrorSound, playSuccessSound } from "../../../utils/soundEffects";
import type { StepProps } from "../types";
import { SuccessSheet } from "../SuccessSheet";


type Said = "yes" | "no";

/**
 * Teach Mitthu (G3, docs/12 §7): the child hears a letter, Mitthu says which
 * letter he thinks it is, and the child says whether he is right.
 *
 * The child judges instead of being judged — the protégé effect (Chase et
 * al., 2009): children try harder for a character they are teaching and are
 * readier to look at a mistake that is his. It shows a wrong pairing on
 * purpose, which sits uneasily with errorless learning, so it is used only in
 * a lesson side by side on a pair that sounds alike, once both letters are
 * complete (plan question E5's default).
 *
 * Recorded as `teach_mitthu` against the letter heard: a right judgement is a
 * right answer; a wrong one is a pick of the pair's other letter — exactly the
 * mix-up it shows. Never decides a stage.
 */
export function TeachMitthuStep({ levelConfig, onComplete }: StepProps) {
  const { recordAttempt } = useSession();
  const items = levelConfig.mitthu ?? [];
  const pair = levelConfig.focus ?? [];
  const [index, setIndex] = useState(0);
  const [said, setSaid] = useState<Said | null>(null);
  const [helped, setHelped] = useState(false);
  const [sheet, setSheet] = useState(false);
  const busy = useRef(false);
  const heardAt = useRef<number | null>(null);
  const item = items[index];
  const other = (t: string) => pair.find((l) => l !== t) ?? t;
  const mitthuRight = item ? item.shown === item.target : false;
  const childRight = said !== null && (said === "yes") === mitthuRight;

  const { play } = useLetterAudio(
    item?.target ?? "",
    false,
    useCallback(() => {
      heardAt.current = performance.now();
    }, []),
  );

  useEffect(() => {
    if (items.length === 0) onComplete();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length]);
  useEffect(() => {
    if (item) play();
  }, [index, item, play]);

  const advance = useCallback(() => {
    if (index < items.length - 1) {
      setIndex((i) => i + 1);
      setSaid(null);
      setHelped(false);
      busy.current = false;
      heardAt.current = null;
    } else onComplete();
  }, [index, items.length, onComplete]);

  const log = useCallback(
    (right: boolean, guided: boolean) => {
      if (!item) return;
      recordAttempt("teach_mitthu", {
        target_letter: item.target,
        selected_letter: right ? item.target : other(item.target),
        module_type: "similar",
        time_to_interact_ms:
          guided || heardAt.current === null ? 0 : Math.max(0, Math.round(performance.now() - heardAt.current)),
        was_guided_win: guided,
        hover_duration_ms: 0,
        jitter_count: 0,
        q: index,
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [item, index, recordAttempt],
  );

  function answer(choice: Said) {
    if (busy.current || !item) return;
    busy.current = true;
    const right = (choice === "yes") === mitthuRight;
    log(right, false);
    setSaid(choice);
    if (right) playSuccessSound();
    else playErrorSound();
    // Right: the sheet, after a moment to read "It was ख" (D7).
    if (right) setTimeout(() => setSheet(true), 900);
    else setTimeout(advance, 2400);
  }

  // Stalled: the right answer glows, then the app gives it.
  const phase = useHesitationLadder({
    stage1Ms: levelConfig.hesitation_trigger_stage1_ms,
    stage2Ms: levelConfig.hesitation_trigger_stage2_ms,
    resetKey: index,
    active: said === null && Boolean(item),
    onRescue: () => {
      if (busy.current || !item) return;
      busy.current = true;
      log(true, true);
      setHelped(true);
      setSaid(mitthuRight ? "yes" : "no");
      playSuccessSound();
      setTimeout(advance, 2000);
    },
  });

  if (!item) return null;

  const rightChoice: Said = mitthuRight ? "yes" : "no";
  const pose: Pose = said === null ? (phase === "default" ? "listen" : "lean") : childRight || helped ? "hop" : "think";
  const button = (choice: Said) => {
    const isRight = choice === rightChoice;
    const state =
      said !== null
        ? choice === said
          ? isRight
            ? "bg-[var(--c-correct)] border-[var(--c-correct)] text-white"
            : "bg-white border-[var(--c-notyet)] text-gray-800"
          : "bg-white border-gray-300 text-gray-400 opacity-50"
        : phase === "hint" && isRight
          ? "bg-[var(--c-glow)] border-[var(--c-glow)] text-gray-800 animate-pulse"
          : "bg-white border-gray-300 text-gray-800";
    return (
      <button
        onClick={() => answer(choice)}
        disabled={said !== null}
        className={`tile3d flex-1 flex flex-col items-center justify-center gap-1 border-4 font-bold transition-all ${state}`}
        style={{ minHeight: "clamp(4.5rem, 16vmin, 6.5rem)", borderRadius: "var(--card-radius)" }}
      >
        <span className="t-3 leading-none" aria-hidden>
          {choice === "yes" ? "✓" : "✗"}
        </span>
        <span className="t-0">{choice === "yes" ? "Right" : "Not right"}</span>
      </button>
    );
  };

  return (
    <PlayLayout centerBody={false}>
      <StepDots total={items.length} current={index} />
      <h1 className="shrink-0 t-1 font-bold text-gray-800 text-center">Is Mitthu right? 🦜</h1>
      <div className="shrink-0 flex justify-center">
        <AudioButton onPlay={play} size="lg" />
      </div>

      <div className="flex-1 min-h-0 w-full flex items-center justify-center gap-3">
        <Mitthu pose={pose} size={130} title="Mitthu" />
        {/* His guess, in his own words (he speaks Hindi only: docs/11 §3.1). */}
        <div
          className="bg-white border-4 border-gray-800 px-4 py-2 flex flex-col items-center"
          style={{ borderRadius: "1.5rem" }}
        >
          <span className="t--1 text-gray-600">मुझे लगता है…</span>
          <span className="letter-glyph font-black text-gray-800" style={{ fontSize: "clamp(2.4rem, 12vmin, 4.2rem)", lineHeight: 1.1 }}>
            {item.shown}
          </span>
        </div>
      </div>

      {/* After an answer, the letter heard — so a wrong guess is always put right. */}
      <p className="shrink-0 t-0 text-center text-gray-700 min-h-[1.6em]" aria-live="polite">
        {said !== null && (
          <>
            It was <span className="letter-glyph font-black">{item.target}</span>
            {mitthuRight ? " — Mitthu was right." : " — Mitthu mixed it up."}
          </>
        )}
      </p>

      <div className="shrink-0 w-full flex gap-3">
        {button("yes")}
        {button("no")}
      </div>
      <SuccessSheet
        show={sheet}
        onContinue={() => {
          setSheet(false);
          advance();
        }}
      />
    </PlayLayout>
  );
}
