import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useNavigate } from "react-router";
import { TopBar } from "../components/TopBar";
import { useLevelConfig } from "../hooks/useLevelConfig";
import { useAuth } from "../contexts/AuthContext";
import { useSessionTracker } from "../hooks/useSessionTracker";
import { getLetterContent } from "../data/letterContent";
import { fetchProgressReport } from "../api/client";
import { speakHindi } from "../utils/speech";
import { playSuccessSound, playErrorSound, playEncouragementSound } from "../utils/soundEffects";
import { motion, AnimatePresence } from "motion/react";
import { Volume2, ArrowRight } from "lucide-react";
import type { ModuleType } from "../types/levelConfig";

// Default static visual similarity index (same as MemoryGameScreen)
const SIMILARITY_MAP: Record<string, string[]> = {
  "क": ["ख", "फ", "ट", "ठ"],
  "ख": ["क", "ष", "थ", "ब"],
  "ग": ["घ", "ध", "ज", "ञ"],
  "घ": ["ग", "ध", "ज", "ञ"],
  "ङ": ["ड", "ढ", "इ", "झ"],
  "च": ["ज", "झ", "ञ", "द"],
  "छ": ["च", "ह", "ध", "घ"],
  "ज": ["झ", "च", "ञ", "द"],
  "झ": ["ज", "ङ", "ड", "इ"],
  "ञ": ["ज", "च", "झ", "न"],
  "ट": ["ठ", "ड", "ढ", "द"],
  "ठ": ["ट", "ड", "ढ", "द"],
  "ड": ["ङ", "ढ", "झ", "इ"],
  "ढ": ["ड", "ट", "ठ", "द"],
  "ण": ["न", "त", "म", "ब"],
  "त": ["न", "थ", "ध", "म"],
  "थ": ["त", "ध", "य", "प"],
  "द": ["ट", "ठ", "ढ", "ह"],
  "ध": ["घ", "ग", "ज", "ञ"],
  "न": ["त", "ध", "म", "ब"],
  "प": ["य", "ष", "फ", "ण"],
  "फ": ["प", "क", "ष", "ण"],
  "ब": ["व", "भ", "ध", "ण"],
  "भ": ["म", "ध", "न", "ब"],
  "म": ["भ", "ध", "न", "ब"],
  "य": ["प", "ष", "फ", "ण"],
  "र": ["स", "ख", "च", "ड"],
  "ल": ["त", "न", "म", "ब"],
  "व": ["ब", "भ", "ध", "ण"],
  "श": ["ष", "स", "ख", "य"],
  "ष": ["प", "य", "फ", "ख"],
  "स": ["ष", "श", "र", "ख"],
  "ह": ["ड", "ढ", "इ", "ट"],
};

interface WordQuestion {
  word: string;
  image: string;
  meaning: string;
  blankIndex: number; // index of the letter in the word that is blanked
  correctLetter: string;
  options: string[];
}

const QUESTIONS_PER_ROUND = 3;

/**
 * Builds a set of word fill-in-the-blank questions for the current target letter.
 * The blank is placed at the position of the target letter in each word.
 * Distractors are pulled from the student's cognitive profile, falling back to SIMILARITY_MAP.
 */
async function buildQuestions(
  targetLetter: string,
  confusedLetters: string[],
): Promise<WordQuestion[]> {
  const { exampleWords } = getLetterContent(targetLetter);
  if (exampleWords.length === 0) return [];

  // Get distractors: prioritise student-specific confusions, fallback to static map
  let distractors = confusedLetters.filter((l) => l !== targetLetter);
  const staticPool = SIMILARITY_MAP[targetLetter] || [];
  staticPool.forEach((l) => {
    if (distractors.length < 3 && l !== targetLetter && !distractors.includes(l)) {
      distractors.push(l);
    }
  });
  while (distractors.length < 2) {
    const filler = ["म", "ग", "ब"].find(
      (l) => l !== targetLetter && !distractors.includes(l),
    );
    distractors.push(filler || "म");
  }
  distractors = distractors.slice(0, 3);

  const questions: WordQuestion[] = exampleWords
    .slice(0, QUESTIONS_PER_ROUND)
    .map((item) => {
      // Find the position of the target letter in the word
      const chars = [...item.word];
      let blankIndex = chars.findIndex((ch) => ch === targetLetter);
      if (blankIndex === -1) blankIndex = 0; // fallback

      const correctLetter = chars[blankIndex];

      // Build options: correct + 2-3 distractors, shuffled
      const opts = [correctLetter, ...distractors.slice(0, 3)];
      for (let i = opts.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [opts[i], opts[j]] = [opts[j], opts[i]];
      }

      return {
        word: item.word,
        image: item.image,
        meaning: item.meaning,
        blankIndex,
        correctLetter,
        options: opts,
      };
    });

  return questions;
}

export function WordFillBlankScreen() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const userId = user?.id ?? "offline";
  const { levelConfig, currentLetter, sessionNumber } = useLevelConfig();
  const tracker = useSessionTracker({
    userId,
    targetAlphabet: levelConfig.target_alphabet,
    sessionNumber,
  });

  const [questions, setQuestions] = useState<WordQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [consecutiveFails, setConsecutiveFails] = useState(0);
  const [showCompletionModal, setShowCompletionModal] = useState(false);

  const audioEndTimeRef = useRef<number | null>(null);
  const processingRef = useRef(false);

  const currentQuestion = questions[currentIndex] ?? null;

  // Initialise questions from cognitive profile
  useEffect(() => {
    async function init() {
      setLoading(true);
      let confusedLetters: string[] = [];
      try {
        const report = await fetchProgressReport();
        if (report?.letter_stats?.[currentLetter]) {
          confusedLetters =
            report.letter_stats[currentLetter].confused_with || [];
        }
      } catch {
        // fallback to static map
      }
      const qs = await buildQuestions(currentLetter, confusedLetters);
      setQuestions(qs);
      setCurrentIndex(0);
      setSelectedOption(null);
      setIsCorrect(null);
      setConsecutiveFails(0);
      setLoading(false);
    }
    init();
  }, [currentLetter]);

  // Auto-play word audio when question changes
  useEffect(() => {
    if (currentQuestion && !loading) {
      playWordAudio();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, loading]);

  const playWordAudio = useCallback(() => {
    if (!currentQuestion) return;
    speakHindi(currentQuestion.word, () => {
      audioEndTimeRef.current = performance.now();
      tracker.markAudioEnd();
    });
  }, [currentQuestion, tracker]);

  const handleOptionClick = useCallback(
    (option: string) => {
      if (processingRef.current || isCorrect !== null) return;
      processingRef.current = true;
      setSelectedOption(option);

      const latency =
        audioEndTimeRef.current != null
          ? performance.now() - audioEndTimeRef.current
          : 0;

      const moduleType: ModuleType = "dissimilar";

      if (option === currentQuestion?.correctLetter) {
        setIsCorrect(true);
        setConsecutiveFails(0);
        playSuccessSound();

        tracker.recordAttempt({
          targetLetter: currentQuestion.correctLetter,
          selectedLetter: option,
          moduleType,
          timeToInteractMs: latency,
        });

        setTimeout(() => {
          if (currentIndex < questions.length - 1) {
            setCurrentIndex((prev) => prev + 1);
            setSelectedOption(null);
            setIsCorrect(null);
            audioEndTimeRef.current = null;
            processingRef.current = false;
          } else {
            setShowCompletionModal(true);
          }
        }, 1200);
      } else {
        setIsCorrect(false);
        const nextFails = consecutiveFails + 1;
        setConsecutiveFails(nextFails);
        playErrorSound();

        tracker.recordAttempt({
          targetLetter: currentQuestion!.correctLetter,
          selectedLetter: option,
          moduleType,
          timeToInteractMs: latency,
        });

        setTimeout(() => {
          if (nextFails >= 2) {
            // Guided win — highlight and auto-advance
            tracker.recordGuidedWin(currentQuestion!.correctLetter, moduleType);
            setSelectedOption(currentQuestion!.correctLetter);
            setIsCorrect(true);
            setConsecutiveFails(0);
            playEncouragementSound();

            setTimeout(() => {
              if (currentIndex < questions.length - 1) {
                setCurrentIndex((prev) => prev + 1);
                setSelectedOption(null);
                setIsCorrect(null);
                audioEndTimeRef.current = null;
                processingRef.current = false;
              } else {
                setShowCompletionModal(true);
              }
            }, 1500);
          } else {
            setSelectedOption(null);
            setIsCorrect(null);
            processingRef.current = false;
          }
        }, 1500);
      }
    },
    [
      currentQuestion,
      currentIndex,
      questions.length,
      consecutiveFails,
      isCorrect,
      tracker,
    ],
  );

  // Render the word with a blank
  const renderWordWithBlank = useMemo(() => {
    if (!currentQuestion) return null;
    const chars = [...currentQuestion.word];
    return (
      <div className="flex items-center justify-center gap-1">
        {chars.map((ch, i) => {
          if (i === currentQuestion.blankIndex) {
            return (
              <motion.span
                key={i}
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 border-b-4 border-dashed border-[#4A90E2] text-4xl sm:text-5xl font-black text-[#4A90E2]"
              >
                {isCorrect === true && selectedOption
                  ? selectedOption
                  : "?"}
              </motion.span>
            );
          }
          return (
            <span
              key={i}
              className="text-4xl sm:text-5xl font-black text-gray-800"
            >
              {ch}
            </span>
          );
        })}
      </div>
    );
  }, [currentQuestion, isCorrect, selectedOption]);

  if (loading || questions.length === 0) {
    return (
      <div className="h-screen bg-[#F7F6F2] flex flex-col items-center justify-center gap-4">
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-4 h-4 bg-[#4A90E2] rounded-full"
              animate={{ y: [0, -12, 0] }}
              transition={{
                duration: 0.6,
                repeat: Infinity,
                delay: i * 0.15,
              }}
            />
          ))}
        </div>
        <p className="text-xl text-gray-500 tracking-wide font-medium">
          Building your word challenge...
        </p>
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#F7F6F2] flex flex-col overflow-hidden relative">
      <TopBar
        avatarEmoji={user?.user_metadata?.avatar ?? "🐻"}
        progress={75}
        onExit={() => navigate("/roadmap")}
      />

      <div className="flex-1 flex flex-col items-center justify-center gap-5 sm:gap-7 p-4 sm:p-8">
        {/* Progress dots */}
        <div className="flex gap-3 justify-center select-none">
          {questions.map((_, i) => (
            <div
              key={i}
              className={`w-3.5 h-3.5 rounded-full transition-all duration-300 ${
                i < currentIndex
                  ? "bg-emerald-500 shadow-sm"
                  : i === currentIndex
                    ? "bg-[#4A90E2] scale-125 shadow-md ring-4 ring-blue-100"
                    : "bg-gray-300"
              }`}
            />
          ))}
        </div>

        {/* Title */}
        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-800 tracking-wide text-center">
          Fill in the missing letter ✏️
        </h1>

        {/* Image + Audio Card */}
        <div className="bg-white rounded-3xl border-4 border-gray-200 p-6 sm:p-8 flex flex-col items-center gap-4 shadow-lg max-w-sm w-full">
          <div className="text-7xl sm:text-8xl select-none">
            {currentQuestion?.image}
          </div>
          <p className="text-lg text-gray-500 font-medium tracking-wide">
            {currentQuestion?.meaning}
          </p>
          <button
            onClick={playWordAudio}
            className="flex items-center gap-2 bg-[#EFF6FF] hover:bg-[#DBEAFE] text-[#4A90E2] font-bold px-5 py-2.5 rounded-2xl transition-colors"
          >
            <Volume2 size={22} /> Play Sound
          </button>
        </div>

        {/* Word with blank */}
        {renderWordWithBlank}

        {/* Letter options */}
        <div className="flex gap-4 sm:gap-6 flex-wrap justify-center">
          {currentQuestion?.options.map((option) => {
            let optionStyle =
              "bg-white border-4 border-gray-300 hover:border-[#4A90E2] hover:shadow-lg";
            if (selectedOption === option && isCorrect === true) {
              optionStyle =
                "bg-emerald-500 border-4 border-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.4)]";
            } else if (selectedOption === option && isCorrect === false) {
              optionStyle = "bg-white border-4 border-red-400";
            }

            return (
              <motion.button
                key={option}
                whileTap={{ scale: 0.93 }}
                animate={
                  selectedOption === option && isCorrect === false
                    ? { x: [0, -8, 8, -8, 0] }
                    : {}
                }
                transition={{ duration: 0.3 }}
                onClick={() => handleOptionClick(option)}
                className={`w-20 h-20 sm:w-24 sm:h-24 rounded-2xl cursor-pointer transition-all duration-200 flex items-center justify-center text-4xl sm:text-5xl font-black ${optionStyle}`}
              >
                {option}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Completion Modal */}
      <AnimatePresence>
        {showCompletionModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-6 z-50"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl text-center space-y-6 border border-gray-100"
            >
              <span className="text-7xl">🎯</span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-800">
                Words Complete!
              </h2>
              <p className="text-lg text-gray-500">
                You filled in all the missing letters correctly!
              </p>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate("/word-spelling")}
                className="bg-[#4A90E2] text-white rounded-3xl px-10 py-4 text-xl font-bold hover:bg-[#357ABD] transition-colors flex items-center gap-2 mx-auto"
              >
                Spelling Challenge! <ArrowRight size={22} />
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
