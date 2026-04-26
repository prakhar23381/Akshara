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

  return (
    <div className="h-screen bg-[#F7F6F2] flex flex-col overflow-hidden">
      <TopBar avatarEmoji={avatarEmoji} progress={70} onExit={() => navigate("/resume")} />

      <div className="flex-1 flex flex-col items-center justify-center gap-12 p-8">
        <div className="text-center">
          <h1 className="text-5xl font-bold text-gray-800 mb-3 tracking-wide">
            Trace the letter "{currentLetter}"
          </h1>
          <p className="text-2xl text-gray-600 tracking-wide">
            Use your finger to draw it ✨
          </p>
        </div>

        <TracingCanvas letter={currentLetter} />

        <AksharaButton onClick={() => navigate("/game")}>
          Now find it!
        </AksharaButton>
      </div>
    </div>
  );
}
