import { motion } from "motion/react";

interface ProgressBarProps {
  progress: number; // 0-100
}

export function ProgressBar({ progress }: ProgressBarProps) {
  return (
    <div className="w-64 h-3 bg-gray-200 rounded-full overflow-hidden">
      <motion.div
        className="h-full bg-[#4A90E2] rounded-full"
        initial={{ width: 0 }}
        animate={{ width: `${progress}%` }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      />
    </div>
  );
}
