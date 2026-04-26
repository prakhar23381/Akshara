import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { ArrowLeft, Star, Target, TrendingUp, Sparkles } from "lucide-react";
import { fetchProgressReport, type ProgressReport, type LetterStat } from "../api/client";
import { useAuth } from "../contexts/AuthContext";
import { LETTER_SEQUENCE } from "../types/levelConfig";

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATE_LABEL: Record<string, string> = {
  insufficient_data:    "Just started",
  gross_shape_blindness:"Learning shapes",
  feature_neglect:      "Learning details",
  visual_mastery:       "Mastered ✓",
};

const LETTER_COLOR: Record<string, { bg: string; border: string; text: string }> = {
  "म": { bg: "#FFF7ED", border: "#FB923C", text: "#EA580C" },
  "ग": { bg: "#F0FDF4", border: "#4ADE80", text: "#16A34A" },
  "घ": { bg: "#EFF6FF", border: "#60A5FA", text: "#2563EB" },
  "ध": { bg: "#FDF4FF", border: "#C084FC", text: "#9333EA" },
  "ब": { bg: "#FFF1F2", border: "#FB7185", text: "#E11D48" },
};

function TrendBadge({ trend }: { trend: LetterStat["trend"] }) {
  const cfg = {
    improving:        { bg: "#DCFCE7", text: "#16A34A", label: "↑ Improving" },
    stable:           { bg: "#FEF9C3", text: "#A16207", label: "→ Steady" },
    "needs attention":{ bg: "#FEE2E2", text: "#DC2626", label: "↓ Needs practice" },
  }[trend];
  return (
    <span
      className="text-xs font-semibold px-2 py-0.5 rounded-full"
      style={{ background: cfg.bg, color: cfg.text }}
    >
      {cfg.label}
    </span>
  );
}

function ErrorBar({ value }: { value: number | null }) {
  if (value === null) return <span className="text-gray-400 text-sm">No data</span>;
  const pct = Math.min(100, value);
  const color = pct < 15 ? "#22C55E" : pct < 35 ? "#F59E0B" : "#EF4444";
  return (
    <div className="flex items-center gap-2 w-full">
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="h-full rounded-full"
          style={{ background: color }}
        />
      </div>
      <span className="text-sm font-semibold w-12 text-right" style={{ color }}>
        {value.toFixed(0)}%
      </span>
    </div>
  );
}

// ── Letter detail panel ────────────────────────────────────────────────────────
function LetterPanel({
  letter,
  stat,
}: {
  letter: string;
  stat: LetterStat;
  insight?: string;
}) {
  const col = LETTER_COLOR[letter] ?? { bg: "#F9FAFB", border: "#D1D5DB", text: "#374151" };
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25 }}
      className="rounded-2xl p-5 space-y-3"
      style={{ background: col.bg, border: `2px solid ${col.border}` }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-5xl font-bold" style={{ color: col.text }}>
            {letter}
          </span>
          <div>
            <p className="font-semibold text-gray-700">
              {STATE_LABEL[stat.last_cognitive_state] ?? stat.last_cognitive_state}
            </p>
            <p className="text-sm text-gray-400">{stat.sessions_count} sessions</p>
          </div>
        </div>
        <TrendBadge trend={stat.trend} />
      </div>

      <div>
        <p className="text-xs text-gray-400 mb-1 uppercase tracking-wide">
          Average mistake rate
        </p>
        <ErrorBar value={stat.avg_error_rate_pct} />
      </div>

      {stat.confused_with.length > 0 && (
        <div>
          <p className="text-xs text-gray-400 mb-1 uppercase tracking-wide">
            Often confused with
          </p>
          <div className="flex gap-2 flex-wrap">
            {stat.confused_with.map((pair) => (
              <span
                key={pair}
                className="text-sm font-bold px-3 py-1 rounded-full bg-white border"
                style={{ borderColor: col.border, color: col.text }}
              >
                {pair}
              </span>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export function ProgressScreen() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [report, setReport] = useState<ProgressReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedLetter, setSelectedLetter] = useState<string | null>(null);

  useEffect(() => {
    fetchProgressReport().then((r) => {
      setReport(r);
      setLoading(false);
      // Auto-select first practiced letter
      if (r && !r.empty) {
        const first = LETTER_SEQUENCE.find((l) => r.letter_stats[l]);
        setSelectedLetter(first ?? null);
      }
    });
  }, []);

  const avatarEmoji = user?.user_metadata?.avatar ?? "🐻";

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="h-screen bg-gradient-to-br from-[#FFF8F0] to-[#F0F4FF] flex flex-col items-center justify-center gap-6">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          className="text-6xl"
        >
          ✨
        </motion.div>
        <p className="text-2xl text-gray-500 tracking-wide">
          Preparing your report…
        </p>
        <p className="text-base text-gray-400">Our AI is reading your progress</p>
      </div>
    );
  }

  // ── Empty state ──────────────────────────────────────────────────────────
  if (!report || report.empty) {
    return (
      <div className="h-screen bg-gradient-to-br from-[#FFF8F0] to-[#F0F4FF] flex flex-col items-center justify-center gap-6 p-8">
        <div className="text-8xl">📚</div>
        <h1 className="text-4xl font-bold text-gray-700 text-center">
          No sessions yet!
        </h1>
        <p className="text-xl text-gray-500 text-center max-w-sm">
          {report?.message ?? "Complete some practice sessions to see your progress report here."}
        </p>
        <button
          onClick={() => navigate("/resume")}
          className="mt-4 bg-amber-400 hover:bg-amber-500 text-white font-bold text-xl px-8 py-4 rounded-2xl transition-all"
        >
          Start Learning
        </button>
      </div>
    );
  }

  const { ai_insights, letter_stats, total_sessions, letters_mastered } = report;
  const masteryPct = Math.round((letters_mastered / LETTER_SEQUENCE.length) * 100);
  const practicedLetters = LETTER_SEQUENCE.filter((l) => letter_stats[l]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FFF8F0] via-[#FAFAFA] to-[#F0F4FF] overflow-y-auto">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-gray-100 px-6 py-4 flex items-center gap-4">
        <button
          onClick={() => navigate("/resume")}
          className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft size={24} className="text-gray-600" />
        </button>
        <h1 className="text-2xl font-bold text-gray-800 tracking-wide">
          Learning Report
        </h1>
        <span className="ml-auto text-sm text-gray-400">
          {total_sessions} sessions total
        </span>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-8 space-y-8">

        {/* ── Hero card ────────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-amber-400 to-orange-400 rounded-3xl p-6 text-white shadow-xl"
        >
          <div className="flex items-center gap-4 mb-4">
            <motion.div
              animate={{ rotate: [0, 8, -8, 0] }}
              transition={{ duration: 3, repeat: Infinity }}
              className="text-6xl"
            >
              {avatarEmoji}
            </motion.div>
            <div>
              <p className="text-white/80 text-sm uppercase tracking-widest font-medium">
                Hey {report.display_name}!
              </p>
              <p className="text-2xl font-bold leading-snug mt-1">
                {ai_insights.encouragement}
              </p>
            </div>
          </div>

          {/* Mastery progress bar */}
          <div className="bg-white/20 rounded-2xl p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-white font-semibold">Letters mastered</span>
              <span className="text-white font-bold text-xl">
                {letters_mastered} / {LETTER_SEQUENCE.length}
              </span>
            </div>
            <div className="h-3 bg-white/30 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${masteryPct}%` }}
                transition={{ duration: 1, ease: "easeOut", delay: 0.3 }}
                className="h-full bg-white rounded-full"
              />
            </div>
            <div className="flex justify-between mt-2">
              {LETTER_SEQUENCE.map((l) => (
                <span
                  key={l}
                  className="text-sm font-bold w-8 h-8 flex items-center justify-center rounded-full"
                  style={{
                    background: letter_stats[l]?.mastered
                      ? "rgba(255,255,255,0.9)"
                      : letter_stats[l]
                        ? "rgba(255,255,255,0.4)"
                        : "rgba(255,255,255,0.15)",
                    color: letter_stats[l]?.mastered ? "#EA580C" : "white",
                  }}
                >
                  {l}
                </span>
              ))}
            </div>
          </div>
        </motion.div>

        {/* ── AI overall message ────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100"
        >
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={20} className="text-amber-500" />
            <h2 className="text-lg font-bold text-gray-700">AI Summary</h2>
            <span className="text-xs text-gray-400 ml-auto">For parents & teachers</span>
          </div>
          <p className="text-gray-600 leading-relaxed text-base">
            {ai_insights.overall_message}
          </p>
        </motion.div>

        {/* ── Strengths & Focus ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-green-50 rounded-3xl p-5 border border-green-200"
          >
            <div className="flex items-center gap-2 mb-3">
              <Star size={18} className="text-green-600" />
              <h3 className="font-bold text-green-700">Going well</h3>
            </div>
            <ul className="space-y-2">
              {ai_insights.strengths.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-green-700 text-sm leading-snug">
                  <span className="mt-0.5 text-green-500 font-bold">✓</span>
                  {s}
                </li>
              ))}
            </ul>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.25 }}
            className="bg-amber-50 rounded-3xl p-5 border border-amber-200"
          >
            <div className="flex items-center gap-2 mb-3">
              <Target size={18} className="text-amber-600" />
              <h3 className="font-bold text-amber-700">Focus on</h3>
            </div>
            <ul className="space-y-2">
              {ai_insights.focus_areas.map((f, i) => (
                <li key={i} className="flex items-start gap-2 text-amber-700 text-sm leading-snug">
                  <span className="mt-0.5 text-amber-500 font-bold">→</span>
                  {f}
                </li>
              ))}
            </ul>
          </motion.div>
        </div>

        {/* ── Letter-by-letter breakdown ────────────────────────────────────── */}
        {practicedLetters.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp size={20} className="text-blue-500" />
              <h2 className="text-lg font-bold text-gray-700">Letter by Letter</h2>
            </div>

            {/* Letter selector pills */}
            <div className="flex gap-3 mb-4 flex-wrap">
              {practicedLetters.map((l) => {
                const col = LETTER_COLOR[l] ?? { border: "#D1D5DB", text: "#374151", bg: "#F9FAFB" };
                const isSelected = selectedLetter === l;
                return (
                  <button
                    key={l}
                    onClick={() => setSelectedLetter(l)}
                    className="w-14 h-14 rounded-2xl text-2xl font-bold transition-all"
                    style={{
                      background: isSelected ? col.border : col.bg,
                      border: `2px solid ${col.border}`,
                      color: isSelected ? "white" : col.text,
                      transform: isSelected ? "scale(1.1)" : "scale(1)",
                      boxShadow: isSelected ? `0 4px 16px ${col.border}60` : "none",
                    }}
                  >
                    {l}
                  </button>
                );
              })}
            </div>

            {/* Selected letter panel */}
            <AnimatePresence mode="wait">
              {selectedLetter && letter_stats[selectedLetter] && (
                <div key={selectedLetter}>
                  <LetterPanel
                    letter={selectedLetter}
                    stat={letter_stats[selectedLetter]}
                    insight={ai_insights.letter_insights?.[selectedLetter]}
                  />
                  {ai_insights.letter_insights?.[selectedLetter] && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="mt-3 text-sm text-gray-500 italic px-1"
                    >
                      💬 {ai_insights.letter_insights[selectedLetter]}
                    </motion.p>
                  )}
                </div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* ── Not-yet-started letters ───────────────────────────────────────── */}
        {LETTER_SEQUENCE.filter((l) => !letter_stats[l]).length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="bg-gray-50 rounded-3xl p-5 border border-gray-200"
          >
            <p className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">
              Coming up next
            </p>
            <div className="flex gap-3">
              {LETTER_SEQUENCE.filter((l) => !letter_stats[l]).map((l, i) => (
                <motion.div
                  key={l}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4 + i * 0.08 }}
                  className="w-14 h-14 rounded-2xl bg-white border-2 border-dashed border-gray-300 flex items-center justify-center text-2xl text-gray-400 font-bold"
                >
                  {l}
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── Footer spacer ─────────────────────────────────────────────────── */}
        <div className="h-8" />
      </div>
    </div>
  );
}
