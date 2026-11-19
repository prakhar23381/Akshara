import { motion } from "motion/react";
import type { CSSProperties } from "react";
import { speakHindi } from "../utils/speech";

/**
 * Mitthu's speech bubble (docs/11 §3.1). He speaks Hindi only: the line is
 * said aloud by the device's Hindi voice, and tapping the bubble says it
 * again — for a child who cannot read it yet. `caption` is the English for
 * adults, small, under the line. Moved from the play lab with G4.
 */
export function Bubble({
  text,
  caption,
  tail = "left",
  style,
}: {
  text: string;
  caption?: string;
  tail?: "left" | "bottom";
  style?: CSSProperties;
}) {
  return (
    <motion.button
      key={text}
      initial={{ opacity: 0, scale: 0.8, y: 6 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 400, damping: 22 }}
      onClick={() => void speakHindi(text).catch(() => {})}
      aria-label={`${text} — tap to hear`}
      className="letter-glyph"
      style={{
        position: "relative",
        background: "var(--c-card)",
        border: "3px solid var(--c-ink)",
        borderRadius: 20,
        padding: "10px 14px",
        fontSize: "clamp(1.05rem, 4.6vmin, 1.4rem)",
        fontWeight: 600,
        color: "var(--c-ink)",
        cursor: "pointer",
        textAlign: "left",
        maxWidth: 280,
        boxShadow: "0 4px 0 var(--c-line-lip)",
        ...style,
      }}
    >
      {text} <span aria-hidden style={{ fontSize: "0.75em", opacity: 0.6 }}>🔊</span>
      {caption && (
        <span className="block font-sans" style={{ fontSize: "0.62em", fontWeight: 500, color: "var(--c-muted)", marginTop: 2 }}>
          {caption}
        </span>
      )}
      <span
        aria-hidden
        style={{
          position: "absolute",
          width: 16,
          height: 16,
          background: "var(--c-card)",
          borderLeft: "3px solid var(--c-ink)",
          borderBottom: "3px solid var(--c-ink)",
          ...(tail === "left"
            ? { left: -10, top: "50%", transform: "translateY(-50%) rotate(45deg)" }
            : { left: "50%", bottom: -10, transform: "translateX(-50%) rotate(-45deg)" }),
        }}
      />
    </motion.button>
  );
}

/** Say a line of Mitthu's, quietly doing nothing on a device with no Hindi voice. */
export const say = (text: string): void => void speakHindi(text).catch(() => {});
