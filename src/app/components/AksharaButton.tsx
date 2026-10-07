import { motion } from "motion/react";

interface AksharaButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary";
  /** `large` is the primary call to action; `small` is a secondary control. */
  size?: "small" | "large";
  disabled?: boolean;
  /** Fill the container. The footer slot of ChildScreen sets this. */
  fullWidth?: boolean;
  className?: string;
}

/**
 * The one button in the child flow.
 *
 * The previous version used fixed `px-16 py-6` — 128px of horizontal padding
 * before a single character of label, and no max-width. On a 375px phone that
 * made every call to action either span the whole screen or overflow it, and it
 * is why three secondary buttons in a row ran off the side of the home screen.
 *
 * Padding is now fluid, the height has a 44px floor so it stays tappable, and
 * the width is capped so a tablet does not get an edge-to-edge button.
 */
export function AksharaButton({
  children,
  onClick,
  variant = "primary",
  size = "large",
  disabled = false,
  fullWidth = false,
  className = "",
}: AksharaButtonProps) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-3xl font-medium " +
    "transition-all duration-150 cursor-pointer text-center " +
    "disabled:opacity-50 disabled:cursor-not-allowed";

  const variants = {
    primary:
      "bg-[#4A90E2] text-white hover:bg-[#357ABD] active:bg-[#2B6399]",
    secondary:
      "bg-white text-[#4A90E2] border-2 border-[#4A90E2] hover:bg-[#F0F7FF]",
  };

  const isLarge = size === "large";

  return (
    <motion.button
      whileTap={{ scale: disabled ? 1 : 0.95 }}
      className={`${base} ${variants[variant]} ${
        isLarge ? "t-1" : "t-0"
      } ${fullWidth ? "w-full" : ""} ${className}`}
      style={{
        minHeight: "var(--tap-min)",
        height: isLarge ? "var(--control-h)" : undefined,
        paddingInline: isLarge
          ? "var(--control-px)"
          : "var(--control-px-sm)",
        paddingBlock: isLarge ? undefined : "0.5rem",
        maxWidth: "var(--cta-max)",
      }}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
    >
      {children}
    </motion.button>
  );
}
