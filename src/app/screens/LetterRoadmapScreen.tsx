import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useLevelConfig } from "../hooks/useLevelConfig";
import { useSession } from "../contexts/SessionContext";
import { useAccount } from "../contexts/AccountContext";
import { LESSON_KINDS, LESSON_LABEL, TEACHING_ORDER } from "../data/curriculum";
import { prepareSessionConfig } from "../api/client";
import { loadLetterStatuses } from "../lib/learnerProfile";
import {
  completionScore,
  pageAverage,
  pageLetters,
  pageOpen,
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
        // Open on the unit the child is working in: the first open page with a
        // letter still to finish. With eight units, always opening on the
        // first one left a child several taps from their own letters.
        const pages = Array.from({ length: TOTAL_PAGES }, (_, i) => i).filter((i) => pageOpen(i, statuses));
        const working = pages.find((i) => pageLetters(i).some((l) => !statuses[l]?.complete));
        setCurrentPage(working ?? pages[pages.length - 1] ?? 0);
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

  const handleCardClick = async (letter: string) => {
    const index = TEACHING_ORDER.indexOf(letter);
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

  // The current page's letters: one unit of the course.
  const activeLetters = pageLetters(currentPage);

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
            Progress on this unit: <span className="font-bold text-gray-700">{getPageAverageScore(currentPage)}%</span> average
          </p>
        </div>

        {/* Paginated Navigation Slider Bar */}
        {/* Centred as one group rather than justify-between across the full
            width: at tablet size that stranded each arrow against an opposite
            edge, a long way from the dots they act on. */}
        <div className="shrink-0 flex items-center justify-center gap-[var(--gap-screen)]">
          <button
            onClick={handlePrevPage}
            aria-label="Previous unit"
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

          {/* Where the child is among the units. Before G1 this was a row of
              numbered dots, one per page: four fitted a phone, eight units do
              not (8 × 44px is wider than a 360px screen before the arrows). */}
          <p className="t-0 font-bold text-gray-700 tracking-wide text-center tabular-nums" aria-live="polite">
            Unit {currentPage + 1} of {TOTAL_PAGES}
          </p>

          <button
            onClick={handleNextPage}
            aria-label={nextUnlocked ? "Next unit" : "Next unit: not open yet"}
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
          {activeLetters.map((letter) => {
            const score = getCompletionScore(letter);
            const lessons = statuses[letter]?.lessons;
            const isStarting = startingLetter === letter;

            return (
              <motion.div
                key={letter}
                whileHover={pageUnlocked && !isStarting ? { scale: 1.05 } : {}}
                whileTap={pageUnlocked && !isStarting ? { scale: 0.95 } : {}}
                onClick={() => handleCardClick(letter)}
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

                {/* The letter's three lessons: filled once finished. Shape, not
                    colour alone, carries it — a ring against a disc. */}
                <div
                  className="flex gap-1.5"
                  role="img"
                  aria-label={LESSON_KINDS.map(
                    (k) => `${LESSON_LABEL[k]}: ${lessons?.[k] ? "done" : "to do"}`,
                  ).join(", ")}
                >
                  {LESSON_KINDS.map((k) => (
                    <span
                      key={k}
                      className={`block rounded-full border-2 ${
                        !pageUnlocked
                          ? "border-gray-300"
                          : lessons?.[k]
                            ? "bg-[#2F6FB7] border-[#2F6FB7]"
                            : "bg-white border-[#2F6FB7]"
                      }`}
                      style={{ width: "0.6rem", height: "0.6rem" }}
                    />
                  ))}
                </div>

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
