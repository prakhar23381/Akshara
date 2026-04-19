import { useNavigate } from "react-router";
import { TopBar } from "../components/TopBar";
import { AksharaButton } from "../components/AksharaButton";
import { Volume2 } from "lucide-react";

export function PronunciationScreen() {
  const navigate = useNavigate();

  return (
    <div className="h-screen bg-[#F7F6F2] flex flex-col overflow-hidden">
      <TopBar avatarEmoji="🐻" progress={30} onExit={() => navigate("/")} />

      <div className="flex-1 flex flex-col items-center justify-center gap-12 p-8">
        <h1 className="text-5xl font-bold text-gray-800 tracking-wide">
          How to say it
        </h1>

        <div className="flex gap-16 items-center">
          {/* Letter Display */}
          <div className="w-48 h-48 bg-white rounded-3xl border-4 border-gray-300 flex items-center justify-center shadow-lg">
            <span className="text-8xl font-bold text-gray-800">अ</span>
          </div>

          {/* Mouth/Tongue Visual */}
          <div className="w-64 h-64 bg-white rounded-3xl border-4 border-gray-300 flex items-center justify-center shadow-lg">
            <div className="text-center">
              <div className="text-9xl mb-4">👄</div>
              <p className="text-xl text-gray-600 tracking-wide">
                Open your mouth
              </p>
            </div>
          </div>
        </div>

        {/* Replay Button */}
        <button
          className="flex items-center gap-3 px-12 py-5 bg-[#4A90E2] text-white rounded-full hover:bg-[#357ABD] transition-all text-2xl tracking-wide"
          onClick={() => console.log("Replay audio")}
        >
          <Volume2 size={32} />
          Replay Sound
        </button>

        <AksharaButton onClick={() => navigate("/example-words")}>
          Next
        </AksharaButton>
      </div>

      <div className="absolute top-4 right-4 bg-gray-800 text-white px-4 py-2 rounded-lg text-sm">
        7. Pronunciation Screen
      </div>
    </div>
  );
}
