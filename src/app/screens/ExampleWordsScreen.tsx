import { useNavigate } from "react-router";
import { TopBar } from "../components/TopBar";
import { AksharaButton } from "../components/AksharaButton";
import { Volume2 } from "lucide-react";

export function ExampleWordsScreen() {
  const navigate = useNavigate();

  const words = [
    { word: "अनार", image: "🍎", meaning: "Pomegranate" },
    { word: "अंडा", image: "🥚", meaning: "Egg" },
    { word: "अलमारी", image: "🗄️", meaning: "Cupboard" },
  ];

  return (
    <div className="h-screen bg-[#F7F6F2] flex flex-col overflow-hidden">
      <TopBar avatarEmoji="🐻" progress={40} onExit={() => navigate("/")} />

      <div className="flex-1 flex flex-col items-center justify-center gap-12 p-8">
        <h1 className="text-5xl font-bold text-gray-800 tracking-wide">
          Words that start with "अ"
        </h1>

        <div className="grid grid-cols-3 gap-8 max-w-5xl">
          {words.map((item, index) => (
            <div
              key={index}
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

        <AksharaButton onClick={() => navigate("/game")}>
          Play Game
        </AksharaButton>
      </div>

      <div className="absolute top-4 right-4 bg-gray-800 text-white px-4 py-2 rounded-lg text-sm">
        8. Example Words Screen
      </div>
    </div>
  );
}
