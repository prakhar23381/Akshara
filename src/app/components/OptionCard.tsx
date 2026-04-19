import { motion } from "motion/react";

interface OptionCardProps {
  children: React.ReactNode;
  onClick?: () => void;
  state?: "default" | "correct" | "wrong" | "hint" | "dimmed";
}

export function OptionCard({
  children,
  onClick,
  state = "default",
}: OptionCardProps) {
  const stateClasses = {
    default: "bg-white border-4 border-gray-300 hover:border-[#4A90E2] hover:shadow-lg",
    correct: "bg-[#4CAF50] border-4 border-[#4CAF50] shadow-[0_0_20px_rgba(76,175,80,0.5)]",
    wrong: "bg-white border-4 border-[#E76F51]",
    hint: "bg-[#FFD166] border-4 border-[#FFD166] animate-pulse",
    dimmed: "bg-white border-4 border-gray-300 opacity-30",
  };

  const animations = {
    default: {},
    correct: { scale: [1, 1.05, 1] },
    wrong: { x: [0, -10, 10, -10, 10, 0] },
    hint: { scale: [1, 1.08, 1] },
    dimmed: {},
  };

  return (
    <motion.div
      whileTap={state === "default" || state === "hint" ? { scale: 0.95 } : {}}
      animate={animations[state]}
      transition={{ duration: 0.3 }}
      className={`rounded-2xl p-8 cursor-pointer transition-all duration-300 ${stateClasses[state]}`}
      onClick={state === "dimmed" ? undefined : onClick}
    >
      <div className="flex items-center justify-center text-5xl">
        {children}
      </div>
    </motion.div>
  );
}
