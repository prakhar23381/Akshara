import { motion } from "motion/react";

interface ProgressBarProps {
  progress: number; // 0-100
}

/**
 * Fills the space between the avatar and the exit button. It used to be a fixed
 * `w-64` (256px), which on a 375px screen left no room for the controls either
 * side and pushed them off the edge.
 */
export function ProgressBar({ progress }: ProgressBarProps) {
  return (
    <div
      className="flex-1 min-w-0 bg-gray-200 rounded-full overflow-hidden"
      role="progressbar"
      aria-valuenow={Math.round(progress)}
      aria-valuemin={0}
      aria-valuemax={100}
      style={{ height: "clamp(0.5rem, 1.2vmin, 0.75rem)" }}
    >
      <motion.div
        className="h-full bg-[#4A90E2] rounded-full"
        initial={{ width: 0 }}
        animate={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      />
    </div>
  );
}
