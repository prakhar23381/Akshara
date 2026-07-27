import { useState } from "react";
import { useNavigate } from "react-router";
import { TopBar } from "../components/TopBar";
import { TracingCanvas } from "../components/TracingCanvas";
import { AksharaButton } from "../components/AksharaButton";
import { useLevelConfig } from "../hooks/useLevelConfig";
import { useAuth } from "../contexts/AuthContext";

export function TracingScreen() {
  const navigate = useNavigate();
  const { currentLetter } = useLevelConfig();
  const { user } = useAuth();
  const avatarEmoji = user?.user_metadata?.avatar ?? "🐻";
  const [canAdvance, setCanAdvance] = useState(false);

  const handleComplete = (score: number, success: boolean) => {
    setCanAdvance(success);
  };

  const handleClear = () => {
    setCanAdvance(false);
  };

  return (
    <div className="h-screen bg-[#F7F6F2] flex flex-col overflow-hidden">
      <TopBar avatarEmoji={avatarEmoji} progress={70} onExit={() => navigate("/roadmap")} />

      <div className="flex-1 flex flex-col items-center justify-center gap-3 sm:gap-5 p-3 sm:p-5">
        <div className="text-center">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-gray-800 tracking-wide">
            Trace the letter "{currentLetter}"
          </h1>
          <p className="text-xs sm:text-sm md:text-base text-gray-500 font-medium tracking-wide">
            Follow the guide path to draw it ✨
          </p>
        </div>

        <TracingCanvas
          letter={currentLetter}
          onComplete={handleComplete}
          onClear={handleClear}
        />

        <AksharaButton
          onClick={() => navigate("/memory")}
          disabled={!canAdvance}
        >
          Play Memory Match! 🚀
        </AksharaButton>
      </div>
    </div>
  );
}
