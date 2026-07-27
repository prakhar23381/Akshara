import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import confetti from "canvas-confetti";
import { useLevelConfig } from "../hooks/useLevelConfig";
import { useSessionTracker } from "../hooks/useSessionTracker";
import { analyzeSession } from "../api/client";
import { LETTER_SEQUENCE } from "../types/levelConfig";
import { AksharaButton } from "../components/AksharaButton";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";

export function RewardScreen() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const userId = user?.id ?? "offline";

  const {
    levelConfig,
    setLevelConfig,
    sessionNumber,
    incrementSessionNumber,
    letterIndex,
    advanceLetter,
    nextLetter,
    lastAvgLatencyMs,
    setLastAvgLatencyMs,
  } = useLevelConfig();

  const tracker = useSessionTracker({
    userId,
    targetAlphabet: levelConfig.target_alphabet,
    sessionNumber,
  });

  const [nextConfigReady, setNextConfigReady] = useState(false);
  const [apiCalled, setApiCalled] = useState(false);
  const [letterMastered, setLetterMastered] = useState(false);
  const [advancingLetter, setAdvancingLetter] = useState(false);

  const isLastLetter = letterIndex >= LETTER_SEQUENCE.length - 1;

  useEffect(() => {
    if (apiCalled) return;
    setApiCalled(true);

    tracker.endLevel().then(async (response) => {
      const mastered = response.letter_mastered ?? false;
      const newConfig = response.level_config;
      const newLatency = newConfig.hesitation_trigger_stage1_ms > 8000
        ? newConfig.hesitation_trigger_stage1_ms - 8000
        : lastAvgLatencyMs;

      setLetterMastered(mastered);
      setLevelConfig(newConfig);
      incrementSessionNumber();
      setLastAvgLatencyMs(newLatency);
      setNextConfigReady(true);

      // Trigger beautiful multi-burst confetti celebration
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { x: 0.1, y: 0.8 },
        colors: ["#FBBF24", "#F59E0B", "#10B981", "#3B82F6", "#EC4899"]
      });
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { x: 0.9, y: 0.8 },
        colors: ["#FBBF24", "#F59E0B", "#10B981", "#3B82F6", "#EC4899"]
      });
      setTimeout(() => {
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { x: 0.5, y: 0.6 },
          colors: ["#FBBF24", "#F59E0B", "#10B981", "#3B82F6", "#EC4899", "#FFFFFF"]
        });
      }, 250);

      // Persist to Supabase (fire-and-forget, don't block UI)
      if (user) {
        const debug = response.debug;
        const confusedPairsList = tracker.attempts
          .filter((a) => a.target_letter !== a.selected_letter)
          .map((a) => [a.target_letter, a.selected_letter]);

        await supabase.from("learning_sessions").insert({
          user_id: user.id,
          letter: levelConfig.target_alphabet,
          session_number: sessionNumber,
          cognitive_state: newConfig.cognitive_state,
          distractor_pool: newConfig.distractor_pool,
          scaffold_intensity: newConfig.scaffold_intensity,
          error_rate_pct: debug.error_rate_pct,
          avg_latency_ms: newLatency,
          confused_pairs: {
            confused_pairs: confusedPairsList,
            reasoning: newConfig.reasoning,
          },
          provider_used: newConfig.provider_used,
        });

        const storedIndex = LETTER_SEQUENCE.indexOf(
          levelConfig.target_alphabet as (typeof LETTER_SEQUENCE)[number]
        );
        await supabase.from("letter_progress").upsert({
          user_id: user.id,
          letter: levelConfig.target_alphabet,
          letter_index: storedIndex,
          mastered,
          sessions_count: sessionNumber,
          last_cognitive_state: newConfig.cognitive_state,
          last_scaffold_intensity: newConfig.scaffold_intensity,
          last_avg_latency_ms: newLatency,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id,letter" });
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiCalled]);

  async function handleNextLetter() {
    if (!nextLetter) return;
    setAdvancingLetter(true);
    advanceLetter();
    navigate("/roadmap");
  }

  function handlePracticeMore() {
    navigate(levelConfig.input_mode === "trace" ? "/tracing" : "/game");
  }

  const showMasteryChoice = letterMastered && nextConfigReady;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FFFBEB] via-[#FAF9F6] to-[#EFF6FF] flex flex-col items-center justify-center p-6 overflow-hidden relative">
      
      {/* Decorative ambient blobs in background */}
      <div className="absolute top-1/4 left-10 w-72 h-72 bg-yellow-200/30 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-10 w-96 h-96 bg-blue-200/20 rounded-full blur-3xl pointer-events-none" />

      {/* Main glassmorphic celebration card */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", duration: 0.8 }}
        className="w-full max-w-lg bg-white/70 backdrop-blur-xl border border-white/50 rounded-3xl p-8 sm:p-10 shadow-2xl flex flex-col items-center justify-center gap-8 text-center relative z-10"
      >
        {/* Celebration Trophy/Emoji */}
        <motion.div
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        >
          <motion.div
            animate={{ rotate: [0, 8, -8, 8, 0] }}
            transition={{ duration: 0.6, repeat: 2, delay: 0.5 }}
            className="text-8xl sm:text-9xl filter drop-shadow-md select-none"
          >
            {letterMastered && nextConfigReady ? "🏆" : "🎉"}
          </motion.div>
        </motion.div>

        {/* Heading & Text */}
        <div className="space-y-3">
          <h1 className="text-4xl sm:text-5xl font-black bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-500 bg-clip-text text-transparent tracking-wide leading-tight">
            {letterMastered && nextConfigReady ? "Mastered!" : "Amazing Job!"}
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 font-medium">
            {letterMastered && nextConfigReady
              ? `You have completely mastered the letter "${levelConfig.target_alphabet}"!`
              : `You successfully completed the practice for "${levelConfig.target_alphabet}"!`}
          </p>
        </div>

        {/* Glowing Stars Display */}
        <div className="flex gap-4 select-none">
          {[1, 2, 3].map((star, index) => (
            <motion.div
              key={star}
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: index * 0.2 + 0.3, type: "spring", stiffness: 100 }}
              className="text-5xl sm:text-6xl drop-shadow-md cursor-default"
            >
              ⭐
            </motion.div>
          ))}
        </div>

        {/* Letter progress strip */}
        <div className="flex flex-col gap-2 w-full mt-2">
          <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">
            Your Roadmap Progress
          </p>
          <div className="flex gap-2 sm:gap-3 justify-center items-center py-2 flex-wrap">
            {LETTER_SEQUENCE.map((letter, i) => {
              const isActive = i === letterIndex;
              const isPast = i < letterIndex;
              return (
                <motion.div
                  key={letter}
                  whileHover={{ scale: 1.15 }}
                  className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-lg sm:text-xl font-black border-2 transition-all ${
                    isPast
                      ? "bg-emerald-400 border-emerald-500 text-white shadow-emerald-200/50 shadow-md"
                      : isActive
                        ? "bg-amber-400 border-amber-500 text-white scale-110 shadow-lg shadow-amber-300/50 animate-pulse"
                        : "bg-gray-100 border-gray-200 text-gray-400"
                  }`}
                >
                  {letter}
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col items-center gap-3 w-full min-h-[120px] justify-center mt-2">
          {!nextConfigReady ? (
            <div className="flex flex-col items-center gap-3">
              <div className="flex gap-1.5">
                {[0, 1, 2].map((index) => (
                  <motion.div
                    key={index}
                    className="w-3 h-3 bg-amber-400 rounded-full"
                    animate={{ scale: [0.8, 1.3, 0.8], opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 1, repeat: Infinity, delay: index * 0.2 }}
                  />
                ))}
              </div>
              <p className="text-sm sm:text-base text-gray-400 font-medium tracking-wide">
                Configuring your personalized path...
              </p>
            </div>
          ) : showMasteryChoice ? (
            <div className="flex flex-col items-center gap-3 w-full">
              {!isLastLetter ? (
                <>
                  <AksharaButton
                    onClick={handleNextLetter}
                    size="large"
                    disabled={advancingLetter}
                  >
                    {advancingLetter
                      ? "Loading next letter…"
                      : `Next Letter: ${nextLetter} →`}
                  </AksharaButton>
                  <AksharaButton
                    onClick={handlePracticeMore}
                    variant="secondary"
                    size="small"
                  >
                    Practice "{levelConfig.target_alphabet}" more
                  </AksharaButton>
                </>
              ) : (
                <div className="text-center w-full space-y-3">
                  <p className="text-xl sm:text-2xl font-black text-emerald-600">
                    🎉 Outstanding! You completed all letters!
                  </p>
                  <AksharaButton onClick={handlePracticeMore} size="large">
                    Practice Again
                  </AksharaButton>
                </div>
              )}
            </div>
          ) : (
            <AksharaButton onClick={handlePracticeMore} size="large">
              Practice More
            </AksharaButton>
          )}

          {/* Home button — always visible once config is ready */}
          {nextConfigReady && (
            <button
              onClick={() => navigate("/roadmap")}
              className="text-gray-400 hover:text-amber-500 hover:scale-105 font-bold text-base sm:text-lg tracking-wide mt-2 transition-all flex items-center gap-1.5"
            >
              🏠 Home Roadmap
            </button>
          )}
        </div>
      </motion.div>

      {/* Floating sparkles */}
      {[...Array(8)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute text-2xl sm:text-3xl pointer-events-none select-none opacity-0"
          style={{ left: `${10 + i * 11}%`, top: `${15 + (i % 3) * 25}%` }}
          animate={{ y: [0, -40, 0], opacity: [0, 0.8, 0], scale: [0.7, 1.2, 0.7] }}
          transition={{ duration: 3, repeat: Infinity, delay: i * 0.4 }}
        >
          ✨
        </motion.div>
      ))}

      {import.meta.env.DEV && nextConfigReady && (
        <div className="absolute bottom-4 left-4 bg-white/80 border border-gray-200 rounded-lg px-4 py-2 text-[10px] text-gray-500 max-w-sm text-center shadow-sm backdrop-blur-sm z-20">
          <span className="font-bold">Next:</span>{" "}
          {levelConfig.cognitive_state} | scaffold{" "}
          {levelConfig.scaffold_intensity.toFixed(2)} | {levelConfig.provider_used}
          {letterMastered && " | MASTERED"}
        </div>
      )}
    </div>
  );
}
