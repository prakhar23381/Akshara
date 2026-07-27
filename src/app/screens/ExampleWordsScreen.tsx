import { useNavigate } from "react-router";
import { TopBar } from "../components/TopBar";
import { AksharaButton } from "../components/AksharaButton";
import { Volume2 } from "lucide-react";
import { useLevelConfig } from "../hooks/useLevelConfig";
import { useAuth } from "../contexts/AuthContext";
import { getLetterContent } from "../data/letterContent";

export function ExampleWordsScreen() {
  const navigate = useNavigate();
  const { currentLetter, levelConfig } = useLevelConfig();
  const { user } = useAuth();
  const avatarEmoji = user?.user_metadata?.avatar ?? "🐻";
  const { exampleWords } = getLetterContent(currentLetter);

  return (
    <div className="h-screen bg-[#F7F6F2] flex flex-col overflow-hidden">
      <TopBar avatarEmoji={avatarEmoji} progress={40} onExit={() => navigate("/resume")} />

      <div className="flex-1 flex flex-col items-center justify-center gap-12 p-8">
        <h1 className="text-5xl font-bold text-gray-800 tracking-wide">
          Words that start with "{currentLetter}"
        </h1>

        <div className="grid grid-cols-3 gap-8 max-w-5xl">
          {exampleWords.map((item) => (
            <div
              key={item.word}
              className="bg-white rounded-3xl border-4 border-gray-300 p-8 flex flex-col items-center gap-4 hover:shadow-xl transition-all cursor-pointer"
              onClick={() => console.log(`Playing audio for ${item.word}`)}
            >
              <div className="text-8xl">{item.image}</div>
              <p className="text-4xl font-bold text-gray-800 tracking-wider">
                {item.word}
              </p>
              <div className="flex items-center gap-2 text-gray-600">
                <Volume2 size={20} />
                <span className="text-lg tracking-wide">{item.meaning}</span>
              </div>
            </div>
          ))}
        </div>

        <AksharaButton
          onClick={() => navigate("/tracing")}
        >
          Trace the Letter ✍️
        </AksharaButton>
      </div>
    </div>
  );
}
