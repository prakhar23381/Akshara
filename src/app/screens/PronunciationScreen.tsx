import { useNavigate } from "react-router";
import { TopBar } from "../components/TopBar";
import { AksharaButton } from "../components/AksharaButton";
import { Volume2 } from "lucide-react";
import { useLevelConfig } from "../hooks/useLevelConfig";
import { useAuth } from "../contexts/AuthContext";
import { getLetterContent } from "../data/letterContent";

export function PronunciationScreen() {
  const navigate = useNavigate();
  const { currentLetter } = useLevelConfig();
  const { user } = useAuth();
  const avatarEmoji = user?.user_metadata?.avatar ?? "🐻";
  const content = getLetterContent(currentLetter);

  return (
    <div className="h-screen bg-[#F7F6F2] flex flex-col overflow-hidden">
      <TopBar avatarEmoji={avatarEmoji} progress={30} onExit={() => navigate("/resume")} />

      <div className="flex-1 flex flex-col items-center justify-center gap-12 p-8">
        <h1 className="text-5xl font-bold text-gray-800 tracking-wide">
          How to say it
        </h1>

        <div className="flex gap-16 items-center">
          <div className="w-48 h-48 bg-white rounded-3xl border-4 border-gray-300 flex items-center justify-center shadow-lg">
            <span className="text-8xl font-bold text-gray-800">{currentLetter}</span>
          </div>

          <div className="w-64 h-64 bg-white rounded-3xl border-4 border-gray-300 flex items-center justify-center shadow-lg">
            <div className="text-center px-4">
              <div className="text-9xl mb-4">{content.mouthEmoji}</div>
              <p className="text-lg text-gray-600 tracking-wide leading-snug">
                {content.pronunciationHint}
              </p>
            </div>
          </div>
        </div>

        <button
          className="flex items-center gap-3 px-12 py-5 bg-[#4A90E2] text-white rounded-full hover:bg-[#357ABD] transition-all text-2xl tracking-wide"
          onClick={() => console.log(`Replay audio for ${currentLetter}`)}
        >
          <Volume2 size={32} />
          Replay Sound
        </button>

        <AksharaButton onClick={() => navigate("/example-words")}>
          Next
        </AksharaButton>
      </div>
    </div>
  );
}
