import { motion } from "motion/react";

interface ProgressBarProps {
  progress: number; // 0-100
  /** A run of three right answers (G4; docs/11 §3.8): the bar glows gold. No number says so. */
  glow?: boolean;
}

/**
 * Fills the space between the avatar and the exit button. It used to be a fixed
 * `w-64` (256px), which on a 375px screen left no room for the controls either
 * side and pushed them off the edge.
 */
export function ProgressBar({ progress, glow = false }: ProgressBarProps) {
  return (
    <div
      className="flex-1 min-w-0 bg-gray-200 rounded-full overflow-hidden"
      role="progressbar"
      aria-valuenow={Math.round(progress)}
      aria-valuemin={0}
      aria-valuemax={100}
      style={{
        height: "clamp(0.75rem, 1.8vmin, 1rem)",
        boxShadow: glow ? "0 0 0 3px rgba(242,169,0,0.35), 0 0 14px var(--c-reward)" : "none",
        transition: "box-shadow 600ms",
      }}
    >
      <motion.div
        className="h-full rounded-full"
        initial={{ width: 0 }}
        animate={{
          width: `${Math.max(0, Math.min(100, progress))}%`,
          backgroundColor: glow ? "#F2A900" : "#2F7D32",
        }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      />
    </div>
  );
}
