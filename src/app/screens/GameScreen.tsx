import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useNavigate } from "react-router";
import { TopBar } from "../components/TopBar";
import { OptionCard } from "../components/OptionCard";
import { Volume2 } from "lucide-react";
import { useLevelConfig } from "../hooks/useLevelConfig";
import { useSessionTracker } from "../hooks/useSessionTracker";
import { useAuth } from "../contexts/AuthContext";
import { useLetterAudio } from "../hooks/useLetterAudio";
import { FEATURE_HIGHLIGHT_POSITIONS } from "../types/levelConfig";
import type { ModuleType } from "../types/levelConfig";
import { playSuccessSound, playErrorSound, playEncouragementSound } from "../utils/soundEffects";


type GameState = "default" | "hesitation" | "hint" | "wrong" | "correct";

const FAIL_FORCE = 2;

export function GameScreen() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const userId = user?.id ?? "offline";
  const { levelConfig, sessionNumber } = useLevelConfig();
  const tracker = useSessionTracker({
    userId,
    targetAlphabet: levelConfig.target_alphabet,
    sessionNumber,
  });

  const [gameState, setGameState] = useState<GameState>("default");
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [consecutiveFails, setConsecutiveFails] = useState(0);
  const [audioSlowMode, setAudioSlowMode] = useState(false);
  const { play: playAudio } = useLetterAudio(levelConfig.target_alphabet, audioSlowMode, tracker.markAudioEnd);

  const gameStateRef = useRef<GameState>("default");
  gameStateRef.current = gameState;

  const { correctAnswer, options } = useMemo(() => {
    const correct = levelConfig.target_alphabet;
    const pool = levelConfig.distractor_pool
      .filter((l) => l !== correct)
      .slice(0, 3);
    const opts = [correct, ...pool];
    for (let i = opts.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [opts[i], opts[j]] = [opts[j], opts[i]];
    }
    return { correctAnswer: correct, options: opts };
  }, [levelConfig]);

  const moduleType: ModuleType =
    levelConfig.distractor_similarity === "low"
      ? "dissimilar"
      : levelConfig.visual_aid_intensity === "none"
        ? "similar"
        : "scaffold";

  // Auto-play letter sound on mount; markAudioEnd fires via onEnded callback
  useEffect(() => {
    playAudio();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally run once on mount only

  // Replay at 0.8x when slow mode activates after a wrong answer
  useEffect(() => {
    if (audioSlowMode) playAudio();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioSlowMode]);

  useEffect(() => {
    const stage1 = levelConfig.hesitation_trigger_stage1_ms;
    const stage2 = levelConfig.hesitation_trigger_stage2_ms;
    const stage3 = stage2 + 12000;

    const hesitationTimer = setTimeout(() => {
      if (gameStateRef.current === "default") setGameState("hesitation");
    }, stage1);

    const hintTimer = setTimeout(() => {
      if (gameStateRef.current === "hesitation") setGameState("hint");
    }, stage2);

    const autoWinTimer = setTimeout(() => {
      if (gameStateRef.current === "hint") {
        tracker.recordGuidedWin(correctAnswer, moduleType);
        setGameState("correct");
        setTimeout(() => navigate("/reward"), 3000);
      }
    }, stage3);

    return () => {
      clearTimeout(hesitationTimer);
      clearTimeout(hintTimer);
      clearTimeout(autoWinTimer);
    };
  }, [
    correctAnswer,
    levelConfig.hesitation_trigger_stage1_ms,
    levelConfig.hesitation_trigger_stage2_ms,
    moduleType,
    navigate,
    tracker,
  ]);

  const handleOptionClick = useCallback((option: string) => {
    if (gameState === "correct" || gameState === "wrong") return;

    setSelectedOption(option);

    if (option === correctAnswer) {
      tracker.recordAttempt({
        targetLetter: correctAnswer,
        selectedLetter: option,
        moduleType,
        wasGuidedWin: false,
      });

      setConsecutiveFails(0);
      setGameState("correct");
      playSuccessSound();

      setTimeout(() => {
        navigate("/reward");
      }, 3000);
    } else {
      const nextFails = consecutiveFails + 1;
      setConsecutiveFails(nextFails);

      tracker.recordAttempt({
        targetLetter: correctAnswer,
        selectedLetter: option,
        moduleType,
        wasGuidedWin: false,
      });

      setGameState("wrong");
      playErrorSound();

      setTimeout(() => {
        if (nextFails >= FAIL_FORCE) {
          tracker.recordGuidedWin(correctAnswer, moduleType);
          setConsecutiveFails(0);
          setGameState("correct");
          playSuccessSound();

          setTimeout(() => {
            navigate("/reward");
          }, 3000);
        } else {
          setAudioSlowMode(true);
          setGameState("hint");
          setSelectedOption(null);
          playEncouragementSound();
        }
      }, 2000);
    }
  }, [
    consecutiveFails,
    correctAnswer,
    gameState,
    moduleType,
    navigate,
    tracker,
  ]);

  const getOptionState = (option: string) => {
    if (gameState === "correct" && option === correctAnswer) return "correct";
    if (gameState === "wrong" && option === selectedOption) return "wrong";
    if (gameState === "hint" && option === correctAnswer) return "hint";
    if (gameState === "hesitation" && option !== correctAnswer) return "dimmed";
    if (consecutiveFails >= FAIL_FORCE && option !== correctAnswer) return "dimmed";
    return "default";
  };

  const featurePosition = levelConfig.feature_to_highlight
    ? FEATURE_HIGHLIGHT_POSITIONS[levelConfig.feature_to_highlight]
    : null;

  const isHintActive = gameState === "hint" || gameState === "hesitation";
  const isAssessmentSession = levelConfig.cognitive_state === "insufficient_data";
  const proactive = !isAssessmentSession && levelConfig.visual_aid_intensity === "animated";
  const showDot = !isAssessmentSession && (proactive || isHintActive);
  const glowOpacity = isHintActive ? 1.0 : levelConfig.scaffold_intensity;
  const glowAnimated = proactive || isHintActive;
  // Proactive (gross_shape_blindness): slightly larger dot, gentle breathe
  // Hint-rescue (feature_neglect): medium dot on hesitation
  const dotSize = proactive ? 20 : isHintActive ? 16 : 10;

  return (
    <div className="h-screen bg-[#F7F6F2] flex flex-col overflow-hidden">
      <TopBar avatarEmoji={user?.user_metadata?.avatar ?? "🐻"} progress={50} onExit={() => navigate("/resume")} />

      <div className="flex-1 flex flex-col items-center justify-center gap-8 p-8">
        {/* Question prompt — letter name intentionally hidden, audio only */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-4 mb-4">
            <Volume2
              size={52}
              className="text-[#4A90E2] cursor-pointer hover:text-[#3070C0] transition-colors"
              onClick={playAudio}
            />
            {audioSlowMode && (
              <span className="text-sm bg-amber-100 text-amber-700 px-2 py-1 rounded">
                0.6x speed
              </span>
            )}
          </div>
          <p className="text-xl text-gray-500 tracking-wide">
            Tap the letter you heard 👆
          </p>
        </div>

        {/* Options grid */}
        <div className="grid grid-cols-4 gap-6 max-w-4xl">
          {options.map((option) => (
            <div key={option} className="relative">
              <OptionCard
                state={getOptionState(option)}
                onClick={() => handleOptionClick(option)}
              >
                {option}
              </OptionCard>

              {option === correctAnswer &&
                featurePosition &&
                showDot && (
                  <div
                    className="absolute rounded-full bg-amber-400 pointer-events-none"
                    style={{
                      width: dotSize,
                      height: dotSize,
                      ...featurePosition,
                      opacity: glowOpacity,
                      animation: glowAnimated
                        ? "breathe 2s ease-in-out infinite"
                        : "none",
                    }}
                  />
                )}
            </div>
          ))}
        </div>

        {import.meta.env.DEV && (
          <div className="bg-white px-6 py-3 rounded-lg border-2 border-gray-300">
            <p className="text-sm text-gray-600">
              <span className="font-bold">State:</span> {gameState} |{" "}
              <span className="font-bold">Cognitive:</span> {levelConfig.cognitive_state} |{" "}
              <span className="font-bold">Fails:</span> {consecutiveFails} |{" "}
              <span className="font-bold">Scaffold:</span>{" "}
              {levelConfig.scaffold_intensity.toFixed(2)} |{" "}
              <span className="font-bold">Provider:</span> {levelConfig.provider_used}
            </p>
          </div>
        )}
      </div>

      {/* Gentle breathing animation — scale 1→1.12→1, slow 2s */}
      <style>{`
        @keyframes breathe {
          0%, 100% { transform: scale(1);    opacity: ${glowOpacity}; }
          50%       { transform: scale(1.12); opacity: ${glowOpacity * 0.6}; }
        }
      `}</style>
    </div>
  );
}
