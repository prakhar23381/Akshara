import { useEffect } from "react";
import { useNavigate } from "react-router";
import { TopBar } from "../components/TopBar";
import { LetterDisplay } from "../components/LetterDisplay";
import { useLevelConfig } from "../hooks/useLevelConfig";
import { useAuth } from "../contexts/AuthContext";
import { useLetterAudio } from "../hooks/useLetterAudio";

export function AnimationScreen() {
  const navigate = useNavigate();
  const { currentLetter } = useLevelConfig();
  const { user } = useAuth();
  const avatarEmoji = user?.user_metadata?.avatar ?? "🐻";
  const { play } = useLetterAudio(currentLetter);

  useEffect(() => {
    // Play letter sound as soon as the screen appears
    play();

    const timer = setTimeout(() => {
      navigate("/pronunciation");
    }, 3000);

    return () => clearTimeout(timer);
  }, [navigate, play]);

  return (
    <div className="h-screen bg-[#F7F6F2] flex flex-col overflow-hidden">
      <TopBar avatarEmoji={avatarEmoji} progress={20} onExit={() => navigate("/resume")} />

      <div className="flex-1 flex flex-col items-center justify-center gap-12 p-8">
        <h1 className="text-5xl font-bold text-gray-800 tracking-wide">
          Meet the letter
        </h1>

        <LetterDisplay
          letter={currentLetter}
          showAudio={false}
          animated={true}
        />

        <p className="text-2xl text-gray-600 tracking-wide text-center">
          🔊 Listen carefully…
          <br />
          <span className="text-lg text-gray-500">
            (Auto-transitions in 3 seconds)
          </span>
        </p>
      </div>
    </div>
  );
}
