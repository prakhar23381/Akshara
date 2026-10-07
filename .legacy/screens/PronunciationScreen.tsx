import { useEffect } from "react";
import { useNavigate } from "react-router";
import { TopBar } from "../components/TopBar";
import { AksharaButton } from "../components/AksharaButton";
import { Volume2 } from "lucide-react";
import { useLevelConfig } from "../hooks/useLevelConfig";
import { useAuth } from "../contexts/AuthContext";
import { getLetterContent } from "../data/letterContent";
import { useLetterAudio } from "../hooks/useLetterAudio";

export function PronunciationScreen() {
  const navigate = useNavigate();
  const { currentLetter } = useLevelConfig();
  const { user } = useAuth();
  const avatarEmoji = user?.user_metadata?.avatar ?? "🐻";
  const content = getLetterContent(currentLetter);
  const { play } = useLetterAudio(currentLetter);

  // Auto-play once on mount so the child hears it again on this screen
  useEffect(() => {
    play();
  }, [play]);

  return (
    <div className="h-[100dvh] bg-[#F7F6F2] flex flex-col overflow-hidden">
      <TopBar avatarEmoji={avatarEmoji} progress={30} onExit={() => navigate("/resume")} />

      <div className="flex-1 min-h-0 flex flex-col items-center justify-center gap-[var(--gap-screen)] p-[var(--pad-screen)]">
        <h1 className="t-3 font-bold text-gray-800 tracking-wide">
          How to say it
        </h1>

        <div className="flex gap-[var(--gap-screen)] items-center">
          <div className="w-48 h-48 bg-white rounded-3xl border-4 border-gray-300 flex items-center justify-center shadow-lg">
            <span className="letter-glyph t-5 font-bold text-gray-800">{currentLetter}</span>
          </div>

          <div className="w-64 h-64 bg-white rounded-3xl border-4 border-gray-300 flex items-center justify-center shadow-lg">
            <div className="text-center px-4">
              <div className="t-5 mb-4">{content.mouthEmoji}</div>
              <p className="text-lg text-gray-600 tracking-wide leading-snug">
                {content.pronunciationHint}
              </p>
            </div>
          </div>
        </div>

        <button
          className="flex items-center gap-3 px-12 py-5 bg-[#4A90E2] text-white rounded-full hover:bg-[#357ABD] transition-all t-2 tracking-wide"
          onClick={play}
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
