/**
 * The child-facing colour roles (G4; docs/11 §3.9), for inline styles and
 * SVG. The same values are CSS variables in `src/styles/kit.css`; keep the two
 * in step. Worked out in the play lab, which now imports them from here.
 */
export type Role = { id: string; name: string; job: string; fill: string; lip: string; text: string };

export const ROLES = {
  go: { id: "go", name: "Go", job: "the one thing to press next", fill: "#0E7C7B", lip: "#085453", text: "#FFFFFF" },
  correct: { id: "correct", name: "Correct", job: "a right answer, the success sheet", fill: "#2F7D32", lip: "#1E5520", text: "#FFFFFF" },
  info: { id: "info", name: "Info", job: "listen, secondary help", fill: "#3949AB", lip: "#26327A", text: "#FFFFFF" },
  reward: { id: "reward", name: "Reward", job: "chests, stars, mastered letters", fill: "#F2A900", lip: "#B57E00", text: "#3B2A00" },
  day: { id: "day", name: "Day", job: "the week strip, the tree", fill: "#C8442B", lip: "#8F2F1D", text: "#FFFFFF" },
  hint: { id: "hint", name: "Not yet", job: "a wrong answer's outline — never a fill", fill: "#D9603F", lip: "#A84A30", text: "#3A1A10" },
} satisfies Record<string, Role>;

export const C = {
  page: "#F7F6F2",
  card: "#FFFFFF",
  ink: "#1F1D1A",
  muted: "#6B6A65",
  line: "#D9D6CC",
  lineLip: "#B9B5A8",
  ghost: "#ECEAE3",
};

function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}

/** WCAG 2 contrast ratio between two #rrggbb colours. */
export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}
