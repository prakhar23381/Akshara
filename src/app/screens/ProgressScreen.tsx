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

const PALETTES = [
  { bg: "#FFF7ED", border: "#FED7AA", text: "#EA580C" }, // Amber/Orange
  { bg: "#F0FDF4", border: "#BBF7D0", text: "#16A34A" }, // Green
  { bg: "#EFF6FF", border: "#BFDBFE", text: "#2563EB" }, // Blue
  { bg: "#FDF4FF", border: "#F5D0FE", text: "#9333EA" }, // Purple
  { bg: "#FFF1F2", border: "#FECDD3", text: "#E11D48" }, // Red
  { bg: "#ECFDF5", border: "#A7F3D0", text: "#059669" }, // Teal
  { bg: "#FFFBEB", border: "#FEF3C7", text: "#D97706" }, // Yellow
];

function getLetterColors(letter: string) {
  const code = letter.charCodeAt(0) % PALETTES.length;
  return PALETTES[code];
}

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
  const col = getLetterColors(letter);
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
    <div className="min-h-screen bg-gradient-to-tr from-[#FFF8F0] via-[#FAF9F6] to-[#EEF5FF] overflow-y-auto relative pb-10">
      
      {/* Decorative background fluid blobs */}
      <div className="absolute top-20 right-5 w-80 h-80 bg-orange-100/40 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-20 left-5 w-96 h-96 bg-blue-100/30 rounded-full blur-3xl pointer-events-none" />

      {/* ── Sticky Premium Header ─────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 bg-white/70 backdrop-blur-md border-b border-gray-200/50 px-6 py-4 flex items-center gap-4">
        <button
          onClick={() => navigate("/resume")}
          className="p-2.5 rounded-2xl hover:bg-gray-100/80 hover:scale-105 active:scale-95 transition-all text-gray-600 border border-transparent hover:border-gray-200"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-xl sm:text-2xl font-black bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent tracking-wide">
            Learning Report
          </h1>
        </div>
        <span className="ml-auto text-xs sm:text-sm font-bold bg-white border border-gray-200 px-3 py-1.5 rounded-full text-gray-500 shadow-sm">
          📊 {total_sessions} sessions total
        </span>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-8 space-y-8 relative z-10">

        {/* ── Hero Console Card ────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 100 }}
          className="bg-gradient-to-br from-amber-400 via-orange-400 to-rose-400 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-orange-300/30 relative overflow-hidden"
        >
          {/* Subtle light reflections */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-white/10 pointer-events-none" />
          
          <div className="flex items-center gap-4 mb-6">
            <motion.div
              animate={{ rotate: [0, 6, -6, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="text-6xl sm:text-7xl filter drop-shadow-md select-none"
            >
              {avatarEmoji}
            </motion.div>
            <div>
              <p className="text-white/80 text-xs sm:text-sm uppercase tracking-widest font-black">
                Hey {report.display_name}!
              </p>
              <p className="text-xl sm:text-2xl font-black leading-snug mt-1 drop-shadow-sm">
                {ai_insights.encouragement}
              </p>
            </div>
          </div>

          {/* Mastery progress bar */}
          <div className="bg-white/15 backdrop-blur-md rounded-2xl p-5 border border-white/10 shadow-inner">
            <div className="flex justify-between items-center mb-2">
              <span className="text-white text-sm sm:text-base font-extrabold uppercase tracking-wider">Letters mastered</span>
              <span className="text-white font-black text-xl sm:text-2xl drop-shadow-sm">
                {letters_mastered} <span className="text-white/60 text-sm">/ {LETTER_SEQUENCE.length}</span>
              </span>
            </div>
            <div className="h-3.5 bg-white/20 rounded-full overflow-hidden p-0.5 border border-white/5">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${masteryPct}%` }}
                transition={{ duration: 1.2, ease: "easeOut", delay: 0.3 }}
                className="h-full bg-white rounded-full shadow-md"
              />
            </div>
            <div className="flex justify-between mt-3 gap-1">
              {LETTER_SEQUENCE.map((l) => (
                <span
                  key={l}
                  className="text-xs sm:text-sm font-black w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-full transition-all border border-transparent"
                  style={{
                    background: letter_stats[l]?.mastered
                      ? "rgba(255,255,255,0.95)"
                      : letter_stats[l]
                        ? "rgba(255,255,255,0.4)"
                        : "rgba(255,255,255,0.12)",
                    color: letter_stats[l]?.mastered ? "#EA580C" : "white",
                    border: letter_stats[l]?.mastered ? "1px solid #F59E0B" : "none",
                    boxShadow: letter_stats[l]?.mastered ? "0 2px 4px rgba(0,0,0,0.1)" : "none",
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
          className="bg-white/70 backdrop-blur-md rounded-3xl p-6 shadow-md border border-white/60"
        >
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={18} className="text-amber-500 fill-amber-500 animate-pulse" />
            <h2 className="text-base sm:text-lg font-black text-gray-700">AI Summary</h2>
            <span className="text-[10px] sm:text-xs font-bold text-gray-400 ml-auto uppercase tracking-wider">Parents & Teachers Guide</span>
          </div>
          <p className="text-gray-600 leading-relaxed text-sm sm:text-base font-medium">
            {ai_insights.overall_message}
          </p>
        </motion.div>

        {/* ── Strengths & Focus ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-emerald-50/60 backdrop-blur-sm rounded-3xl p-5 border border-emerald-200/60 shadow-sm"
          >
            <div className="flex items-center gap-2 mb-3">
              <Star size={16} className="text-emerald-600 fill-emerald-600" />
              <h3 className="font-black text-emerald-800 text-sm sm:text-base">Going Well</h3>
            </div>
            <ul className="space-y-2">
              {ai_insights.strengths.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-emerald-800 text-xs sm:text-sm leading-snug font-medium">
                  <span className="mt-0.5 text-emerald-500 font-black">✓</span>
                  {s}
                </li>
              ))}
            </ul>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.25 }}
            className="bg-amber-50/60 backdrop-blur-sm rounded-3xl p-5 border border-amber-200/60 shadow-sm"
          >
            <div className="flex items-center gap-2 mb-3">
              <Target size={16} className="text-amber-600 fill-amber-600" />
              <h3 className="font-black text-amber-800 text-sm sm:text-base">Focus Areas</h3>
            </div>
            <ul className="space-y-2">
              {ai_insights.focus_areas.map((f, i) => (
                <li key={i} className="flex items-start gap-2 text-amber-800 text-xs sm:text-sm leading-snug font-medium">
                  <span className="mt-0.5 text-amber-500 font-black">→</span>
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
            className="space-y-4"
          >
            <div className="flex items-center gap-2">
              <TrendingUp size={18} className="text-blue-500" />
              <h2 className="text-base sm:text-lg font-black text-gray-700">Practice Analysis</h2>
            </div>

            {/* Letter selector pills with 3D keycap effect */}
            <div className="flex gap-3 mb-2 flex-wrap select-none">
              {practicedLetters.map((l) => {
                const col = getLetterColors(l);
                const isSelected = selectedLetter === l;
                return (
                  <motion.button
                    key={l}
                    onClick={() => setSelectedLetter(l)}
                    whileHover={{ y: -2 }}
                    whileTap={{ y: 2 }}
                    className="w-14 h-14 rounded-2xl text-2xl font-black transition-all duration-100 flex items-center justify-center"
                    style={{
                      background: isSelected ? col.border : "rgba(255,255,255,0.7)",
                      border: isSelected ? `2px solid ${col.text}` : `2px solid ${col.border}40`,
                      color: isSelected ? "white" : col.text,
                      boxShadow: isSelected 
                        ? `0 10px 20px -5px ${col.border}, inset 0 -4px 0 rgba(0,0,0,0.15)` 
                        : `0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03), inset 0 -4px 0 ${col.border}40`,
                    }}
                  >
                    {l}
                  </motion.button>
                );
              })}
            </div>

            {/* Selected letter panel */}
            <AnimatePresence mode="wait">
              {selectedLetter && letter_stats[selectedLetter] && (
                <motion.div
                  key={selectedLetter}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <LetterPanel
                    letter={selectedLetter}
                    stat={letter_stats[selectedLetter]}
                    insight={ai_insights.letter_insights?.[selectedLetter]}
                  />
                  {ai_insights.letter_insights?.[selectedLetter] && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="mt-3 text-xs sm:text-sm text-gray-500 font-bold italic px-3 py-2.5 bg-white/40 border border-gray-200/50 rounded-2xl backdrop-blur-sm shadow-sm"
                    >
                      💬 Parent Tip: {ai_insights.letter_insights[selectedLetter]}
                    </motion.div>
                  )}
                </motion.div>
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
            className="bg-gray-100/50 backdrop-blur-sm rounded-3xl p-5 border border-gray-200/50 shadow-sm"
          >
            <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">
              Upcoming Letters
            </p>
            <div className="flex gap-3 flex-wrap">
              {LETTER_SEQUENCE.filter((l) => !letter_stats[l]).map((l, i) => (
                <motion.div
                  key={l}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4 + i * 0.06 }}
                  className="w-14 h-14 rounded-2xl bg-white/50 border-2 border-dashed border-gray-300 flex items-center justify-center text-2xl text-gray-400 font-black"
                  style={{ boxShadow: "inset 0 -4px 0 rgba(0,0,0,0.04)" }}
                >
                  {l}
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
