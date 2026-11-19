import type { CSSProperties } from "react";

// The companion (docs/11 §3.1). Drawn first for the play lab (src/lab/play),
// moved here when Teach Mitthu (G3) put him in front of children; the lab
// re-exports this file, so there is one Mitthu.

/**
 * मिट्ठू, drawn in-house (D2): an Indian ring-necked parakeet in flat folk-art
 * line work — heavy ink outlines, flat fills, the belly and wing patterned
 * with scallops and hatching, the eye ringed with dots (D1: "not a rounded
 * blob", not Duo).
 *
 * One drawing; a pose turns the head, swings the wing and adds a small extra.
 * Pivots are CSS transforms in view-box units, so a pose change eases between
 * positions and the loops (hop, wave, dance) are keyframes. Both stop under
 * prefers-reduced-motion. Per docs/11 §3.1 he is never sad: "think" is curious.
 */
export type Pose = "wave" | "excited" | "listen" | "hop" | "think" | "lean" | "proud" | "dance";

export const POSES: { id: Pose; label: string; moment: string; line: string }[] = [
  { id: "wave", label: "Waving", moment: "App opens", line: "नमस्ते आरव! आज कौन-सा अक्षर?" },
  { id: "excited", label: "Excited", moment: "Session starts", line: "चलो, सुनते हैं!" },
  { id: "listen", label: "Listening", moment: "Child is listening", line: "" },
  { id: "hop", label: "Hop", moment: "Right answer", line: "शाबाश!" },
  { id: "think", label: "Thinking", moment: "Wrong answer", line: "फिर से सुनो" },
  { id: "lean", label: "Leaning in", moment: "Child hesitates", line: "" },
  { id: "proud", label: "Proud", moment: "Session ends", line: "मुझे तुम पर गर्व है!" },
  { id: "dance", label: "Dance", moment: "Letter mastered", line: "ग अब तुम्हारा है!" },
];

const INK = "#1F1D1A";
const BODY = "#3E9B4F";
const BELLY = "#A9D772";
const WING = "#23703A";
const BEAK = "#D9412B";
const RING = "#E1589A";
const GOLD = "#F2A900";

/** Wing angle (deg, clockwise) about the shoulder; 0 is folded. */
const WING_ANGLE: Record<Pose, number> = {
  wave: 145, excited: 150, listen: -158, hop: 30, think: 0, lean: 10, proud: -18, dance: 140,
};
const HEAD_ANGLE: Record<Pose, number> = {
  wave: 0, excited: -4, listen: 14, hop: -6, think: -14, lean: 10, proud: -4, dance: 6,
};

const KEYFRAMES = `
@keyframes mitthu-hop { 0%,100% { transform: translateY(0) } 40% { transform: translateY(-16px) } 60% { transform: translateY(-14px) } }
@keyframes mitthu-dance { 0%,100% { transform: rotate(-6deg) translateY(0) } 50% { transform: rotate(6deg) translateY(-8px) } }
@keyframes mitthu-wave { 0%,100% { transform: rotate(125deg) } 50% { transform: rotate(160deg) } }
@keyframes mitthu-flap { 0%,100% { transform: rotate(120deg) } 50% { transform: rotate(155deg) } }
@keyframes mitthu-twinkle { 0%,100% { opacity: .25; transform: scale(.7) } 50% { opacity: 1; transform: scale(1.1) } }
@media (prefers-reduced-motion: reduce) { .mitthu-anim, .mitthu-anim * { animation: none !important; } }
`;

const pivot = (x: number, y: number): CSSProperties => ({
  transformBox: "view-box",
  transformOrigin: `${x}px ${y}px`,
  transition: "transform 450ms cubic-bezier(.3,1.4,.5,1)",
});

function Sparkle({ x, y, r = 7, delay = 0, fill = GOLD }: { x: number; y: number; r?: number; delay?: number; fill?: string }) {
  return (
    <path
      d={`M ${x} ${y - r} Q ${x} ${y} ${x + r} ${y} Q ${x} ${y} ${x} ${y + r} Q ${x} ${y} ${x - r} ${y} Q ${x} ${y} ${x} ${y - r} Z`}
      fill={fill}
      stroke={INK}
      strokeWidth={1.5}
      style={{ ...pivot(x, y), animation: `mitthu-twinkle 1.4s ${delay}s ease-in-out infinite` }}
    />
  );
}

export function Mitthu({ pose = "wave", size = 160, title }: { pose?: Pose; size?: number; title?: string }) {
  const loop =
    pose === "hop" ? "mitthu-hop .9s ease-in-out infinite" :
    pose === "dance" ? "mitthu-dance .8s ease-in-out infinite" : undefined;
  const wingLoop =
    pose === "wave" ? "mitthu-wave .7s ease-in-out infinite" :
    pose === "dance" ? "mitthu-flap .4s ease-in-out infinite" : undefined;
  const eyesClosed = pose === "proud" || pose === "dance";

  return (
    <svg
      className="mitthu-anim"
      viewBox="0 0 200 230"
      width={size}
      height={(size * 230) / 200}
      role="img"
      aria-label={title ?? `Mitthu, ${pose}`}
      style={{ overflow: "visible", display: "block" }}
    >
      <style>{KEYFRAMES}</style>

      {/* perch */}
      <path d="M 24 200 Q 100 192 182 202" stroke={INK} strokeWidth={9} strokeLinecap="round" fill="none" />
      <path d="M 24 200 Q 100 192 182 202" stroke="#9A6532" strokeWidth={5} strokeLinecap="round" fill="none" />
      <path d="M 160 200 C 168 186 184 184 190 190 C 184 198 170 202 160 200 Z" fill={BELLY} stroke={INK} strokeWidth={2.5} />
      <path d="M 40 199 C 30 210 16 212 10 206 C 16 198 30 196 40 199 Z" fill={BELLY} stroke={INK} strokeWidth={2.5} />

      <g style={{ ...pivot(110, 198), transform: pose === "lean" ? "rotate(8deg)" : "rotate(0deg)" }}>
        <g style={{ ...pivot(110, 198), animation: loop }}>
          {/* tail, behind the body */}
          <g stroke={INK} strokeWidth={3} strokeLinejoin="round">
            <path d="M 92 168 C 78 190 62 210 46 226 C 60 222 80 204 100 176 Z" fill={WING} />
            <path d="M 100 172 C 92 196 82 214 72 230 C 88 222 100 200 108 178 Z" fill={BODY} />
            <path d="M 86 196 L 60 220 M 96 200 L 78 224" strokeWidth={1.5} strokeDasharray="2 4" fill="none" />
          </g>

          {/* feet */}
          <g stroke={INK} strokeWidth={3} strokeLinecap="round" fill="none">
            <path d="M 108 182 L 106 196 M 102 197 L 110 197" />
            <path d="M 122 182 L 124 196 M 120 197 L 128 197" />
          </g>

          {/* body */}
          <path
            d="M 100 86 C 142 86 152 130 142 158 C 134 182 106 190 90 176 C 72 160 70 110 100 86 Z"
            fill={BODY} stroke={INK} strokeWidth={3.5} strokeLinejoin="round"
          />
          {/* belly, scalloped */}
          <path
            d="M 116 106 C 140 116 142 150 130 168 C 122 178 108 178 106 168 C 112 150 110 126 116 106 Z"
            fill={BELLY} stroke={INK} strokeWidth={2.5}
          />
          <g stroke={INK} strokeWidth={1.4} fill="none">
            {[122, 134, 146, 158].map((y) => (
              <path key={y} d={`M ${113 + (y - 122) * 0.1} ${y} q 4 5 8 0 q 4 5 8 0`} />
            ))}
          </g>

          {/* wing, about the shoulder */}
          {/* a loop's keyframes hold the whole angle, so the static one steps aside */}
          <g style={{ ...pivot(102, 110), transform: `rotate(${wingLoop ? 0 : WING_ANGLE[pose]}deg)` }}>
            <g style={{ ...pivot(102, 110), animation: wingLoop }}>
              <path
                d="M 102 106 C 80 118 74 160 90 184 C 106 170 116 136 102 106 Z"
                fill={WING} stroke={INK} strokeWidth={3} strokeLinejoin="round"
              />
              <g stroke={BELLY} strokeWidth={1.6} fill="none" strokeLinecap="round">
                <path d="M 98 120 C 90 136 88 152 90 170" />
                <path d="M 104 126 C 98 142 96 156 96 166" strokeDasharray="1 4" />
              </g>
            </g>
          </g>

          {/* head, about the neck */}
          <g style={{ ...pivot(114, 96), transform: `rotate(${HEAD_ANGLE[pose]}deg)` }}>
            <circle cx={122} cy={64} r={30} fill={BODY} stroke={INK} strokeWidth={3.5} />
            <circle cx={122} cy={64} r={24} fill="none" stroke={INK} strokeWidth={1.2} strokeDasharray="1 5" strokeLinecap="round" />
            {/* the rose ring */}
            <path d="M 98 80 Q 118 100 148 78" stroke={INK} strokeWidth={7} fill="none" strokeLinecap="round" />
            <path d="M 98 80 Q 118 100 148 78" stroke={RING} strokeWidth={3.5} fill="none" strokeLinecap="round" />
            {/* beak */}
            <path d="M 144 52 C 162 50 172 66 166 84 C 162 78 154 74 146 74 Z" fill={BEAK} stroke={INK} strokeWidth={3} strokeLinejoin="round" />
            <path d="M 146 74 C 154 76 158 80 156 88 C 150 88 146 84 145 78 Z" fill="#9E2A1A" stroke={INK} strokeWidth={2.5} strokeLinejoin="round" />
            {/* eye */}
            {eyesClosed ? (
              <path d="M 122 62 Q 130 53 138 62" stroke={INK} strokeWidth={3.5} fill="none" strokeLinecap="round" />
            ) : (
              <>
                <circle cx={130} cy={60} r={13} fill="none" stroke={INK} strokeWidth={1.3} strokeDasharray="1 4" strokeLinecap="round" />
                <circle cx={130} cy={60} r={9} fill="#FFFDF5" stroke={INK} strokeWidth={2.5} />
                <circle cx={pose === "think" ? 128 : 131} cy={pose === "think" ? 56 : 61} r={4.5} fill={INK} />
                <circle cx={pose === "think" ? 129.5 : 132.5} cy={pose === "think" ? 54.5 : 59.5} r={1.5} fill="#fff" />
              </>
            )}
            {pose === "proud" && (
              <path d="M 136 68 C 133 74 133 78 136 79 C 139 78 139 74 136 68 Z" fill="#8FD3F4" stroke={INK} strokeWidth={1.5} />
            )}
            <circle cx={140} cy={72} r={3.5} fill={RING} opacity={pose === "hop" || pose === "excited" || pose === "proud" ? 0.9 : 0} />
          </g>
        </g>
      </g>

      {/* the pose's extra */}
      {pose === "listen" && (
        <g stroke={INK} strokeWidth={3} fill="none" strokeLinecap="round">
          <path d="M 80 46 Q 72 58 80 70" />
          <path d="M 68 38 Q 56 58 68 78" opacity={0.5} />
        </g>
      )}
      {pose === "think" && (
        <g fill="#fff" stroke={INK} strokeWidth={2}>
          <circle cx={156} cy={30} r={4} />
          <circle cx={168} cy={18} r={6} />
          <circle cx={184} cy={4} r={9} />
        </g>
      )}
      {(pose === "excited" || pose === "dance" || pose === "proud") && (
        <>
          <Sparkle x={52} y={40} />
          <Sparkle x={172} y={110} r={6} delay={0.4} />
          <Sparkle x={38} y={120} r={5} delay={0.8} fill="#E1589A" />
        </>
      )}
      {pose === "dance" && (
        <g stroke={INK} strokeWidth={2.5} strokeLinejoin="round">
          <path d="M 160 6 L 186 6 L 184 22 C 182 30 164 30 162 22 Z" fill={GOLD} />
          <path d="M 169 30 L 177 30 L 179 38 L 167 38 Z" fill={GOLD} />
        </g>
      )}
    </svg>
  );
}
