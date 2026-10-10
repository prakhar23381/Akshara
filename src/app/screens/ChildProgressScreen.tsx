import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import { TopBar } from "../components/TopBar";
import { Screen } from "../components/Screen";
import { fetchProgressReport, type ProgressReport } from "../api/client";
import { useAuth } from "../contexts/AuthContext";
import { LETTER_SEQUENCE } from "../types/levelConfig";

/**
 * The child's own progress view.
 *
 * Shows effort and letters earned, and never an error rate, accuracy score or
 * rescue count. A child being screened for a reading difficulty should not be
 * handed a tally of how often they were wrong — that is what drives the
 * avoidance the rest of the app is built to prevent. The clinical figures live
 * at /progress, which is for adults.
 *
 * Fits the viewport with no scrolling: the collection grid takes the remaining
 * height and its tiles size themselves from it.
 */
export function ChildProgressScreen() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [report, setReport] = useState<ProgressReport | null>(null);
  const [loading, setLoading] = useState(true);

  const userId = user?.id ?? "offline";
  useEffect(() => {
    if (authLoading) return;
    let live = true;
    fetchProgressReport(userId).then((r) => {
      if (!live) return;
      setReport(r);
      setLoading(false);
    });
    return () => {
      live = false;
    };
  }, [authLoading, userId]);

  const avatar = user?.user_metadata?.avatar ?? "🐻";
  const stats = report?.letter_stats ?? {};
  const mastered = LETTER_SEQUENCE.filter((l) => stats[l]?.mastered);
  const sessions = report?.total_sessions ?? 0;

  if (loading) {
    return (
      <Screen>
        <div className="flex-1 min-h-0 flex items-center justify-center gap-2">
          {[0, 1, 2].map((i) => (
            <motion.div key={i} className="h-4 w-4 rounded-full bg-amber-400"
              animate={{ y: [0, -12, 0] }}
              transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }} />
          ))}
        </div>
      </Screen>
    );
  }

  return (
    <Screen>
      {/* Was a hand-rolled header with its own back button and padding. The
          avatar is suppressed because it already headlines the hero below. */}
      <TopBar
        avatarEmoji={null}
        title="My letters"
        onExit={() => navigate("/resume")}
      />

      <div className="flex-1 min-h-0 flex flex-col items-center"
        style={{ gap: "var(--gap-screen)", padding: "0 var(--pad-screen) var(--pad-screen)" }}>

        {/* Hero — horizontal so it stays short on wide, low screens */}
        <div className="shrink-0 flex items-center justify-center gap-4 flex-wrap">
          <motion.span className="glyph-md" style={{ fontSize: "var(--glyph-md)" }}
            animate={{ rotate: [0, 8, -8, 0] }} transition={{ duration: 3, repeat: Infinity }}>
            {avatar}
          </motion.span>
          <div className="text-center">
            {mastered.length > 0 ? (
              <>
                <p className="t-4 font-black text-amber-600 leading-none">{mastered.length}</p>
                <p className="t-0 font-bold text-gray-700">
                  {mastered.length === 1 ? "letter learned!" : "letters learned!"}
                </p>
              </>
            ) : (
              <p className="t-1 font-bold text-gray-700">You have started your journey!</p>
            )}
          </div>
          {sessions > 0 && (
            <div className="flex flex-col items-center">
              <div className="flex flex-wrap justify-center gap-0.5 max-w-[11rem]">
                {Array.from({ length: Math.min(sessions, 10) }).map((_, i) => (
                  <motion.span key={i} className="t-1" initial={{ scale: 0 }} animate={{ scale: 1 }}
                    transition={{ delay: i * 0.05, type: "spring" }}>⭐</motion.span>
                ))}
                {sessions > 10 && (
                  <span className="t-0 font-bold text-amber-600 self-center">+{sessions - 10}</span>
                )}
              </div>
              <p className="t--1 text-gray-500">a star for each practice</p>
            </div>
          )}
        </div>

        {/* Collection — takes the remaining height, tiles scale to fit */}
        <div className="flex-1 min-h-0 w-full max-w-3xl flex flex-col">
          <h2 className="t-0 font-bold text-gray-700 mb-1.5 shrink-0">My letter collection</h2>
          <div className="flex-1 min-h-0 grid gap-1.5 content-start overflow-hidden"
            style={{ gridTemplateColumns: "repeat(auto-fit, minmax(2.5rem, 1fr))" }}>
            {LETTER_SEQUENCE.map((letter) => {
              const isMastered = stats[letter]?.mastered;
              const isStarted = Boolean(stats[letter]);
              return (
                <div key={letter}
                  className={`relative flex aspect-square items-center justify-center rounded-xl border-2 ${
                    isMastered ? "border-amber-400 bg-amber-50"
                      : isStarted ? "border-[#4A90E2] bg-white"
                      : "border-gray-200 bg-gray-50"
                  }`}>
                  <span className={`letter-glyph font-bold ${
                    isMastered ? "text-amber-700" : isStarted ? "text-gray-800" : "text-gray-300"
                  }`} style={{ fontSize: "clamp(0.9rem, 3.2vmin, 1.6rem)" }}>
                    {letter}
                  </span>
                  {/* A star as well as the colour, so state is never colour alone */}
                  {isMastered && <span className="absolute -right-1 -top-1 t--1">⭐</span>}
                </div>
              );
            })}
          </div>
        </div>

        <button onClick={() => navigate("/roadmap")}
          className="shrink-0 t-1 rounded-2xl bg-[#4A90E2] px-7 py-3 font-bold text-white hover:bg-[#357ABD] active:scale-95">
          Keep learning  →
        </button>
      </div>
    </Screen>
  );
}
