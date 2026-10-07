import { Volume2 } from "lucide-react";

/**
 * The one way to hear something.
 *
 * Before this there were six: a blue pill with "Replay sound", a bare unstyled
 * icon, two pale pills at `size={16}` labelled with a word's meaning, a static
 * "🔊 Listen carefully…" caption with nothing to tap, and — on the assessment —
 * a `size={40}` speaker that was pure decoration and played nothing at all. A
 * child who taps a speaker and gets silence learns that speakers do not work,
 * which costs us the control they most need when the audio is the question.
 *
 * So: one shape, one colour, one word, every time, always tappable, never
 * smaller than `--tap-min`.
 */
interface AudioButtonProps {
  /** Plays the sound. Safe to call repeatedly. */
  onPlay: () => void;
  /** Kept constant on purpose; override only where "Listen" would mislead. */
  label?: string;
  /**
   * `lg` for the moment the sound *is* the task — the pronunciation step and
   * any listen-and-choose question. `md` everywhere the sound supports
   * something else on screen.
   */
  size?: "md" | "lg";
  disabled?: boolean;
}

export function AudioButton({
  onPlay,
  label = "Listen",
  size = "md",
  disabled = false,
}: AudioButtonProps) {
  const large = size === "lg";
  return (
    <button
      type="button"
      onClick={onPlay}
      disabled={disabled}
      aria-label={label}
      className={`shrink-0 inline-flex items-center justify-center gap-2 rounded-full bg-[#4A90E2] text-white transition-all hover:bg-[#357ABD] active:scale-95 disabled:opacity-40 ${
        large ? "t-1 font-semibold" : "t-0"
      }`}
      style={{
        minHeight: large ? "var(--control-h)" : "var(--tap-min)",
        paddingInline: large ? "var(--control-px)" : "var(--control-px-sm)",
      }}
    >
      {/* Sized in `em` so the icon tracks the label instead of being pinned to
          a pixel value that was right on one screen only. */}
      <Volume2 style={{ width: "1.35em", height: "1.35em" }} aria-hidden />
      {label}
    </button>
  );
}
