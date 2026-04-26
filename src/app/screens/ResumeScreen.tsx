import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { AksharaButton } from "../components/AksharaButton";
import { motion } from "motion/react";
import { analyzeSession } from "../api/client";
import { useLevelConfig } from "../hooks/useLevelConfig";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";
import { LETTER_SEQUENCE } from "../types/levelConfig";

export function ResumeScreen() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const {
    setLevelConfig,
    sessionNumber,
    currentLetter,
    letterIndex,
    lastAvgLatencyMs,
    setLastAvgLatencyMs,
    jumpToLetterIndex,
  } = useLevelConfig();

  const [loading, setLoading] = useState(false);
  const [progressLoaded, setProgressLoaded] = useState(false);
  const [profileName, setProfileName] = useState<string | null>(null);
  const [profileAvatar, setProfileAvatar] = useState<string | null>(null);

  // Load profile + letter progress from Supabase on mount
  useEffect(() => {
    if (!user || progressLoaded) return;

    async function loadAll() {
      const [profileRes, progressRes] = await Promise.all([
        supabase
          .from("user_profiles")
          .select("display_name, avatar")
          .eq("id", user!.id)
          .single(),
        supabase
          .from("letter_progress")
          .select("letter_index, mastered, last_avg_latency_ms")
          .eq("user_id", user!.id)
          .order("letter_index", { ascending: false })
          .limit(1)
          .single(),
      ]);

      if (profileRes.data) {
        setProfileName(profileRes.data.display_name ?? null);
        setProfileAvatar(profileRes.data.avatar ?? null);
      }

      if (progressRes.data) {
        const { letter_index, mastered, last_avg_latency_ms } = progressRes.data;
        // Single atomic jump — avoids re-triggering the effect on each increment.
        const targetIndex = mastered
          ? Math.min(letter_index + 1, LETTER_SEQUENCE.length - 1)
          : letter_index;
        jumpToLetterIndex(targetIndex);
        setLastAvgLatencyMs((last_avg_latency_ms as number) ?? 6000);
      }
      setProgressLoaded(true);
    }

    loadAll();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, progressLoaded]);

  async function handleContinue() {
    setLoading(true);
    const result = await analyzeSession({
      user_id: user!.id,
      target_alphabet: currentLetter,
      session_id: `sess_${Date.now()}`,
      session_number: sessionNumber,
      avg_latency_ms: lastAvgLatencyMs,
      consecutive_fails_peak: 0,
      attempts: [],
    });
    setLevelConfig(result.level_config);
    navigate("/animation");
  }

  const displayName =
    profileName ||
    user?.user_metadata?.display_name ||
    user?.user_metadata?.full_name?.split(" ")[0] ||
    "there";
  const avatarEmoji = profileAvatar ?? user?.user_metadata?.avatar ?? "🐻";

  return (
    <div className="h-screen bg-[#F7F6F2] flex flex-col items-center justify-center gap-12 overflow-hidden p-8">
      <div className="text-center">
        <motion.div
          animate={{ rotate: [0, 10, -10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="text-9xl mb-6"
        >
          {avatarEmoji}
        </motion.div>
        <h1 className="text-5xl font-bold text-gray-800 mb-3 tracking-wide">
          Welcome back, {displayName}!
        </h1>
        <p className="text-2xl text-gray-500 tracking-wide">
          Currently learning:{" "}
          <span className="text-4xl font-bold text-amber-500">{currentLetter}</span>
          <span className="text-lg text-gray-400 ml-2">
            ({LETTER_SEQUENCE.indexOf(currentLetter as (typeof LETTER_SEQUENCE)[number]) + 1}/{LETTER_SEQUENCE.length})
          </span>
        </p>
      </div>

      <div className="flex flex-col gap-6 items-center">
        <AksharaButton
          onClick={handleContinue}
          size="large"
          disabled={loading || !progressLoaded}
        >
          {loading ? "Preparing your lesson…" : !progressLoaded ? "Loading progress…" : "Continue Learning"}
        </AksharaButton>

        <div className="flex gap-4 justify-center">
          <AksharaButton
            onClick={() => alert("Rewards screen (coming soon)")}
            variant="secondary"
            size="small"
          >
            🏆 Rewards
          </AksharaButton>
          <AksharaButton
            onClick={() => navigate("/progress")}
            variant="secondary"
            size="small"
          >
            📊 Progress
          </AksharaButton>
          <AksharaButton
            onClick={signOut}
            variant="secondary"
            size="small"
          >
            Sign Out
          </AksharaButton>
        </div>
      </div>

      <div className="absolute top-4 right-4 bg-gray-800 text-white px-4 py-2 rounded-lg text-sm">
        {user?.email}
      </div>
    </div>
  );
}
