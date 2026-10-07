import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import confetti from "canvas-confetti";
import { ChildScreen } from "../../../components/ChildScreen";
import { AksharaButton } from "../../../components/AksharaButton";
import { useSession } from "../../../contexts/SessionContext";
import { useLevelConfig } from "../../../hooks/useLevelConfig";
import { supabase } from "../../../lib/supabase";
import { LETTER_SEQUENCE } from "../../../types/levelConfig";
import { sessionAttempts } from "../../../types/session";

/**
 * Closes the session and celebrates.
 *
 * The letter strip used to render all 33 consonants, which wrapped to six rows
 * on a phone and pushed the heading off the top and the buttons off the bottom
 * of a fixed-height screen. It now shows only what is relevant: what has been
 * mastered, what is in progress, and what is coming next.
 */
export function RewardStep() {
  const navigate = useNavigate();
  const { session, endSession } = useSession();
  const { setLevelConfig, advanceLetter, letterIndex } = useLevelConfig();

  const [mastered, setMastered] = useState(false);
  const [ready, setReady] = useState(false);
  const closed = useRef(false);

  useEffect(() => {
    if (closed.current || !session) return;
    closed.current = true;

    endSession().then(async ({ letterMastered, nextConfig }) => {
      setMastered(letterMastered);
      if (nextConfig) setLevelConfig(nextConfig);
      setReady(true);

      confetti({ particleCount: 90, spread: 70, origin: { y: 0.7 } });

      // Letter-level progress is what the roadmap reads.
      const index = LETTER_SEQUENCE.indexOf(
        session.letter as (typeof LETTER_SEQUENCE)[number],
      );
      try {
        await supabase.from("letter_progress").upsert(
          {
            user_id: session.user_id,
            letter: session.letter,
            letter_index: index,
            mastered: letterMastered,
            sessions_count: session.session_number,
            last_cognitive_state:
              nextConfig?.cognitive_state ?? session.level_config.cognitive_state,
            last_scaffold_intensity: nextConfig?.scaffold_intensity ?? 0.55,
            last_avg_latency_ms:
              session.metrics?.latency_median_ms ?? 6000,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,letter" },
        );
      } catch (err) {
        console.warn("[Reward] letter_progress write failed", err);
      }
    });
  }, [session, endSession, setLevelConfig]);

  if (!session) return null;

  const answered = sessionAttempts(session).length;
  const nextLetter =
    letterIndex < LETTER_SEQUENCE.length - 1
      ? LETTER_SEQUENCE[letterIndex + 1]
      : null;

  // Only the letters that mean something right now.
  const shown = LETTER_SEQUENCE.slice(
    Math.max(0, letterIndex - 2),
    Math.min(LETTER_SEQUENCE.length, letterIndex + 3),
  );

  return (
    <ChildScreen
      footer={
        ready ? (
          <>
            {mastered && nextLetter ? (
              <AksharaButton
                fullWidth
                onClick={() => {
                  advanceLetter();
                  navigate("/roadmap", { replace: true });
                }}
              >
                Next letter: {nextLetter} →
              </AksharaButton>
            ) : (
              <AksharaButton
                fullWidth
                onClick={() => navigate("/roadmap", { replace: true })}
              >
                Back to my letters
              </AksharaButton>
            )}
          </>
        ) : null
      }
    >
      <motion.span
        className="t-5 shrink-0"
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 2.5, repeat: Infinity }}
      >
        {mastered ? "🏆" : "🎉"}
      </motion.span>

      <h1 className="t-3 font-black text-amber-700 tracking-wide text-center shrink-0">
        {mastered ? "Mastered!" : "Great work!"}
      </h1>
      <p className="t-0 text-gray-600 text-center shrink-0">
        {mastered
          ? `You have mastered “${session.letter}”.`
          : `You finished practising “${session.letter}”.`}
      </p>

      <div className="shrink-0 flex gap-2">
        {[1, 2, 3].map((s, i) => (
          <motion.span
            key={s}
            className="t-2"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.15 * i, type: "spring" }}
          >
            ⭐
          </motion.span>
        ))}
      </div>

      <div className="shrink-0 flex flex-wrap justify-center gap-2">
        {shown.map((l) => (
          <span
            key={l}
            className={`letter-glyph flex items-center justify-center rounded-full font-black border-2 ${
              l === session.letter
                ? "bg-amber-400 border-amber-500 text-white"
                : "bg-white border-gray-200 text-gray-400"
            }`}
            style={{
              width: "clamp(2rem, 9vmin, 3rem)",
              height: "clamp(2rem, 9vmin, 3rem)",
              fontSize: "clamp(0.9rem, 4vmin, 1.4rem)",
            }}
          >
            {l}
          </span>
        ))}
      </div>

      {!ready ? (
        <p className="t--1 text-gray-400 shrink-0">Saving your progress…</p>
      ) : (
        <p className="t--1 text-gray-400 shrink-0">
          {answered} question{answered === 1 ? "" : "s"} answered
        </p>
      )}
    </ChildScreen>
  );
}
