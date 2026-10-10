import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import { AksharaButton } from "../components/AksharaButton";
import { useLevelConfig } from "../hooks/useLevelConfig";
import { useAccount } from "../contexts/AccountContext";
import { supabase } from "../lib/supabase";
import { LETTER_SEQUENCE } from "../types/levelConfig";

/**
 * The child's front door: "welcome back", and where they are up to.
 *
 * It is the *active child's* now. It used to read the signed-in account's
 * profile for the name and avatar, because the account was the child — and it
 * carried a "Sign out" button, so a child could sign the adult out. Signing
 * out lives on the adult home; this screen offers the way to the grown-ups'
 * lock instead.
 */
export function ResumeScreen() {
  const navigate = useNavigate();
  const { activeChild } = useAccount();
  const { currentLetter, setLastAvgLatencyMs, jumpToLetterIndex } = useLevelConfig();
  const [progressLoaded, setProgressLoaded] = useState(false);
  const childId = activeChild?.id;

  // Where this child is up to: the furthest letter they have reached.
  useEffect(() => {
    if (!childId) return;
    let live = true;
    supabase
      .from("letter_progress")
      .select("letter_index, mastered, last_avg_latency_ms")
      .eq("user_id", childId)
      .order("letter_index", { ascending: false })
      .limit(1)
      .single()
      .then(({ data }) => {
        if (!live) return;
        if (data) {
          const { letter_index, mastered, last_avg_latency_ms } = data as {
            letter_index: number;
            mastered: boolean;
            last_avg_latency_ms: number | null;
          };
          jumpToLetterIndex(mastered ? Math.min(letter_index + 1, LETTER_SEQUENCE.length - 1) : letter_index);
          setLastAvgLatencyMs(last_avg_latency_ms ?? 6000);
        } else {
          jumpToLetterIndex(0);
        }
        setProgressLoaded(true);
      });
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [childId]);

  if (!activeChild) return null;

  return (
    <div className="h-[100dvh] bg-[#F7F6F2] flex flex-col items-center justify-center gap-[var(--gap-screen)] overflow-hidden p-[var(--pad-screen)] relative">
      {/* The way out for a grown-up, quiet enough not to be a child's target. */}
      <button
        onClick={() => navigate("/unlock?next=/home")}
        className="absolute top-3 right-3 t--1 font-semibold rounded-full border-2 border-gray-300 bg-white px-3 text-gray-500"
        style={{ minHeight: "var(--tap-min)" }}
      >
        Grown-ups
      </button>

      <div className="text-center">
        <motion.div
          animate={{ rotate: [0, 10, -10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="t-5 mb-6"
        >
          {activeChild.avatar ?? "🐻"}
        </motion.div>
        <h1 className="t-3 font-bold text-gray-800 mb-3 tracking-wide">
          Welcome back, {activeChild.display_name}!
        </h1>
        <p className="t-2 text-gray-500 tracking-wide">
          Currently learning:{" "}
          <span className="t-3 font-bold text-amber-500">{currentLetter}</span>
          <span className="text-lg text-gray-400 ml-2">
            ({LETTER_SEQUENCE.indexOf(currentLetter as (typeof LETTER_SEQUENCE)[number]) + 1}/{LETTER_SEQUENCE.length})
          </span>
        </p>
      </div>

      <div className="flex flex-col gap-6 items-center">
        <AksharaButton onClick={() => navigate("/roadmap")} size="large" disabled={!progressLoaded}>
          {progressLoaded ? "Continue Learning" : "Loading progress…"}
        </AksharaButton>
        <AksharaButton onClick={() => navigate("/my-progress")} variant="secondary" size="small">
          📊 My letters
        </AksharaButton>
      </div>
    </div>
  );
}
