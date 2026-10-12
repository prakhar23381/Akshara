import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useLevelConfig } from "../hooks/useLevelConfig";
import { useSession } from "../contexts/SessionContext";
import { useAccount } from "../contexts/AccountContext";
import { LETTER_SEQUENCE } from "../types/levelConfig";
import { prepareSessionConfig } from "../api/client";
import { loadLetterStatuses } from "../lib/learnerProfile";
import {
  completionScore,
  pageAverage,
  pageOpen,
  LETTERS_PER_PAGE,
  TOTAL_PAGES,
  type LetterStatus,
} from "../lib/letterStatus";
import { TopBar } from "../components/TopBar";
import { Lock, Trophy, Star, ChevronLeft, ChevronRight } from "lucide-react";
import { motion } from "motion/react";

export function LetterRoadmapScreen() {
  const navigate = useNavigate();
  // The child this device is playing as. Sessions, progress and the learner
  // profile are all theirs — this used to be the signed-in account.
  const { activeChild } = useAccount();
  const userId = activeChild?.id ?? "offline";
  const { setLevelConfig, jumpToLetterIndex, setLastAvgLatencyMs } = useLevelConfig();
  const { startSession } = useSession();

  const [statuses, setStatuses] = useState<Record<string, LetterStatus>>({});
  // Saved session counts, which number the next session on a letter.
  const [sessionsCount, setSessionsCount] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(0); // 0, 1, 2, 3
  const [startingLetter, setStartingLetter] = useState<string | null>(null);

  useEffect(() => {
    if (!activeChild) {
      setLoading(false);
      return;
    }

    // Each letter's status is judged from the child's answers on every load,
    // not read from the label saved when the session ended (see letterStatus.ts).
    async function fetchProgress() {
      try {
        const { statuses, saved } = await loadLetterStatuses(userId);
        setStatuses(statuses);
        setSessionsCount(
          Object.fromEntries(saved.map((row) => [row.letter, row.sessions_count ?? 0])),
        );
      } catch (e) {
        console.error("[Roadmap] Error:", e);
      } finally {
        setLoading(false);
      }
    }

    fetchProgress();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const getCompletionScore = (letter: string): number => completionScore(statuses[letter]);

  // The previous page averaging 75% opens a page — and a page the child has
  // already played on stays open, so a corrected mastery never takes it away.
  const isPageUnlocked = (pageIndex: number): boolean => pageOpen(pageIndex, statuses);

  const getPageAverageScore = (pageIndex: number): number =>
    Math.round(pageAverage(pageIndex, statuses));

  const handleNextPage = () => {
    if (currentPage < TOTAL_PAGES - 1 && isPageUnlocked(currentPage + 1)) {
      setCurrentPage((p) => p + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 0) {
      setCurrentPage((p) => p - 1);
    }
  };

  const handleCardClick = async (letter: string, index: number) => {
    const pageUnlocked = isPageUnlocked(currentPage);
    if (!pageUnlocked || startingLetter) return; // Grid is disabled if page is locked or starting
    setStartingLetter(letter);

    try {
      jumpToLetterIndex(index);

      // Build this session from the child's own history — their state on this
      // letter, the letters they confuse with it, their response times — then
      // open a session that every activity writes into. This used to ask the
      // engine about an empty attempt list, which could only ever return the
      // standard config.
      const levelConfig = await prepareSessionConfig(userId, letter);
      setLevelConfig(levelConfig);
      setLastAvgLatencyMs(levelConfig.hesitation_trigger_stage1_ms - 8000 || 6000);

      const prior = sessionsCount[letter] ?? 0;
      startSession({
        userId,
        letter,
        sessionNumber: prior + 1,
        levelConfig,
      });
      navigate("/play");
    } catch (err) {
      console.error("[Roadmap] Failed to start letter journey:", err);
      setStartingLetter(null);
    }
  };

  if (loading) {
    return (
      <div className="h-[100dvh] bg-[#F7F6F2] flex flex-col items-center justify-center gap-4 overflow-hidden">
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-4 h-4 bg-[#4A90E2] rounded-full"
              animate={{ y: [0, -12, 0] }}
              transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
            />
          ))}
        </div>
        <p className="text-xl text-gray-500 tracking-wide">Loading your roadmap...</p>
      </div>
    );
  }

  const pageUnlocked = isPageUnlocked(currentPage);
  const nextUnlocked = currentPage < TOTAL_PAGES - 1 && isPageUnlocked(currentPage + 1);

  // Get active letters for the current page
  const startIndex = currentPage * LETTERS_PER_PAGE;
  const endIndex = Math.min((currentPage + 1) * LETTERS_PER_PAGE, LETTER_SEQUENCE.length);
  const activeLetters = LETTER_SEQUENCE.slice(startIndex, endIndex);

  return (
    <div className="h-[100dvh] bg-[#F7F6F2] flex flex-col overflow-hidden relative">
      <TopBar
        avatarEmoji={activeChild?.avatar ?? "🐻"}
        progress={null}
        onExit={() => navigate("/resume")}
        action={
          <button
            onClick={() => navigate("/unlock?next=/home")}
            className="t--1 shrink-0 bg-white border-2 border-gray-300 rounded-full font-bold text-gray-600 hover:text-[#4A90E2] hover:border-[#4A90E2] transition-all px-3"
            style={{ minHeight: "var(--tap-min)" }}
          >
            ⚙️ Grown-ups
          </button>
        }
      />

      <div className="flex-1 min-h-0 flex flex-col overflow-hidden items-center" style={{ gap: "var(--gap-screen)", padding: "var(--pad-screen)" }}>
        <div className="text-center max-w-2xl">
          <h1 className="t-2 font-extrabold text-gray-800 tracking-wide">
            My letters
          </h1>
          <p className="t-0 text-gray-500 tracking-wide">
            Progress on Page {currentPage + 1}: <span className="font-bold text-gray-700">{getPageAverageScore(currentPage)}%</span> average
          </p>
        </div>

        {/* Paginated Navigation Slider Bar */}
        {/* Centred as one group rather than justify-between across the full
            width: at tablet size that stranded each arrow against an opposite
            edge, a long way from the dots they act on. */}
        <div className="shrink-0 flex items-center justify-center gap-[var(--gap-screen)]">
          <button
            onClick={handlePrevPage}
            disabled={currentPage === 0}
            style={{ width: "var(--tap-min)", height: "var(--tap-min)" }}
            className={`shrink-0 grid place-items-center rounded-full border-4 transition-all ${
              currentPage > 0
                ? "bg-white border-[#4A90E2] text-[#4A90E2] hover:bg-blue-50 active:scale-95"
                : "bg-gray-100 border-gray-200 text-gray-300 cursor-not-allowed"
            }`}
          >
            <ChevronLeft size={20} />
          </button>

          {/* Page Indicators */}
          <div className="flex gap-2 items-center">
            {Array.from({ length: TOTAL_PAGES }).map((_, i) => {
              const pageActive = i === currentPage;
              const pageOpen = isPageUnlocked(i);
              return (
                <div
                  key={i}
                  className={`flex flex-col items-center gap-1 select-none transition-all duration-300`}
                >
                  <div
                    onClick={() => pageOpen && setCurrentPage(i)}
                    style={{ width: "var(--tap-min)", height: "var(--tap-min)" }}
                    className={`grid place-items-center rounded-full border-4 font-bold t--1 cursor-pointer transition-all duration-300 ${
                      pageActive
                        ? "bg-[#4A90E2] border-[#4A90E2] text-white scale-110 shadow-md ring-4 ring-blue-100"
                        : pageOpen
                          ? "bg-white border-[#4A90E2] text-[#4A90E2] hover:bg-blue-50"
                          : "bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed"
                    }`}
                  >
                    {pageOpen ? i + 1 : <Lock size={16} />}
                  </div>
                </div>
              );
            })}
          </div>

          <button
            onClick={handleNextPage}
            disabled={!nextUnlocked}
            style={{ width: "var(--tap-min)", height: "var(--tap-min)" }}
            className={`shrink-0 grid place-items-center rounded-full border-4 transition-all ${
              nextUnlocked
                ? "bg-white border-[#4A90E2] text-[#4A90E2] hover:bg-blue-50 active:scale-95"
                : "bg-gray-100 border-gray-200 text-gray-300 cursor-not-allowed"
            }`}
          >
            {currentPage < TOTAL_PAGES - 1 && !nextUnlocked ? (
              <Lock size={20} className="text-gray-300" />
            ) : (
              <ChevronRight size={20} />
            )}
          </button>
        </div>

        {/* 10-Letter Grid */}
        <div className="flex-1 min-h-0 grid grid-cols-5 gap-2 sm:gap-3 md:gap-4 max-w-5xl w-full content-center overflow-hidden">
          {activeLetters.map((letter, idx) => {
            const index = startIndex + idx;
            const score = getCompletionScore(letter);
            const isStarting = startingLetter === letter;

            return (
              <motion.div
                key={letter}
                whileHover={pageUnlocked && !isStarting ? { scale: 1.05 } : {}}
                whileTap={pageUnlocked && !isStarting ? { scale: 0.95 } : {}}
                onClick={() => handleCardClick(letter, index)}
                className={`relative rounded-2xl border-4 p-2 flex flex-col items-center justify-center gap-1.5 min-h-0 transition-all cursor-pointer ${
                  pageUnlocked
                    ? score === 100
                      ? "bg-emerald-50 border-emerald-300 shadow-md hover:shadow-lg"
                      : "bg-white border-[#4A90E2] shadow-sm hover:shadow-md"
                    : "bg-gray-100 border-gray-200 opacity-60 cursor-not-allowed"
                }`}
              >
                {/* Status Indicator at top right */}
                <div className="absolute top-3 right-3 select-none">
                  {score === 100 ? (
                    <Trophy size={18} className="text-emerald-500" />
                  ) : score > 0 ? (
                    <Star size={14} className="text-amber-400 fill-amber-400" />
                  ) : null}
                </div>

                {/* Big Devanagari Glyph */}
                <span
                  style={{ fontSize: "clamp(1.5rem, 5.5vmin, 3rem)", lineHeight: 1 }}
                  className={`letter-glyph font-black transition-colors select-none ${
                    pageUnlocked
                      ? score === 100
                        ? "text-emerald-600"
                        : "text-gray-800"
                      : "text-gray-400"
                  }`}
                >
                  {isStarting ? "⏳" : letter}
                </span>

                {/* Progress Text */}
                <div className="text-center w-full">
                  {score === 100 ? (
                    <span className="t--1 font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full whitespace-nowrap">
                      Mastered ✓
                    </span>
                  ) : (
                    <div className="w-full flex flex-col items-center gap-1.5">
                      <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-[#4A90E2] h-full rounded-full transition-all duration-500"
                          style={{ width: `${score}%` }}
                        />
                      </div>
                      <span className="t--1 font-semibold text-gray-500 whitespace-nowrap">
                        {score === 0 ? "—" : `${score}%`}
                      </span>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
