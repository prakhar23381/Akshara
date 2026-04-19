import { useState } from "react";
import { useNavigate } from "react-router";
import { TopBar } from "../components/TopBar";
import { OptionCard } from "../components/OptionCard";
import { Volume2 } from "lucide-react";

export function AssessmentScreen() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<string | null>(null);

  const options = ["क", "ख", "ग", "घ"];

  const handleSelect = (option: string) => {
    setSelected(option);
    setTimeout(() => {
      navigate("/resume");
    }, 1000);
  };

  return (
    <div className="h-screen bg-[#F7F6F2] flex flex-col overflow-hidden">
      <TopBar avatarEmoji="🐻" progress={10} onExit={() => navigate("/")} />

      <div className="flex-1 flex flex-col items-center justify-center gap-12 p-8">
        <div className="text-center">
          <div className="flex items-center justify-center gap-4 mb-6">
            <Volume2 size={40} className="text-[#4A90E2]" />
            <p className="text-4xl text-gray-800 tracking-wide">
              Which letter makes the "ka" sound?
            </p>
          </div>
          <p className="text-xl text-gray-500 tracking-wide">
            (Looks like a game, not a test)
          </p>
        </div>

        <div className="grid grid-cols-4 gap-6 max-w-4xl">
          {options.map((option) => (
            <OptionCard
              key={option}
              state={selected === option ? "correct" : "default"}
              onClick={() => handleSelect(option)}
            >
              {option}
            </OptionCard>
          ))}
        </div>
      </div>

      <div className="absolute top-4 right-4 bg-gray-800 text-white px-4 py-2 rounded-lg text-sm">
        4. Assessment Screen
      </div>
    </div>
  );
}
