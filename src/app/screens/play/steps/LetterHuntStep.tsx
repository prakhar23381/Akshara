import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PlayLayout } from "../PlayLayout";
import { useSession } from "../../../contexts/SessionContext";
import { useHesitationLadder } from "../../../hooks/useHesitationLadder";
import { getLetterContent } from "../../../data/letterContent";
import { aksharas, baseConsonant } from "../../../lib/akshara";
import { speakHindi } from "../../../utils/speech";
import { playErrorSound, playSuccessSound } from "../../../utils/soundEffects";
import type { StepProps } from "../types";

const NUKTA = "़";
/** Words in one hunt: the letter's example words. */
const WORDS = 3;

/**
 * Whether an akshara has the letter in it: as its leading consonant (का in
 * काला), or inside a cluster (the ङ in ङ्गा). The same consonant with a nukta
 * is a different letter (ड़ is not ड), so it does not count.
 */
export function hasLetter(akshara: string, letter: string): boolean {
  const cps = [...akshara];
  return cps.some((c, i) => c === letter && cps[i + 1] !== NUKTA);
}

/**
 * Letter hunt (G3, docs/12 §7): the letter's pictured example words, split
 * into aksharas, and the child taps every akshara the letter is in.
 *
 * It asks for the letter *inside text* — with a matra on it, or joined to
 * another consonant — which neither Listen & tap nor the word games do. Each
 * akshara to find is one question (`q`): found unaided is right, a wrong tap
 * before it is a miss filed as a mix-up with the consonant tapped, and one the
 * app shows is supplied. Like See & match, its answers are recorded and
 * reported but never decide the letter's stage.
 */
export function LetterHuntStep({ letter, levelConfig, onComplete }: StepProps) {
  const { recordAttempt } = useSession();
  const words = useMemo(
    () =>
      getLetterContent(letter)
        .exampleWords.slice(0, WORDS)
        .map((w) => ({ ...w, parts: aksharas(w.word) })),
    [letter],
  );
  const targets = useMemo(
    () => words.flatMap((w, wi) => w.parts.map((p, pi) => ({ key: `${wi}:${pi}`, p })).filter((t) => hasLetter(t.p, letter))),
    [words, letter],
  );
  const [found, setFound] = useState<Set<string>>(() => new Set());
  const [helped, setHelped] = useState<Set<string>>(() => new Set());
  const [wrong, setWrong] = useState<string | null>(null);
  const shownAt = useRef(performance.now());
  const finished = useRef(false);
  const left = targets.filter((t) => !found.has(t.key));
  const all = targets.length > 0 && left.length === 0;

  // Nothing to hunt (a letter with no example words): move straight on.
  useEffect(() => {
    if (targets.length === 0) onComplete();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targets.length]);

  useEffect(() => {
    if (!all || finished.current) return;
    finished.current = true;
    const t = setTimeout(() => onComplete(), 1400);
    return () => clearTimeout(t);
  }, [all, onComplete]);

  const log = useCallback(
    (selected: string, guided: boolean) => {
      recordAttempt("letter_hunt", {
        target_letter: letter,
        selected_letter: selected,
        module_type: "similar",
        time_to_interact_ms: guided ? 0 : Math.max(0, Math.round(performance.now() - shownAt.current)),
        was_guided_win: guided,
        hover_duration_ms: 0,
        jitter_count: 0,
        q: found.size,
      });
      shownAt.current = performance.now();
    },
    [letter, found.size, recordAttempt],
  );

  function tap(key: string, part: string) {
    if (all || found.has(key)) return;
    if (hasLetter(part, letter)) {
      log(letter, false);
      setFound((f) => new Set(f).add(key));
      playSuccessSound();
      return;
    }
    log(baseConsonant(part) || part, false);
    setWrong(key);
    playErrorSound();
    setTimeout(() => setWrong((w) => (w === key ? null : w)), 900);
  }

  // Stalled: the other aksharas dim, then the ones left glow, then the app
  // shows the next one — one at a time, so the child still finds the rest.
  const phase = useHesitationLadder({
    stage1Ms: levelConfig.hesitation_trigger_stage1_ms,
    stage2Ms: levelConfig.hesitation_trigger_stage2_ms,
    resetKey: found.size,
    active: !all && targets.length > 0,
    onRescue: () => {
      const next = left[0];
      if (!next) return;
      log(letter, true);
      setHelped((h) => new Set(h).add(next.key));
      setFound((f) => new Set(f).add(next.key));
      playSuccessSound();
    },
  });

  if (targets.length === 0) return null;

  return (
    <PlayLayout centerBody={false}>
      <h1 className="shrink-0 t-1 font-bold text-gray-800 text-center">
        Find every <span className="letter-glyph">{letter}</span> 🔍
      </h1>
      <p className="shrink-0 t-0 text-gray-500 text-center tabular-nums" aria-live="polite">
        {found.size} of {targets.length} found
      </p>

      <div className="flex-1 min-h-0 w-full flex flex-col items-center justify-center" style={{ gap: "var(--gap-screen)" }}>
        {words.map((w, wi) => (
          <div key={w.word} className="flex items-center gap-3 max-w-full">
            {/* The picture says the word, for a child who cannot read it yet. */}
            <button
              onClick={() => speakHindi(w.word)}
              className="shrink-0 grid place-items-center bg-white border-2 border-gray-200 rounded-2xl"
              style={{ width: "var(--tap-min)", height: "var(--tap-min)", fontSize: "1.6rem" }}
              aria-label={`Hear ${w.meaning}`}
            >
              {w.image}
            </button>
            <div className="flex gap-1.5 flex-wrap">
              {w.parts.map((p, pi) => {
                const key = `${wi}:${pi}`;
                const isTarget = hasLetter(p, letter);
                const state = found.has(key)
                  ? helped.has(key)
                    ? "bg-[#FFD166] border-[#FFD166]"
                    : "bg-[#4CAF50] border-[#4CAF50] text-white"
                  : wrong === key
                    ? "bg-white border-[#E76F51]"
                    : phase === "hint" && isTarget
                      ? "bg-[#FFD166] border-[#FFD166] animate-pulse"
                      : phase !== "default" && !isTarget
                        ? "bg-white border-gray-300 opacity-30"
                        : "bg-white border-gray-300";
                return (
                  <button
                    key={key}
                    onClick={() => tap(key, p)}
                    disabled={found.has(key) || (phase !== "default" && !isTarget)}
                    className={`letter-glyph font-bold border-4 grid place-items-center transition-all ${state}`}
                    style={{
                      minWidth: "clamp(2.75rem, 13vmin, 4rem)",
                      height: "clamp(2.75rem, 13vmin, 4rem)",
                      fontSize: "clamp(1.4rem, 7vmin, 2.2rem)",
                      padding: "0 0.3em",
                      borderRadius: "var(--card-radius)",
                    }}
                  >
                    {p}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </PlayLayout>
  );
}
