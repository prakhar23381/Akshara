import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router";
import { useLevelConfig } from "../hooks/useLevelConfig";
import { useAuth } from "../contexts/AuthContext";
import { TopBar } from "../components/TopBar";
import { AksharaButton } from "../components/AksharaButton";
import { fetchProgressReport } from "../api/client";
import { playSuccessSound, playErrorSound } from "../utils/soundEffects";
import { motion, AnimatePresence } from "motion/react";
import { Sparkles, ArrowLeft } from "lucide-react";

interface Card {
  id: number;
  type: "glyph";
  letter: string;
  content: string;
  isFlipped: boolean;
  isMatched: boolean;
}

// Default static visual similarity index map for all 33 Devanagari consonants
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
  "ह": ["ड", "ढ", "इ", "ट"]
};

export function MemoryGameScreen() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { levelConfig } = useLevelConfig();
  const target = levelConfig.target_alphabet;

  const [cards, setCards] = useState<Card[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [showWinModal, setShowWinModal] = useState(false);
  const [loading, setLoading] = useState(true);

  const processingRef = useRef(false);

  // Initialize Memory Deck
  useEffect(() => {
    async function initDeck() {
      setLoading(true);
      try {
        let distractors: string[] = [];

        // 1. Check student-specific confused letter list
        const report = await fetchProgressReport();
        if (report?.letter_stats?.[target]) {
          const personalConfusions = report.letter_stats[target].confused_with || [];
          distractors = personalConfusions.filter((l) => l !== target);
        }

        // 2. Fallback to static similarity map if insufficient dynamic data
        const staticConfusions = SIMILARITY_MAP[target] || ["म", "ग", "ब"];
        staticConfusions.forEach((letter) => {
          if (distractors.length < 2 && letter !== target && !distractors.includes(letter)) {
            distractors.push(letter);
          }
        });

        // 3. Keep filling until we have exactly 2 distractors
        while (distractors.length < 2) {
          const filler = ["म", "ग", "ब"].find((l) => l !== target && !distractors.includes(l));
          distractors.push(filler || "म");
        }

        distractors = distractors.slice(0, 2);
        const letters = [target, ...distractors];

        // 4. Generate pairs of identical letter glyph cards
        const deck: Card[] = [];
        let idCounter = 1;

        letters.forEach((letter) => {
          deck.push({
            id: idCounter++,
            type: "glyph",
            letter,
            content: letter,
            isFlipped: false,
            isMatched: false,
          });
          deck.push({
            id: idCounter++,
            type: "glyph",
            letter,
            content: letter,
            isFlipped: false,
            isMatched: false,
          });
        });

        // 5. Fisher-Yates Shuffle
        for (let i = deck.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [deck[i], deck[j]] = [deck[j], deck[i]];
        }

        setCards(deck);
        setSelectedIndices([]);
        setMoves(0);
        setShowWinModal(false);
        processingRef.current = false;
      } catch (err) {
        console.error("[MemoryGame] Initialization error:", err);
      } finally {
        setLoading(false);
      }
    }

    initDeck();
  }, [target]);

  const handleCardClick = (clickedIndex: number) => {
    if (processingRef.current) return;
    const card = cards[clickedIndex];
    if (card.isFlipped || card.isMatched) return;

    // Flip the clicked card
    const updatedCards = [...cards];
    updatedCards[clickedIndex] = { ...card, isFlipped: true };
    setCards(updatedCards);

    const nextSelected = [...selectedIndices, clickedIndex];
    setSelectedIndices(nextSelected);

    if (nextSelected.length === 2) {
      processingRef.current = true;
      setMoves((m) => m + 1);

      const [firstIdx, secondIdx] = nextSelected;
      const firstCard = updatedCards[firstIdx];
      const secondCard = updatedCards[secondIdx];

      if (firstCard.letter === secondCard.letter) {
        // Match!
        setTimeout(() => {
          setCards((prevCards) => {
            const temp = [...prevCards];
            temp[firstIdx].isMatched = true;
            temp[secondIdx].isMatched = true;

            // Check if game is completed
            const allMatched = temp.every((c) => c.isMatched);
            if (allMatched) {
              setTimeout(() => {
                playSuccessSound();
                setShowWinModal(true);
              }, 450);
            }
            return temp;
          });
          setSelectedIndices([]);
          processingRef.current = false;
        }, 500);
      } else {
        // Mismatch - fold back to original flipped state
        setTimeout(() => {
          playErrorSound();
          setCards((prevCards) => {
            const temp = [...prevCards];
            temp[firstIdx].isFlipped = false;
            temp[secondIdx].isFlipped = false;
            return temp;
          });
          setSelectedIndices([]);
          processingRef.current = false;
        }, 1200);
      }
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
        <p className="text-xl text-gray-500 tracking-wide font-medium">Preparing your cards...</p>
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#F7F6F2] flex flex-col overflow-hidden relative">
      <TopBar avatarEmoji={user?.user_metadata?.avatar ?? "🐻"} progress={80} onExit={() => navigate("/roadmap")} />

      <div className="flex-1 flex flex-col items-center justify-center p-8 gap-8">
        <div className="flex justify-between items-center w-full max-w-4xl">
          <button
            onClick={() => navigate("/roadmap")}
            className="flex items-center gap-2 text-[#4A90E2] font-semibold text-lg hover:text-[#357ABD] transition-colors"
          >
            <ArrowLeft size={20} /> Back to Roadmap
          </button>
          <div className="bg-white border-2 border-gray-300 rounded-2xl px-6 py-2 shadow-sm">
            <span className="font-bold text-gray-600">Moves: </span>
            <span className="text-xl font-black text-gray-800">{moves}</span>
          </div>
        </div>

        <div className="text-center max-w-lg">
          <h1 className="text-4xl font-extrabold text-gray-800 tracking-wide mb-2 flex items-center justify-center gap-3">
            Memory Match 🧠
          </h1>
          <p className="text-xl text-gray-500 tracking-wide">
            Find the matching pairs of identical letters!
          </p>
        </div>

        {/* 6-Card Grid */}
        <div className="grid grid-cols-3 gap-8 max-w-4xl w-full aspect-[3/2] max-h-[450px]">
          {cards.map((card, index) => {
            const showFace = card.isFlipped || card.isMatched;

            return (
              <div key={card.id} className="perspective-1000 h-full w-full">
                <motion.div
                  onClick={() => handleCardClick(index)}
                  animate={{ rotateY: showFace ? 180 : 0 }}
                  transition={{ duration: 0.4 }}
                  className={`relative w-full h-full transform-style-3d rounded-3xl cursor-pointer select-none border-4 transition-all duration-300 shadow-md hover:shadow-lg ${
                    card.isMatched
                      ? "border-emerald-300"
                      : showFace
                        ? "border-[#4A90E2]"
                        : "border-gray-300 hover:border-[#4A90E2]"
                  }`}
                >
                  {/* CARD BACK */}
                  <div className="absolute inset-0 backface-hidden bg-white rounded-[20px] flex items-center justify-center">
                    <span className="text-7xl select-none text-gray-300">❓</span>
                  </div>

                  {/* CARD FRONT */}
                  <div
                    className={`absolute inset-0 backface-hidden bg-white rounded-[20px] flex flex-col items-center justify-center rotate-y-180 p-4 ${
                      card.isMatched ? "bg-emerald-50" : ""
                    }`}
                  >
                    <span className="text-8xl font-black text-gray-800 select-none">
                      {card.content}
                    </span>
                  </div>
                </motion.div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Victory Modal */}
      <AnimatePresence>
        {showWinModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/55 backdrop-blur-sm flex items-center justify-center p-6 z-55"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl text-center space-y-6 border border-gray-100"
            >
              <div className="text-center">
                <span className="text-7xl">🏆</span>
                <h2 className="text-4xl font-extrabold text-gray-800 mt-3 flex items-center justify-center gap-2">
                  Brilliant! <Sparkles className="text-amber-400 fill-amber-400" size={24} />
                </h2>
                <p className="text-xl text-gray-500 mt-2">
                  You matched all identical letters in <span className="font-bold text-gray-800">{moves}</span> moves!
                </p>
              </div>

              <AksharaButton onClick={() => navigate("/game")} size="large">
                Play Find the Letter! 🚀
              </AksharaButton>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Perspective CSS styling */}
      <style>{`
        .perspective-1000 {
          perspective: 1000px;
        }
        .transform-style-3d {
          transform-style: preserve-3d;
        }
        .backface-hidden {
          backface-visibility: hidden;
        }
        .rotate-y-180 {
          transform: rotateY(180deg);
        }
      `}</style>
    </div>
  );
}
