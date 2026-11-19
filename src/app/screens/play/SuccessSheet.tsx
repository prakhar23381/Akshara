import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Mitthu } from "../../components/Mitthu";
import { say } from "../../components/Bubble";
import { PRAISE } from "../../data/mitthuLines";

/** Praise taken in turn across the whole app, so it does not repeat. */
let praiseTurn = 0;

/**
 * The green sheet after a right answer (G4; docs/11 §3.8, D7): Mitthu hops,
 * says a praise word aloud, and — for a letter or a word — shows its picture,
 * so the praise is also a second look at a word. The child moves on with
 * Continue, at their own pace.
 *
 * Only for an answer the child found. An answer the app supplied, or one
 * after a wrong tap, moves on as before: praise must be true. A wrong answer
 * never gets a sheet (§3.8 guardrail).
 */
export function SuccessSheet({
  show,
  onContinue,
  picture,
}: {
  show: boolean;
  onContinue: () => void;
  picture?: { emoji: string; word: string } | null;
}) {
  const praise = useRef(PRAISE[0]);
  const fired = useRef(false);
  useEffect(() => {
    if (!show) {
      fired.current = false;
      return;
    }
    if (fired.current) return;
    fired.current = true;
    praise.current = PRAISE[praiseTurn++ % PRAISE.length];
    say(praise.current.hi);
  }, [show]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="sheet"
          className="fixed inset-0 z-40 flex flex-col justify-end"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-label={praise.current.en}
        >
          {/* Blocks taps on the question behind until Continue. */}
          <div className="flex-1" />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            className="w-full bg-[var(--c-correct-tint)] border-t-4 border-[var(--c-correct)]"
            style={{ padding: "var(--pad-screen)", paddingBottom: "calc(var(--pad-screen) + env(safe-area-inset-bottom))" }}
          >
            <div className="max-w-xl mx-auto flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <Mitthu pose="hop" size={72} />
                <div className="flex-1 min-w-0">
                  <div className="letter-glyph font-black text-[var(--c-correct-lip)]" style={{ fontSize: "clamp(1.5rem, 7vmin, 2.2rem)" }}>
                    ✓ {praise.current.hi}
                  </div>
                  <div className="t--1 text-[var(--c-correct-lip)]">{praise.current.en}</div>
                </div>
                {picture && (
                  <div className="shrink-0 flex flex-col items-center">
                    <span style={{ fontSize: "clamp(2rem, 9vmin, 3rem)", lineHeight: 1 }} aria-hidden>
                      {picture.emoji}
                    </span>
                    <span className="letter-glyph t-0 font-bold text-[var(--c-ink)]">{picture.word}</span>
                  </div>
                )}
              </div>
              <button
                onClick={onContinue}
                autoFocus
                className="tile3d w-full rounded-2xl font-extrabold tracking-wide text-white bg-[var(--c-correct)] border-2 border-transparent [--lip:var(--c-correct-lip)] t-1"
                style={{ minHeight: "var(--control-h)", marginBottom: 5 }}
              >
                <span className="letter-glyph">आगे</span> · Continue
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
