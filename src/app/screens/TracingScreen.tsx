import { useNavigate } from "react-router";
import { TopBar } from "../components/TopBar";
import { TracingCanvas } from "../components/TracingCanvas";
import { AksharaButton } from "../components/AksharaButton";

export function TracingScreen() {
  const navigate = useNavigate();

  return (
    <div className="h-screen bg-[#F7F6F2] flex flex-col overflow-hidden">
      <TopBar avatarEmoji="🐻" progress={70} onExit={() => navigate("/")} />

      <div className="flex-1 flex flex-col items-center justify-center gap-12 p-8">
        <div className="text-center">
          <h1 className="text-5xl font-bold text-gray-800 mb-3 tracking-wide">
            Trace the letter
          </h1>
          <p className="text-2xl text-gray-600 tracking-wide">
            Follow the yellow dots ✨
          </p>
        </div>

        <TracingCanvas letter="अ" />

        <AksharaButton onClick={() => navigate("/reward")}>
          Done
        </AksharaButton>
      </div>

      <div className="absolute top-4 right-4 bg-gray-800 text-white px-4 py-2 rounded-lg text-sm">
        10. Tracing Screen
      </div>
    </div>
  );
}
