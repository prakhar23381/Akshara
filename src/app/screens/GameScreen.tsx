import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { TopBar } from "../components/TopBar";
import { OptionCard } from "../components/OptionCard";
import { Volume2 } from "lucide-react";

type GameState = "default" | "hesitation" | "hint" | "wrong" | "correct";

export function GameScreen() {
  const navigate = useNavigate();
  const [gameState, setGameState] = useState<GameState>("default");
  const [selectedOption, setSelectedOption] = useState<string | null>(null);

  const correctAnswer = "अ";
  const options = ["अ", "आ", "इ", "ई"];

  useEffect(() => {
    // Simulate hesitation timer (3 seconds)
    const hesitationTimer = setTimeout(() => {
      if (gameState === "default") {
        setGameState("hesitation");
      }
    }, 3000);

    // Simulate hint timer (5 seconds)
    const hintTimer = setTimeout(() => {
      if (gameState === "hesitation") {
        setGameState("hint");
      }
    }, 5000);

    return () => {
      clearTimeout(hesitationTimer);
      clearTimeout(hintTimer);
    };
  }, [gameState]);

  const handleOptionClick = (option: string) => {
    if (gameState === "correct" || gameState === "wrong") return;

    setSelectedOption(option);

    if (option === correctAnswer) {
      setGameState("correct");
      setTimeout(() => {
        navigate("/tracing");
      }, 1500);
    } else {
      setGameState("wrong");
      setTimeout(() => {
        setGameState("hint");
        setSelectedOption(null);
      }, 1000);
    }
  };

  const getOptionState = (option: string) => {
    if (gameState === "correct" && option === correctAnswer) return "correct";
    if (gameState === "wrong" && option === selectedOption) return "wrong";
    if (gameState === "hint" && option === correctAnswer) return "hint";
    if (gameState === "hesitation" && option !== correctAnswer) return "dimmed";
    return "default";
  };

  return (
    <div className="h-screen bg-[#F7F6F2] flex flex-col overflow-hidden">
      <TopBar avatarEmoji="🐻" progress={50} onExit={() => navigate("/")} />

      <div className="flex-1 flex flex-col items-center justify-center gap-12 p-8">
        <div className="text-center">
          <div className="flex items-center justify-center gap-4 mb-4">
            <Volume2 size={40} className="text-[#4A90E2]" />
            <p className="text-4xl text-gray-800 tracking-wide">
              Find the letter "अ"
            </p>
          </div>
          <p className="text-xl text-gray-500 tracking-wide">
            Listen and tap the correct letter
          </p>
        </div>

        <div className="grid grid-cols-4 gap-6 max-w-4xl">
          {options.map((option) => (
            <OptionCard
              key={option}
              state={getOptionState(option)}
              onClick={() => handleOptionClick(option)}
            >
              {option}
            </OptionCard>
          ))}
        </div>

        {/* State Indicator for Wireframe */}
        <div className="bg-white px-6 py-3 rounded-lg border-2 border-gray-300">
          <p className="text-lg text-gray-700">
            <span className="font-bold">Current State:</span>{" "}
            {gameState === "default" && "Default (0-3s)"}
            {gameState === "hesitation" && "Hesitation (3-5s) - Distractors dimmed"}
            {gameState === "hint" && "Hint (5s+) - Correct option pulses"}
            {gameState === "wrong" && "Wrong - Shake animation"}
            {gameState === "correct" && "Correct - Green highlight, auto-advance"}
          </p>
        </div>

        {/* Manual State Controls for Wireframe Demo */}
        <div className="flex gap-3">
          <button
            onClick={() => setGameState("default")}
            className="px-4 py-2 bg-gray-200 rounded-lg text-sm hover:bg-gray-300"
          >
            Reset to Default
          </button>
          <button
            onClick={() => setGameState("hesitation")}
            className="px-4 py-2 bg-gray-200 rounded-lg text-sm hover:bg-gray-300"
          >
            Show Hesitation
          </button>
          <button
            onClick={() => setGameState("hint")}
            className="px-4 py-2 bg-gray-200 rounded-lg text-sm hover:bg-gray-300"
          >
            Show Hint
          </button>
        </div>
      </div>

      <div className="absolute top-4 right-4 bg-gray-800 text-white px-4 py-2 rounded-lg text-sm">
        9. Game Screen (Multi-State)
      </div>
    </div>
  );
}
