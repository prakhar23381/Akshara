import { useEffect, useRef, useState, type CSSProperties } from "react";
import { motion } from "motion/react";
import { LETTER_SEQUENCE } from "../../../app/types/levelConfig";
import { Mitthu } from "../Mitthu";
import { Chest } from "../art";
import { Screen, hi } from "../ui";
import { C, ROLES } from "../tokens";
import { playLetter, say, sfx } from "../sounds";

/**
 * docs/11 §3.3: one winding path of 33 letters in units by varga, instead of
 * four pages of tiles. No percentage anywhere: a practising letter's ring fills.
 * Letters ahead are grey but not padlocked — D3 moved to the curriculum plan.
 */
const UNITS: { name: string; letters: string[] }[] = [
  { name: "गले की आवाज़ें", letters: ["क", "ख", "ग", "घ", "ङ"] },
  { name: "तालु की आवाज़ें", letters: ["च", "छ", "ज", "झ", "ञ"] },
  { name: "जीभ मोड़ो", letters: ["ट", "ठ", "ड", "ढ", "ण"] },
  { name: "दाँत की आवाज़ें", letters: ["त", "थ", "द", "ध", "न"] },
  { name: "होंठ की आवाज़ें", letters: ["प", "फ", "ब", "भ", "म"] },
  { name: "य र ल व", letters: ["य", "र", "ल", "व"] },
  { name: "श ष स ह", letters: ["श", "ष", "स", "ह"] },
];

type Node = { kind: "mastered" } | { kind: "practising"; fill: number } | { kind: "current" } | { kind: "ahead" };

/** Scenarios: where the child is, and how the letters behind them went. */
function scenario(variant: string): Record<string, Node> {
  const at = variant === "start" ? 0 : variant === "unit1" ? 2 : 15;
  const out: Record<string, Node> = {};
  LETTER_SEQUENCE.forEach((l, i) => {
    if (i === at) out[l] = { kind: "current" };
    else if (i > at) out[l] = { kind: "ahead" };
    else if (i % 4 === 1) out[l] = { kind: "practising", fill: 0.25 + (i % 3) * 0.17 };
    else out[l] = { kind: "mastered" };
  });
  return out;
}

const SWAY = [0, 46, 70, 46, 0, -46, -70, -46];

function Ring({ fill, size }: { fill: number; size: number }) {
  const r = size / 2 - 5;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} style={{ position: "absolute", inset: 0, transform: "rotate(-90deg)" }} aria-hidden>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={C.ghost} strokeWidth={7} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={ROLES.info.fill} strokeWidth={7} strokeLinecap="round" strokeDasharray={`${c * fill} ${c}`} />
    </svg>
  );
}

function LetterNode({ letter, node }: { letter: string; node: Node }) {
  const [nudge, setNudge] = useState(0);
  const current = node.kind === "current";
  const size = current ? 88 : 68;
  const look: CSSProperties =
    node.kind === "mastered"
      ? { background: ROLES.reward.fill, color: ROLES.reward.text, boxShadow: `0 6px 0 ${ROLES.reward.lip}` }
      : node.kind === "practising"
        ? { background: C.card, color: C.ink, boxShadow: `0 6px 0 ${C.lineLip}` }
        : current
          ? { background: ROLES.go.fill, color: ROLES.go.text, boxShadow: `0 7px 0 ${ROLES.go.lip}` }
          : { background: C.ghost, color: "#ABA79B", boxShadow: `0 6px 0 ${C.line}` };
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      {current && (
        <>
          <motion.div
            aria-hidden
            animate={{ scale: [1, 1.25], opacity: [0.5, 0] }}
            transition={{ duration: 1.6, repeat: Infinity }}
            style={{ position: "absolute", inset: -6, borderRadius: "50%", border: `4px solid ${ROLES.go.fill}` }}
          />
          <motion.div
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 1.4, repeat: Infinity }}
            style={{
              position: "absolute", bottom: size + 16, left: "50%", translateX: "-50%", whiteSpace: "nowrap",
              background: C.card, border: `3px solid ${C.line}`, color: ROLES.go.fill, borderRadius: 12, padding: "6px 12px",
              ...hi(17, 800),
            }}
          >
            शुरू करो
          </motion.div>
        </>
      )}
      <motion.button
        key={nudge}
        animate={node.kind === "ahead" && nudge ? { rotate: [0, -8, 8, -4, 0] } : {}}
        onClick={() => {
          sfx.tap();
          if (node.kind === "ahead") setNudge((n) => n + 1);
          else if (current) say("चलो!");
          else playLetter(letter);
        }}
        aria-label={`${letter}, ${node.kind}`}
        style={{
          position: "relative", width: size, height: size, borderRadius: "50%", border: 0, cursor: "pointer",
          display: "grid", placeItems: "center", ...hi(current ? 44 : 34, 700), ...look,
        }}
      >
        {node.kind === "practising" && <Ring fill={node.fill} size={size} />}
        <span style={{ position: "relative" }}>{letter}</span>
        {node.kind === "mastered" && <span aria-hidden style={{ position: "absolute", top: -14, fontSize: 20 }}>👑</span>}
      </motion.button>
    </div>
  );
}

export function PathStation({ variant }: { variant: string }) {
  const nodes = scenario(variant);
  const here = useRef<HTMLDivElement>(null);
  useEffect(() => {
    here.current?.scrollIntoView({ block: "center" });
  }, [variant]);
  let i = 0;
  return (
    <Screen style={{ paddingBottom: 40 }}>
      {UNITS.map((u, ui) => (
        <section key={u.name} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 22 }}>
          <header
            style={{
              alignSelf: "stretch", borderRadius: 18, padding: "12px 16px", color: "#fff",
              background: ui % 2 ? ROLES.info.fill : ROLES.go.fill, boxShadow: `0 5px 0 ${ui % 2 ? ROLES.info.lip : ROLES.go.lip}`,
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 700, opacity: 0.85, letterSpacing: "0.08em" }}>इकाई {ui + 1}</div>
            <div style={hi(20, 700)}>{u.name}</div>
          </header>
          {u.letters.map((l) => {
            const sway = SWAY[i++ % SWAY.length];
            const current = nodes[l].kind === "current";
            return (
              <div key={l} ref={current ? here : undefined} style={{ position: "relative", transform: `translateX(${sway}px)`, marginTop: current ? 64 : 0 }}>
                <LetterNode letter={l} node={nodes[l]} />
                {current && (
                  <div style={{ position: "absolute", top: 4, [sway > 0 ? "right" : "left"]: 100, transform: sway > 0 ? undefined : "scaleX(-1)" }}>
                    <Mitthu pose="wave" size={72} />
                  </div>
                )}
              </div>
            );
          })}
          <Chest size={64} />
        </section>
      ))}
    </Screen>
  );
}
