import { motion } from "motion/react";
import { Volume2 } from "lucide-react";

interface LetterDisplayProps {
  letter: string;
  showAudio?: boolean;
  onAudioClick?: () => void;
  animated?: boolean;
}

export function LetterDisplay({
  letter,
  showAudio = true,
  onAudioClick,
  animated = false,
}: LetterDisplayProps) {
  return (
    <div className="flex flex-col items-center gap-6">
      <motion.div
        className="w-64 h-64 bg-white rounded-3xl border-4 border-gray-300 flex items-center justify-center shadow-lg"
        animate={animated ? { scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] } : {}}
        transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
      >
        <span className="text-9xl font-bold tracking-wider text-gray-800">
          {letter}
        </span>
      </motion.div>
      
      {showAudio && (
        <button
          className="flex items-center gap-3 px-8 py-4 bg-[#4A90E2] text-white rounded-full hover:bg-[#357ABD] transition-all"
          onClick={onAudioClick}
        >
          <Volume2 size={28} />
          <span className="text-xl tracking-wide">Listen</span>
        </button>
      )}
    </div>
  );
}
