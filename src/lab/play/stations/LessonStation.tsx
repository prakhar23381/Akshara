import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { getLetterContent } from "../../../app/data/letterContent";
import { playErrorSound, playSuccessSound } from "../../../app/utils/soundEffects";
import { Mitthu } from "../Mitthu";
import { Bar, Btn3D, Bubble, Screen, Tile, hi, type TileState } from "../ui";
import { C, ROLES } from "../tokens";
import { buzz, playLetter, say } from "../sounds";

/**
 * docs/11 §3.8 with D5–D7, on a mock Listen & tap:
 * - the thick bar glows after three right in a row; when the run ends the glow
 *   just fades — nothing says "combo lost";
 * - a right answer opens the green sheet (Mitthu, a spoken praise word, a word
 *   that starts with the letter) and waits for Continue (D7);
 * - a wrong answer gets the orange outline and "फिर से सुनो", no sheet; the
 *   tile fades and the child keeps going;
 * - answer on tap, no CHECK (D6); an unlabelled 🐢 replays slowly (D5).
 */
const QUESTIONS: { target: string; options: string[] }[] = [
  { target: "ग", options: ["ग", "म", "न", "भ"] },
  { target: "क", options: ["फ", "क", "ख", "ग"] },
  { target: "ग", options: ["घ", "ग", "म", "ध"] },
  { target: "ख", options: ["ख", "व", "र", "क"] },
  { target: "ग", options: ["भ", "म", "ग", "न"] },
];
const PRAISE = ["शाबाश!", "वाह!", "बहुत बढ़िया!"];

// Reserved sizes (px): the run label, the bubble slot, Mitthu's row and its control column.
const GLOW_H = 24;
const BUBBLE_H = 68;
const ROW_H = 144;
const COL_W = 200;

type Status = "asking" | "right" | "done";

function start(variant: string) {
  if (variant === "glow") return { q: 2, run: 2, status: "asking" as Status, misses: [] as string[] };
  if (variant === "sheet") return { q: 0, run: 1, status: "right" as Status, misses: [] };
  if (variant === "wrong") return { q: 0, run: 0, status: "asking" as Status, misses: ["म"] };
  return { q: 0, run: 0, status: "asking" as Status, misses: [] };
}

export function LessonStation({ variant }: { variant: string }) {
  const [s, setS] = useState(() => start(variant));
  const [praiseAt, setPraiseAt] = useState(0);
  const q = QUESTIONS[s.q];
  const glow = s.run >= 3;
  const word = getLetterContent(q.target).exampleWords[0];

  // Mitthu says the sound as each question opens (a browser may wait for a
  // first tap). Keyed on the question alone: a miss must not replay it.
  useEffect(() => {
    if (s.status === "asking" && s.misses.length === 0) playLetter(q.target);
  }, [s.q]);

  const pick = (o: string) => {
    if (s.status !== "asking" || s.misses.includes(o)) return;
    if (o === q.target) {
      playSuccessSound();
      buzz();
      const p = PRAISE[praiseAt % PRAISE.length];
      setPraiseAt((n) => n + 1);
      setTimeout(() => say(p), 250);
      // Right after a miss still counts as right; the run is about first tries.
      setS({ ...s, status: "right", run: s.misses.length ? 0 : s.run + 1 });
    } else {
      playErrorSound();
      setTimeout(() => say("फिर से सुनो"), 200);
      setS({ ...s, run: 0, misses: [...s.misses, o] });
    }
  };

  const next = () =>
    setS(s.q + 1 >= QUESTIONS.length ? { ...s, status: "done" } : { q: s.q + 1, run: s.run, status: "asking", misses: [] });

  if (s.status === "done") {
    return (
      <Screen style={{ display: "grid" }}>
        <div style={{ margin: "auto", display: "grid", justifyItems: "center", gap: 16 }}>
          <Bubble text="शाबाश, आरव!" tail="bottom" />
          <Mitthu pose="proud" size={180} />
          <Btn3D onClick={() => setS(start("play"))}>फिर से</Btn3D>
        </div>
      </Screen>
    );
  }

  const tileState = (o: string): TileState =>
    s.misses.includes(o) ? (s.misses[s.misses.length - 1] === o ? "wrong" : "faded")
    : s.status === "right" && o === q.target ? "correct"
    : s.status === "right" ? "faded"
    : "idle";
  const thinking = s.misses.length > 0 && s.status === "asking";

  return (
    <Screen style={{ position: "relative" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontSize: 22, color: C.muted }} aria-hidden>✕</span>
        <Bar value={(s.q + (s.status === "right" ? 1 : 0)) / QUESTIONS.length} glow={glow} />
      </div>
      {/* Every row keeps its largest size; the label and the bubble come and go
          inside slots that are always there, so nothing on the page moves. */}
      <div style={{ height: GLOW_H, display: "grid", placeItems: "center" }}>
        <AnimatePresence>
          {glow && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              style={{ color: ROLES.reward.lip, whiteSpace: "nowrap", ...hi(15, 800) }}
            >
              ✨ {s.run} लगातार!
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, height: ROW_H }}>
        <Mitthu pose={thinking ? "think" : "listen"} size={110} />
        {/* Fixed width too: the bubble is wider than the two buttons. */}
        <div style={{ width: COL_W, display: "grid", gridTemplateRows: `${BUBBLE_H}px auto`, gap: 10, justifyItems: "start" }}>
          <div style={{ height: BUBBLE_H, display: "flex", alignItems: "center" }}>
            {thinking && <Bubble text="फिर से सुनो" style={{ whiteSpace: "nowrap" }} />}
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <Btn3D role={ROLES.info} onClick={() => playLetter(q.target)} label="Listen" style={{ fontSize: 26, padding: "0 20px" }}>
              🔊
            </Btn3D>
            <Btn3D outline onClick={() => playLetter(q.target, true)} label="🐢" style={{ fontSize: 22, padding: "0 14px" }}>
              🐢
            </Btn3D>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, auto)", justifyContent: "center", gap: 16, marginTop: 8 }}>
        {q.options.map((o) => (
          <Tile key={`${s.q}-${o}`} state={tileState(o)} onClick={() => pick(o)} size={118}>
            {o}
          </Tile>
        ))}
      </div>

      <AnimatePresence>
        {s.status === "right" && (
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            style={{
              position: "fixed", left: 0, right: 0, bottom: 0, background: "#DDF0DD", borderTop: `3px solid ${ROLES.correct.fill}`,
              padding: "16px 16px 24px", display: "grid", gap: 12, justifyItems: "center",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", maxWidth: 520 }}>
              <Mitthu pose="hop" size={70} />
              <div style={{ flex: 1 }}>
                <div style={{ ...hi(24, 800), color: ROLES.correct.lip }}>✓ {PRAISE[(praiseAt + PRAISE.length - 1) % PRAISE.length]}</div>
                <button
                  onClick={() => say(word.word)}
                  style={{ border: 0, background: "none", padding: 0, cursor: "pointer", ...hi(20, 600), color: C.ink }}
                >
                  <span style={{ fontSize: 32, verticalAlign: "middle" }}>{word.image}</span> {word.word} 🔊
                </button>
              </div>
            </div>
            <Btn3D role={ROLES.correct} full onClick={next}>
              आगे
            </Btn3D>
          </motion.div>
        )}
      </AnimatePresence>
    </Screen>
  );
}
