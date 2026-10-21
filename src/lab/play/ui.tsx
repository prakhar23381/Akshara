import { useState, type CSSProperties, type ReactNode } from "react";
import { motion } from "motion/react";
import { C, FONT_HI, FONT_UI, ROLES, type Role } from "./tokens";
import { say, sfx } from "./sounds";

/**
 * The pressable kit of docs/11 §3.9: everything you can press stands on a
 * darker lip and sinks onto it when pressed, so it looks pressable before it
 * is touched. Styled inline — src/lab is outside the production stylesheet.
 */
const LIP = 5;

function usePress() {
  const [down, setDown] = useState(false);
  return {
    down,
    handlers: {
      onPointerDown: () => setDown(true),
      onPointerUp: () => setDown(false),
      onPointerLeave: () => setDown(false),
      onPointerCancel: () => setDown(false),
    },
  };
}

export function Btn3D({
  children,
  role = ROLES.go,
  onClick,
  full = false,
  outline = false,
  disabled = false,
  style,
  label,
}: {
  children: ReactNode;
  role?: Role;
  onClick?: () => void;
  full?: boolean;
  /** The secondary button: white, grey border, grey lip. */
  outline?: boolean;
  disabled?: boolean;
  style?: CSSProperties;
  label?: string;
}) {
  const { down, handlers } = usePress();
  const pressed = down && !disabled;
  const lip = disabled ? C.lineLip : outline ? C.lineLip : role.lip;
  return (
    <button
      {...handlers}
      aria-label={label}
      disabled={disabled}
      onClick={() => {
        if (disabled) return;
        sfx.tap();
        onClick?.();
      }}
      style={{
        fontFamily: FONT_UI,
        fontWeight: 800,
        fontSize: 18,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        minHeight: 56,
        padding: "0 24px",
        width: full ? "100%" : undefined,
        maxWidth: full ? 420 : undefined,
        borderRadius: 16,
        cursor: disabled ? "default" : "pointer",
        background: disabled ? C.ghost : outline ? C.card : role.fill,
        color: disabled ? C.muted : outline ? C.ink : role.text,
        border: outline || disabled ? `2px solid ${C.line}` : "2px solid transparent",
        boxShadow: pressed ? "none" : `0 ${LIP}px 0 ${lip}`,
        transform: pressed ? `translateY(${LIP}px)` : "none",
        marginBottom: LIP,
        transition: "transform 60ms, box-shadow 60ms",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        touchAction: "manipulation",
        ...style,
      }}
    >
      {children}
    </button>
  );
}

export type TileState = "idle" | "selected" | "correct" | "wrong" | "faded";

/** An answer tile: thick border on a lip. A wrong answer only outlines (§3.8 guardrail). */
export function Tile({
  children,
  state = "idle",
  onClick,
  size = 120,
}: {
  children: ReactNode;
  state?: TileState;
  onClick?: () => void;
  size?: number;
}) {
  const { down, handlers } = usePress();
  const look: Record<TileState, { bg: string; border: string; lip: string; ink: string }> = {
    idle: { bg: C.card, border: C.line, lip: C.lineLip, ink: C.ink },
    selected: { bg: "#E8EBFA", border: ROLES.info.fill, lip: ROLES.info.lip, ink: ROLES.info.lip },
    correct: { bg: "#E3F1E3", border: ROLES.correct.fill, lip: ROLES.correct.lip, ink: ROLES.correct.lip },
    wrong: { bg: C.card, border: ROLES.hint.fill, lip: ROLES.hint.lip, ink: C.ink },
    faded: { bg: C.ghost, border: C.ghost, lip: C.ghost, ink: "#B5B2A8" },
  };
  const l = look[state];
  const pressed = down && state === "idle";
  return (
    <motion.button
      {...handlers}
      onClick={onClick}
      animate={state === "wrong" ? { x: [0, -5, 5, -3, 3, 0] } : state === "correct" ? { scale: [1, 1.06, 1] } : {}}
      transition={{ duration: 0.35 }}
      style={{
        width: size,
        height: size,
        borderRadius: 20,
        border: `3px solid ${l.border}`,
        background: l.bg,
        color: l.ink,
        boxShadow: pressed ? "none" : `0 5px 0 ${l.lip}`,
        y: pressed ? 5 : 0, // motion owns this element's transform
        fontFamily: FONT_HI,
        fontSize: size * 0.48,
        lineHeight: 1,
        cursor: onClick ? "pointer" : "default",
        display: "grid",
        placeItems: "center",
        touchAction: "manipulation",
      }}
    >
      {children}
    </motion.button>
  );
}

/** Mitthu's speech bubble. Tapping it says it again. */
export function Bubble({ text, tail = "left", style }: { text: string; tail?: "left" | "bottom"; style?: CSSProperties }) {
  return (
    <motion.button
      key={text}
      initial={{ opacity: 0, scale: 0.8, y: 6 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 400, damping: 22 }}
      onClick={() => say(text)}
      aria-label={`${text} — tap to hear`}
      style={{
        position: "relative",
        background: C.card,
        border: `3px solid ${C.ink}`,
        borderRadius: 20,
        padding: "12px 16px",
        fontFamily: FONT_HI,
        fontSize: 22,
        fontWeight: 600,
        color: C.ink,
        cursor: "pointer",
        textAlign: "left",
        maxWidth: 260,
        boxShadow: `0 4px 0 ${C.lineLip}`,
        ...style,
      }}
    >
      {text} <span aria-hidden style={{ fontSize: 16, opacity: 0.6 }}>🔊</span>
      <span
        aria-hidden
        style={{
          position: "absolute",
          width: 16,
          height: 16,
          background: C.card,
          borderLeft: `3px solid ${C.ink}`,
          borderBottom: `3px solid ${C.ink}`,
          ...(tail === "left"
            ? { left: -10, top: "50%", transform: "translateY(-50%) rotate(45deg)" }
            : { left: "50%", bottom: -10, transform: "translateX(-50%) rotate(-45deg)" }),
        }}
      />
    </motion.button>
  );
}

/** The thick, rounded lesson bar; it glows on a run of three (§3.8). */
export function Bar({ value, glow = false }: { value: number; glow?: boolean }) {
  return (
    <div
      style={{
        height: 18,
        borderRadius: 9,
        background: C.ghost,
        overflow: "hidden",
        flex: 1,
        boxShadow: glow ? `0 0 0 3px ${ROLES.reward.fill}55, 0 0 16px ${ROLES.reward.fill}` : "none",
        transition: "box-shadow 600ms",
      }}
    >
      <motion.div
        animate={{ width: `${Math.max(6, value * 100)}%`, background: glow ? ROLES.reward.fill : ROLES.correct.fill }}
        transition={{ type: "spring", stiffness: 200, damping: 24 }}
        style={{ height: "100%", borderRadius: 9, position: "relative" }}
      >
        <div style={{ position: "absolute", left: 8, right: 8, top: 4, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.35)" }} />
      </motion.div>
    </div>
  );
}

/** A child screen: the off-white page, centred column, scrolls if it must. */
export function Screen({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div
      style={{
        height: "100dvh",
        overflowY: "auto",
        background: C.page,
        color: C.ink,
        fontFamily: FONT_UI,
        ...style,
      }}
    >
      <div
        style={{
          maxWidth: 560,
          margin: "0 auto",
          minHeight: "100%",
          padding: "20px 16px 28px",
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        {children}
      </div>
    </div>
  );
}

export const hi = (size: number, weight = 700): CSSProperties => ({ fontFamily: FONT_HI, fontSize: size, fontWeight: weight });
