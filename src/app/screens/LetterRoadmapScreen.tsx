import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useLevelConfig } from "../hooks/useLevelConfig";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";
import { LETTER_SEQUENCE } from "../types/levelConfig";
import { analyzeSession } from "../api/client";
import { TopBar } from "../components/TopBar";
import { Lock, Trophy, Sparkles, Star, ChevronLeft, ChevronRight } from "lucide-react";
import { motion } from "motion/react";

interface ProgressData {
  mastered: boolean;
  last_cognitive_state: string;
}

const LETTERS_PER_PAGE = 10;
const TOTAL_PAGES = 4;

export function LetterRoadmapScreen() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const userId = user?.id ?? "offline";
  const { setLevelConfig, jumpToLetterIndex, setLastAvgLatencyMs } = useLevelConfig();

  const [progressMap, setProgressMap] = useState<Record<string, ProgressData>>({});
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(0); // 0, 1, 2, 3
  const [startingLetter, setStartingLetter] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    async function fetchProgress() {
      try {
        const { data, error } = await supabase
          .from("letter_progress")
          .select("letter, mastered, last_cognitive_state")
          .eq("user_id", user!.id);

        if (error) {
          console.error("[Roadmap] Failed to fetch progress:", error);
        } else if (data) {
          const mapping: Record<string, ProgressData> = {};
          data.forEach((row) => {
            mapping[row.letter] = {
              mastered: row.mastered ?? false,
              last_cognitive_state: row.last_cognitive_state ?? "insufficient_data",
            };
          });
          setProgressMap(mapping);
        }
      } catch (e) {
        console.error("[Roadmap] Error:", e);
      } finally {
        setLoading(false);
      }
    }

    fetchProgress();
  }, [user]);

  // Compute completion score from last cognitive state
  const getCompletionScore = (letter: string): number => {
    const prog = progressMap[letter];
    if (!prog) return 0;
    if (prog.mastered || prog.last_cognitive_state === "visual_mastery") return 100;
    if (prog.last_cognitive_state === "feature_neglect") return 60;
    if (prog.last_cognitive_state === "gross_shape_blindness") return 25;
    return 0; // insufficient_data or default
  };

  // Determine if a page is unlocked (requires previous page average progress to be >= 75%)
  const isPageUnlocked = (pageIndex: number): boolean => {
    if (pageIndex === 0) return true; // Page 1 is always unlocked

    // Get previous page letters
    const prevPageLetters = LETTER_SEQUENCE.slice(
      (pageIndex - 1) * LETTERS_PER_PAGE,
      pageIndex * LETTERS_PER_PAGE
    );

    // Calculate average progress
    const totalScore = prevPageLetters.reduce((sum, letter) => sum + getCompletionScore(letter), 0);
    const avgScore = totalScore / prevPageLetters.length;

    return avgScore >= 75; // 75% average completion score to unlock the next page
  };

  // Calculate current page average completion score
  const getPageAverageScore = (pageIndex: number): number => {
    const pageLetters = LETTER_SEQUENCE.slice(
      pageIndex * LETTERS_PER_PAGE,
      Math.min((pageIndex + 1) * LETTERS_PER_PAGE, LETTER_SEQUENCE.length)
    );
    const totalScore = pageLetters.reduce((sum, letter) => sum + getCompletionScore(letter), 0);
    return Math.round(totalScore / pageLetters.length);
  };

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
      const response = await analyzeSession({
        user_id: userId,
        target_alphabet: letter,
        session_id: `sess_${Date.now()}`,
        session_number: 1,
        avg_latency_ms: 6000,
        consecutive_fails_peak: 0,
        attempts: [],
      });
      setLevelConfig(response.level_config);
      setLastAvgLatencyMs(response.level_config.hesitation_trigger_stage1_ms - 8000 || 6000);
      navigate("/animation");
    } catch (err) {
      console.error("[Roadmap] Failed to start letter journey:", err);
      setStartingLetter(null);
    }
  };

  if (loading) {
    return (
      <div className="h-screen bg-[#F7F6F2] flex flex-col items-center justify-center gap-4">
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
    <div className="h-screen bg-[#F7F6F2] flex flex-col overflow-hidden relative">
      <TopBar avatarEmoji={user?.user_metadata?.avatar ?? "🐻"} progress={0} onExit={() => navigate("/resume")} />

      {/* Parent Console shortcut */}
      <button
        onClick={() => navigate("/user-type")}
        className="absolute top-6 right-32 h-16 px-6 bg-white border-2 border-gray-300 rounded-full font-bold text-base text-gray-600 hover:text-[#4A90E2] hover:border-[#4A90E2] hover:shadow-md transition-all flex items-center gap-2 z-20"
      >
        ⚙️ Parents
      </button>

      <div className="flex-1 flex flex-col overflow-y-auto px-12 py-6 items-center gap-6">
        <div className="text-center max-w-2xl">
          <h1 className="text-4xl font-extrabold text-gray-800 tracking-wide mb-1 flex items-center justify-center gap-3">
            Devanagari Letters Roadmap <Sparkles className="text-amber-400" size={32} />
          </h1>
          <p className="text-xl text-gray-500 tracking-wide">
            Progress on Page {currentPage + 1}: <span className="font-bold text-gray-700">{getPageAverageScore(currentPage)}%</span> average
          </p>
        </div>

        {/* Paginated Navigation Slider Bar */}
        <div className="flex items-center gap-8 w-full max-w-5xl justify-between px-4">
          <button
            onClick={handlePrevPage}
            disabled={currentPage === 0}
            className={`p-4 rounded-full border-4 shadow-sm transition-all ${
              currentPage > 0
                ? "bg-white border-[#4A90E2] text-[#4A90E2] hover:bg-blue-50 active:scale-95"
                : "bg-gray-100 border-gray-200 text-gray-300 cursor-not-allowed"
            }`}
          >
            <ChevronLeft size={28} />
          </button>

          {/* Page Indicators */}
          <div className="flex gap-4 items-center">
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
                    className={`w-12 h-12 rounded-full border-4 flex items-center justify-center font-bold text-lg cursor-pointer transition-all duration-300 ${
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
            className={`p-4 rounded-full border-4 shadow-sm transition-all ${
              nextUnlocked
                ? "bg-white border-[#4A90E2] text-[#4A90E2] hover:bg-blue-50 active:scale-95"
                : "bg-gray-100 border-gray-200 text-gray-300 cursor-not-allowed"
            }`}
          >
            {currentPage < TOTAL_PAGES - 1 && !nextUnlocked ? (
              <Lock size={28} className="text-gray-300" />
            ) : (
              <ChevronRight size={28} />
            )}
          </button>
        </div>

        {/* 10-Letter Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-8 max-w-5xl w-full pb-16">
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
                className={`relative rounded-3xl border-4 p-6 flex flex-col items-center justify-between gap-4 h-48 transition-all cursor-pointer ${
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
                  className={`text-6xl font-black transition-colors select-none ${
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
                    <span className="text-xs font-bold text-emerald-600 bg-emerald-100 px-3 py-1 rounded-full">
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
                      <span className="text-xs font-semibold text-gray-500">
                        {score === 0 ? "Not started" : `${score}% Complete`}
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
