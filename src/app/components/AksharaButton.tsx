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
  // G4 (docs/11 §3.9): bold, on a darker lip it sinks onto when pressed, so
  // it looks pressable before it is touched. Primary is "go" (teal, white
  // text 5.2:1 — the old white-on-blue was 3.3:1); secondary is white on grey.
  const base =
    "tile3d inline-flex items-center justify-center gap-2 rounded-2xl font-extrabold tracking-wide " +
    "cursor-pointer text-center border-2 " +
    "disabled:bg-[var(--c-ghost)] disabled:text-[var(--c-muted)] disabled:border-[var(--c-line)] disabled:[--lip:var(--c-line-lip)] disabled:cursor-not-allowed";

  const variants = {
    primary: "bg-[var(--c-go)] text-white border-transparent [--lip:var(--c-go-lip)]",
    secondary: "bg-white text-[var(--c-ink)] border-[var(--c-line)] [--lip:var(--c-line-lip)]",
  };

  const isLarge = size === "large";

  return (
    <motion.button
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
        marginBottom: 5,
      }}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
    >
      {children}
    </motion.button>
  );
}
