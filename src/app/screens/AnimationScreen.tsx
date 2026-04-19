import { useEffect } from "react";
import { useNavigate } from "react-router";
import { TopBar } from "../components/TopBar";
import { LetterDisplay } from "../components/LetterDisplay";

export function AnimationScreen() {
  const navigate = useNavigate();

  useEffect(() => {
    // Auto-play audio (simulated)
    console.log("Auto-playing audio for letter 'अ'");

    // Auto-transition after 3 seconds
    const timer = setTimeout(() => {
      navigate("/pronunciation");
    }, 3000);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="h-screen bg-[#F7F6F2] flex flex-col overflow-hidden">
      <TopBar avatarEmoji="🐻" progress={20} onExit={() => navigate("/")} />

      <div className="flex-1 flex flex-col items-center justify-center gap-12 p-8">
        <h1 className="text-5xl font-bold text-gray-800 tracking-wide">
          Meet the letter
        </h1>

        <LetterDisplay
          letter="अ"
          showAudio={false}
          animated={true}
        />

        <p className="text-2xl text-gray-600 tracking-wide text-center">
          Auto-playing sound... 🔊
          <br />
          <span className="text-lg text-gray-500">
            (Auto-transitions in 3 seconds)
          </span>
        </p>
      </div>

      <div className="absolute top-4 right-4 bg-gray-800 text-white px-4 py-2 rounded-lg text-sm">
        6. Animation Screen
      </div>
    </div>
  );
}
