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
import { Volume2 } from "lucide-react";
import { AksharaButton } from "../components/AksharaButton";
import type { ModuleType } from "../types/levelConfig";

// Default static visual similarity index
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

interface SpellingQuestion {
  word: string;
  image: string;
  meaning: string;
  correctSpelling: string;
  options: string[]; // Array of full-word spelling options
}

const QUESTIONS_PER_ROUND = 3;

/**
 * Generates wrong spellings by replacing the target letter occurrence
 * in the word with visually confusable alternatives.
 */
function generateWrongSpellings(
  word: string,
  targetLetter: string,
  distractors: string[],
): string[] {
  const chars = [...word];
  const targetIndex = chars.findIndex((ch) => ch === targetLetter);
  if (targetIndex === -1) return [];

  const wrongSpellings: string[] = [];
  for (const distractor of distractors) {
    const modified = [...chars];
    modified[targetIndex] = distractor;
    const wrongWord = modified.join("");
    if (wrongWord !== word && !wrongSpellings.includes(wrongWord)) {
      wrongSpellings.push(wrongWord);
    }
    if (wrongSpellings.length >= 3) break;
  }
  return wrongSpellings;
}

async function buildQuestions(
  targetLetter: string,
  confusedLetters: string[],
): Promise<SpellingQuestion[]> {
  const { exampleWords } = getLetterContent(targetLetter);
  if (exampleWords.length === 0) return [];

  // Get distractors
  let distractors = confusedLetters.filter((l) => l !== targetLetter);
  const staticPool = SIMILARITY_MAP[targetLetter] || [];
  staticPool.forEach((l) => {
    if (distractors.length < 4 && l !== targetLetter && !distractors.includes(l)) {
      distractors.push(l);
    }
  });
  while (distractors.length < 3) {
    const filler = ["म", "ग", "ब"].find(
      (l) => l !== targetLetter && !distractors.includes(l),
    );
    distractors.push(filler || "म");
  }

  const questions: SpellingQuestion[] = exampleWords
    .slice(0, QUESTIONS_PER_ROUND)
    .map((item) => {
      const wrongSpellings = generateWrongSpellings(
        item.word,
        targetLetter,
        distractors,
      );

      // Build options: correct + wrong spellings, shuffled
      const options = [item.word, ...wrongSpellings.slice(0, 3)];
      for (let i = options.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [options[i], options[j]] = [options[j], options[i]];
      }

      return {
        word: item.word,
        image: item.image,
        meaning: item.meaning,
        correctSpelling: item.word,
        options,
      };
    });

  return questions;
}

export function WordSpellingScreen() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const userId = user?.id ?? "offline";
  const { levelConfig, currentLetter, sessionNumber } = useLevelConfig();
  const tracker = useSessionTracker({
    userId,
    targetAlphabet: levelConfig.target_alphabet,
    sessionNumber,
  });

  const [questions, setQuestions] = useState<SpellingQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [consecutiveFails, setConsecutiveFails] = useState(0);
  const [showCompletionModal, setShowCompletionModal] = useState(false);

  const audioEndTimeRef = useRef<number | null>(null);
  const processingRef = useRef(false);

  const currentQuestion = questions[currentIndex] ?? null;

  // Initialise questions
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

  // Auto-play word audio on question change
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

      if (option === currentQuestion?.correctSpelling) {
        setIsCorrect(true);
        setConsecutiveFails(0);
        playSuccessSound();

        tracker.recordAttempt({
          targetLetter: currentLetter,
          selectedLetter: currentLetter, // correct pick
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

        // Figure out which wrong letter was chosen
        const wrongChars = [...option];
        const correctChars = [...currentQuestion!.correctSpelling];
        let wrongLetter = currentLetter;
        for (let i = 0; i < wrongChars.length; i++) {
          if (wrongChars[i] !== correctChars[i]) {
            wrongLetter = wrongChars[i];
            break;
          }
        }

        tracker.recordAttempt({
          targetLetter: currentLetter,
          selectedLetter: wrongLetter,
          moduleType,
          timeToInteractMs: latency,
        });

        setTimeout(() => {
          if (nextFails >= 2) {
            // Guided win
            tracker.recordGuidedWin(currentLetter, moduleType);
            setSelectedOption(currentQuestion!.correctSpelling);
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
      currentLetter,
    ],
  );

  // Highlight the differing letter in each option compared to the correct word
  const renderSpellingOption = useCallback(
    (option: string) => {
      if (!currentQuestion) return option;
      const correctChars = [...currentQuestion.correctSpelling];
      const optionChars = [...option];

      return (
        <span className="flex items-center gap-0.5">
          {optionChars.map((ch, i) => {
            const isDifferent = i < correctChars.length && ch !== correctChars[i];
            return (
              <span
                key={i}
                className={`${
                  isDifferent
                    ? "text-[#E76F51] font-black"
                    : "text-gray-800 font-bold"
                }`}
              >
                {ch}
              </span>
            );
          })}
        </span>
      );
    },
    [currentQuestion],
  );

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
          Preparing your spelling challenge...
        </p>
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#F7F6F2] flex flex-col overflow-hidden relative">
      <TopBar
        avatarEmoji={user?.user_metadata?.avatar ?? "🐻"}
        progress={85}
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
          Which spelling is correct? 🔤
        </h1>

        {/* Image + Audio Card */}
        <div className="bg-white rounded-3xl border-4 border-gray-200 p-5 sm:p-7 flex flex-col items-center gap-3 shadow-lg max-w-xs w-full">
          <div className="text-6xl sm:text-7xl select-none">
            {currentQuestion?.image}
          </div>
          <p className="text-base text-gray-500 font-medium tracking-wide">
            {currentQuestion?.meaning}
          </p>
          <button
            onClick={playWordAudio}
            className="flex items-center gap-2 bg-[#EFF6FF] hover:bg-[#DBEAFE] text-[#4A90E2] font-bold px-5 py-2.5 rounded-2xl transition-colors"
          >
            <Volume2 size={22} /> Play Sound
          </button>
        </div>

        {/* Spelling options — vertically stacked for readability */}
        <div className="flex flex-col gap-3 w-full max-w-md">
          {currentQuestion?.options.map((option) => {
            let optionStyle =
              "bg-white border-3 border-gray-300 hover:border-[#4A90E2] hover:shadow-md";
            if (selectedOption === option && isCorrect === true) {
              optionStyle =
                "bg-emerald-50 border-3 border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]";
            } else if (selectedOption === option && isCorrect === false) {
              optionStyle = "bg-red-50 border-3 border-red-400";
            }

            return (
              <motion.button
                key={option}
                whileTap={{ scale: 0.97 }}
                animate={
                  selectedOption === option && isCorrect === false
                    ? { x: [0, -6, 6, -6, 0] }
                    : {}
                }
                transition={{ duration: 0.3 }}
                onClick={() => handleOptionClick(option)}
                className={`w-full rounded-2xl px-6 py-4 cursor-pointer transition-all duration-200 flex items-center justify-center text-3xl sm:text-4xl tracking-wider ${optionStyle}`}
              >
                {renderSpellingOption(option)}
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
              <span className="text-7xl">🏅</span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-800">
                Spelling Master!
              </h2>
              <p className="text-lg text-gray-500">
                You identified all the correct spellings!
              </p>
              <AksharaButton
                onClick={() => navigate("/reward")}
                size="large"
              >
                See Your Reward! 🎉
              </AksharaButton>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
