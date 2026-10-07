import { motion } from "motion/react";

/**
 * Shows one letter, large. Audio is not its job: it used to carry its own
 * "Listen" pill behind a `showAudio` prop that its only caller set to false,
 * which is how a sixth audio variant would have found its way back in. Pair it
 * with `AudioButton` instead.
 */
interface LetterDisplayProps {
  letter: string;
  animated?: boolean;
}

export function LetterDisplay({ letter, animated = false }: LetterDisplayProps) {
  return (
    <div className="flex flex-col items-center gap-6">
      <motion.div
        className="w-64 h-64 bg-white rounded-3xl border-4 border-gray-300 flex items-center justify-center shadow-lg"
        animate={animated ? { scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] } : {}}
        transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
      >
        {/* No letter-spacing: Devanagari joins along the shirorekha, so
            tracking separates marks that should stay connected. */}
        <span className="letter-glyph t-5 font-bold text-gray-800">
          {letter}
        </span>
      </motion.div>
    </div>
  );
}
