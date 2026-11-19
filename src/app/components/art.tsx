import { motion } from "motion/react";
import { ROLES } from "../theme/colors";

/**
 * In-house SVG pieces (D2), in Mitthu's line work: ink outlines, flat fills.
 * Drawn for the play lab, moved here with G4; the lab re-exports this file.
 */
const INK = "#1F1D1A";

/** A chest. `open` swings the lid back on its hinge and lets the light out. */
export function Chest({ open = false, size = 72, shiny = false }: { open?: boolean; size?: number; shiny?: boolean }) {
  const wood = shiny ? "#7B4FC9" : "#A0612E";
  const band = ROLES.reward.fill;
  return (
    <svg viewBox="0 0 120 110" width={size} height={(size * 110) / 120} style={{ overflow: "visible", display: "block" }} aria-hidden>
      {open && (
        <g>
          {[-60, -30, 0, 30, 60].map((a) => (
            <motion.path
              key={a}
              d="M 60 52 L 52 -20 L 68 -20 Z"
              fill={band}
              opacity={0.5}
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{ duration: 0.4 }}
              style={{ transformBox: "view-box", transformOrigin: "60px 52px", rotate: a }}
            />
          ))}
        </g>
      )}
      {/* box */}
      <path d="M 14 50 L 106 50 L 102 102 L 18 102 Z" fill={wood} stroke={INK} strokeWidth={4} strokeLinejoin="round" />
      <path d="M 16 70 L 104 70" stroke={band} strokeWidth={6} />
      <path d="M 16 70 L 104 70" stroke={INK} strokeWidth={1.5} strokeDasharray="2 5" />
      <rect x={50} y={60} width={20} height={22} rx={4} fill={band} stroke={INK} strokeWidth={3} />
      <circle cx={60} cy={70} r={3} fill={INK} />
      {/* lid, hinged at the back edge */}
      <g
        style={{
          transformBox: "view-box",
          transformOrigin: "14px 50px",
          transform: open ? "rotate(-115deg)" : "rotate(0deg)",
          transition: "transform 380ms cubic-bezier(.3,1.6,.5,1)",
        }}
      >
        <path d="M 14 50 C 14 22 106 22 106 50 Z" fill={wood} stroke={INK} strokeWidth={4} strokeLinejoin="round" />
        <path d="M 40 50 C 40 30 44 27 46 27 M 80 50 C 80 30 76 27 74 27" stroke={band} strokeWidth={6} fill="none" />
      </g>
      {shiny && !open && (
        <path d="M 96 18 L 100 28 L 110 32 L 100 36 L 96 46 L 92 36 L 82 32 L 92 28 Z" fill={band} stroke={INK} strokeWidth={2} />
      )}
    </svg>
  );
}

/** Leaf positions on the tree, oldest first. A new leaf is added, nothing is ever taken away (§3.5). */
const LEAVES: [number, number, number][] = [
  [100, 92, -30], [74, 104, -60], [126, 104, 40], [88, 70, -20], [114, 70, 20], [60, 84, -70], [140, 84, 60],
  [100, 52, 0], [70, 60, -40], [130, 60, 40], [48, 106, -80], [152, 106, 80], [84, 44, -20], [116, 44, 20],
  [56, 70, -50], [144, 70, 50], [100, 32, 0], [36, 90, -80], [164, 90, 80], [70, 34, -30], [130, 34, 30],
  [44, 56, -60], [156, 56, 60], [86, 22, -10], [114, 22, 10], [30, 72, -70], [170, 72, 70], [58, 40, -40],
  [142, 40, 40], [100, 12, 0],
];

export function Tree({ leaves, size = 150, fresh = false }: { leaves: number; size?: number; fresh?: boolean }) {
  const shown = Math.min(leaves, LEAVES.length);
  return (
    <svg viewBox="0 0 200 180" width={size} height={(size * 180) / 200} style={{ display: "block", overflow: "visible" }} aria-label={`A tree with ${leaves} leaves`}>
      <path d="M 40 172 Q 100 162 160 172" stroke={INK} strokeWidth={4} fill="none" strokeLinecap="round" />
      <g stroke={INK} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" fill="none">
        <path d="M 96 170 C 98 140 94 120 100 96 M 104 170 C 102 140 106 120 100 96" />
        <path d="M 100 112 C 84 102 70 96 54 88 M 100 112 C 116 102 130 96 146 88" />
        <path d="M 100 96 C 92 76 80 60 70 46 M 100 96 C 108 76 120 60 130 46 M 100 96 L 100 30" />
      </g>
      <path d="M 96 170 C 98 140 94 120 100 96 C 106 120 102 140 104 170 Z" fill="#8A5A2E" />
      {LEAVES.slice(0, shown).map(([x, y, r], i) => {
        const isNew = fresh && i === shown - 1;
        return (
          <motion.path
            key={i}
            d={`M ${x} ${y} c -6 -10 -2 -18 0 -20 c 2 2 6 10 0 20 Z`}
            fill={i % 3 === 0 ? "#2F8A45" : i % 3 === 1 ? "#4DAA57" : "#7CC36A"}
            stroke={INK}
            strokeWidth={1.8}
            initial={isNew ? { scale: 0 } : false}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 12, delay: 0.3 }}
            style={{ transformBox: "view-box", transformOrigin: `${x}px ${y}px`, rotate: r }}
          />
        );
      })}
    </svg>
  );
}
