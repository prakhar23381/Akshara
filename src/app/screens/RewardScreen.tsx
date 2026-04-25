import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
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

      // Persist to Supabase (fire-and-forget, don't block UI)
      if (user) {
        const debug = response.debug;
        await supabase.from("learning_sessions").insert({
          user_id: user.id,
          letter: levelConfig.target_alphabet,
          session_number: sessionNumber,
          cognitive_state: newConfig.cognitive_state,
          distractor_pool: newConfig.distractor_pool,
          scaffold_intensity: newConfig.scaffold_intensity,
          error_rate_pct: debug.error_rate_pct,
          avg_latency_ms: newLatency,
          confused_pairs: debug,
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
    const response = await analyzeSession({
      user_id: userId,
      target_alphabet: nextLetter,
      session_id: `sess_${Date.now()}`,
      session_number: 1,
      avg_latency_ms: lastAvgLatencyMs,
      consecutive_fails_peak: 0,
      attempts: [],
    });
    setLevelConfig(response.level_config);
    navigate("/animation");
  }

  function handlePracticeMore() {
    navigate("/game");
  }

  const showMasteryChoice = letterMastered && nextConfigReady;

  return (
    <div className="h-screen bg-[#F7F6F2] flex flex-col items-center justify-center gap-10 overflow-hidden">
      {/* Celebration */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", duration: 0.6 }}
        className="text-center"
      >
        <motion.div
          animate={{ rotate: [0, 10, -10, 10, 0] }}
          transition={{ duration: 0.5, repeat: 2 }}
          className="text-9xl mb-4"
        >
          {letterMastered && nextConfigReady ? "🏆" : "🎉"}
        </motion.div>
        <h1 className="text-6xl font-bold text-gray-800 mb-3 tracking-wide">
          {letterMastered && nextConfigReady ? "Mastered!" : "Amazing!"}
        </h1>
        <p className="text-2xl text-gray-600 tracking-wide">
          {letterMastered && nextConfigReady
            ? `You have mastered the letter "${levelConfig.target_alphabet}"!`
            : "You did it!"}
        </p>
      </motion.div>

      {/* Stars */}
      <div className="flex gap-6">
        {[1, 2, 3].map((star, index) => (
          <motion.div
            key={star}
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: index * 0.2, type: "spring" }}
            className="text-7xl"
          >
            ⭐
          </motion.div>
        ))}
      </div>

      {/* Letter progress strip */}
      <div className="flex gap-3">
        {LETTER_SEQUENCE.map((letter, i) => (
          <div
            key={letter}
            className={`w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold border-2 transition-all ${
              i < letterIndex
                ? "bg-green-400 border-green-500 text-white"
                : i === letterIndex
                  ? "bg-amber-400 border-amber-500 text-white scale-110"
                  : "bg-gray-200 border-gray-300 text-gray-400"
            }`}
          >
            {letter}
          </div>
        ))}
      </div>

      {/* Action buttons */}
      <div className="flex flex-col items-center gap-4 min-h-[120px] justify-center">
        {!nextConfigReady ? (
          <div className="flex flex-col items-center gap-2">
            <div className="flex gap-1">
              {[0, 1, 2].map((index) => (
                <motion.div
                  key={index}
                  className="w-2 h-2 bg-blue-300 rounded-full"
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1, repeat: Infinity, delay: index * 0.2 }}
                />
              ))}
            </div>
            <p className="text-lg text-gray-400 tracking-wide">
              Preparing your next level...
            </p>
          </div>
        ) : showMasteryChoice ? (
          <div className="flex flex-col items-center gap-4">
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
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600 mb-4">
                  You completed all 5 letters!
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
            onClick={() => navigate("/resume")}
            className="text-gray-400 hover:text-gray-600 text-lg tracking-wide mt-2 transition-colors"
          >
            🏠 Home
          </button>
        )}
      </div>

      {/* Floating sparkles */}
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute text-3xl pointer-events-none"
          style={{ left: `${15 + i * 15}%`, top: `${25 + (i % 2) * 35}%` }}
          animate={{ y: [0, -20, 0], opacity: [0, 1, 0] }}
          transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}
        >
          ✨
        </motion.div>
      ))}

      {import.meta.env.DEV && nextConfigReady && (
        <div className="bg-white border border-gray-200 rounded-lg px-4 py-2 text-xs text-gray-500 max-w-sm text-center">
          <span className="font-bold">Next:</span>{" "}
          {levelConfig.cognitive_state} | scaffold{" "}
          {levelConfig.scaffold_intensity.toFixed(2)} | {levelConfig.provider_used}
          {letterMastered && " | MASTERED"}
        </div>
      )}
    </div>
  );
}
