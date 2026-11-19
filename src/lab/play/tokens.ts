/**
 * The proposed visual language (docs/11 §3.9): one colour per meaning, and a
 * darker "lip" under everything pressable.
 *
 * Deliberately not Duolingo green (D1): "go" is peacock teal, "correct" a
 * deeper leaf green, reward is marigold. Every pair that carries text is
 * checked against WCAG AA in the Buttons & colours station, so a failing
 * choice shows up there rather than on a child's screen.
 */
// The roles moved into the app with G4; the lab shows the same ones.
import { ROLES, C, contrast, type Role } from "../../app/theme/colors";
export { ROLES, C, contrast, type Role };

/** Today's colours, for the before/after. `need` is 3 : 1 for an outline (non-text), else 4.5 : 1. */
export const TODAY_PAIRS: { name: string; fg: string; bg: string; need?: number }[] = [
  { name: "Primary button", fg: "#FFFFFF", bg: "#4A90E2" },
  { name: "Correct tile", fg: "#FFFFFF", bg: "#4CAF50" },
  { name: "Hint tile", fg: "#1F1F1F", bg: "#FFD166" },
  { name: "Wrong outline", fg: "#E76F51", bg: "#F7F6F2", need: 3 },
];

export const FONT_UI = "var(--font-ui), var(--font-devanagari)";
export const FONT_HI = "var(--font-devanagari), var(--font-ui)";

