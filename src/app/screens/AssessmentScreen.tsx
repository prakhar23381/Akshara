import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { TopBar } from "../components/TopBar";
import { OptionCard } from "../components/OptionCard";
import { AudioButton } from "../components/AudioButton";
import { useLetterAudio } from "../hooks/useLetterAudio";

export function AssessmentScreen() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<string | null>(null);

  const options = ["क", "ख", "ग", "घ"];
  // "ka" was written in the prompt but never spoken. The target is क.
  const { play } = useLetterAudio("क");

  // Play it once on arrival; the button is there for the replay, and for the
  // case where the browser refuses autoplay without a gesture on this page.
  useEffect(() => {
    play();
  }, [play]);

  const handleSelect = (option: string) => {
    setSelected(option);
    setTimeout(() => {
      navigate("/resume");
    }, 1000);
  };

  return (
    <div className="h-[100dvh] bg-[#F7F6F2] flex flex-col overflow-hidden">
      <TopBar avatarEmoji="🐻" progress={10} onExit={() => navigate("/")} />

      <div className="flex-1 min-h-0 flex flex-col items-center justify-center gap-[var(--gap-screen)] p-[var(--pad-screen)]">
        <div className="text-center">
          {/* The speaker here used to be a 40px icon that played nothing, sat
              beside the question, and looked exactly like the tappable ones. On
              a screen that asks which letter makes a sound, the sound has to be
              available. */}
          <div className="flex flex-col items-center gap-[var(--gap-screen)] mb-6">
            <p className="t-3 text-gray-800 tracking-wide">
              Which letter makes this sound?
            </p>
            <AudioButton onPlay={play} size="lg" />
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
    </div>
  );
}
