import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { getLetterContent } from "../../../app/data/letterContent";
import { Mitthu } from "../Mitthu";
import { Chest } from "../art";
import { Btn3D, Bubble, Screen, hi } from "../ui";
import { C, ROLES } from "../tokens";
import { buzz, say, sfx } from "../sounds";

/**
 * docs/11 §3.6–3.7: the end of a session in beats, one message each, one tap
 * to go on, the whole under about 15 s:
 *   1. Mitthu is proud, with three quality cards — each praises something true
 *      the child did, never a score or a time;
 *   2. the letter flips into the album (gold with a crown when mastered);
 *   3. today's sticker lands on the week strip;
 *   4. a chest to open — only when one was earned, and never empty.
 */
type Facts = {
  sharpEyes?: boolean; // a look-alike question right without help
  listened?: boolean; // pressed Listen again
  traced?: boolean;
  memory?: boolean;
  persisted?: boolean; // finished after a wrong answer
  mastered?: boolean;
  chest?: boolean; // daily mission met or unit finished
};

const PROFILES: Record<string, Facts> = {
  full: { sharpEyes: true, listened: true, traced: true, memory: true, chest: true },
  gritty: { listened: true, traced: true, memory: true, persisted: true },
  // A lesson without tracing — G1 splits today's games across three lessons.
  quick: { memory: true },
  mastered: { sharpEyes: true, traced: true, memory: true, mastered: true, chest: true },
};

/** The doc's table, in its order of preference; the fallback always applies. */
const CARDS: { id: keyof Facts | "finished"; icon: string; title: string; gloss: string }[] = [
  { id: "sharpEyes", icon: "👀", title: "तेज़ आँखें", gloss: "Sharp eyes" },
  { id: "listened", icon: "👂", title: "अच्छे श्रोता", gloss: "Good listener" },
  { id: "traced", icon: "✍️", title: "पक्का हाथ", gloss: "Steady hand" },
  { id: "memory", icon: "🧠", title: "याद का जादू", gloss: "Memory magic" },
  { id: "persisted", icon: "💪", title: "हिम्मत", gloss: "Never gave up" },
  { id: "finished", icon: "✅", title: "पूरा किया", gloss: "Finished!" },
];

const LETTER = "ग";
const TODAY = 3;
const DAYS = ["सोम", "मंगल", "बुध", "गुरु", "शुक्र", "शनि", "रवि"];

function Dots({ n, at }: { n: number; at: number }) {
  return (
    <div style={{ display: "flex", gap: 6, justifyContent: "center" }} aria-label={`beat ${at + 1} of ${n}`}>
      {Array.from({ length: n }, (_, i) => (
        <span key={i} style={{ width: i === at ? 22 : 8, height: 8, borderRadius: 4, background: i <= at ? ROLES.reward.fill : C.line, transition: "width 200ms" }} />
      ))}
    </div>
  );
}

function Proud({ facts }: { facts: Facts }) {
  const cards = CARDS.filter((c) => c.id === "finished" || facts[c.id as keyof Facts]).slice(0, 3);
  useEffect(() => {
    say("शाबाश, आरव!");
  }, []);
  return (
    <>
      <div style={{ display: "grid", justifyItems: "center", gap: 8 }}>
        <Bubble text="शाबाश, आरव!" tail="bottom" />
        <Mitthu pose="proud" size={150} />
        <div style={{ display: "flex", gap: 8, fontSize: 40 }} aria-label="three stars">
          {[0, 1, 2].map((i) => (
            <motion.span key={i} initial={{ scale: 0, rotate: -40 }} animate={{ scale: 1, rotate: 0 }} transition={{ delay: 0.3 + i * 0.25, type: "spring" }}>
              ⭐
            </motion.span>
          ))}
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${cards.length}, 1fr)`, gap: 10 }}>
        {cards.map((c, i) => (
          <motion.button
            key={c.id}
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 1.1 + i * 0.2 }}
            onClick={() => say(c.title)}
            style={{
              border: `3px solid ${ROLES.reward.fill}`, borderRadius: 16, background: C.card, padding: "10px 6px",
              boxShadow: `0 4px 0 ${ROLES.reward.lip}`, cursor: "pointer", display: "grid", justifyItems: "center", gap: 4,
            }}
          >
            <span style={{ fontSize: 30 }}>{c.icon}</span>
            <span style={{ ...hi(15, 800), color: C.ink }}>{c.title}</span>
            <span style={{ fontSize: 11, color: C.muted }}>{c.gloss}</span>
          </motion.button>
        ))}
      </div>
      {cards.length < 3 && (
        <p style={{ margin: 0, fontSize: 12, color: "#A3341F", textAlign: "center" }}>
          Lab note: only {cards.length} cards apply to this session — see docs/11 §9.
        </p>
      )}
    </>
  );
}

function Collected({ mastered }: { mastered?: boolean }) {
  const [flipped, setFlipped] = useState(false);
  const word = getLetterContent(LETTER).exampleWords[0];
  useEffect(() => {
    const t = setTimeout(() => {
      setFlipped(true);
      sfx.flip();
      say(mastered ? `${LETTER} अब तुम्हारा है!` : `${LETTER} तुम्हारे एल्बम में!`);
    }, 400);
    return () => clearTimeout(t);
  }, [mastered]);
  const face = {
    position: "absolute", inset: 0, borderRadius: 22, backfaceVisibility: "hidden", display: "grid", placeItems: "center",
  } as const;
  return (
    <div style={{ display: "grid", justifyItems: "center", gap: 16, margin: "auto 0" }}>
      <div style={{ perspective: 800 }}>
        <motion.div
          animate={{ rotateY: flipped ? 180 : 0 }}
          transition={{ duration: 0.7, type: "spring", stiffness: 120, damping: 14 }}
          style={{ width: 180, height: 240, position: "relative", transformStyle: "preserve-3d" }}
        >
          <div style={{ ...face, background: ROLES.go.fill, border: `4px solid ${C.ink}`, backgroundImage: "radial-gradient(#ffffff40 2px, transparent 2px)", backgroundSize: "16px 16px" }}>
            <span style={{ fontSize: 48 }}>?</span>
          </div>
          <div
            style={{
              ...face, transform: "rotateY(180deg)", background: mastered ? "#FFF4D1" : C.card,
              border: `4px solid ${mastered ? ROLES.reward.fill : C.ink}`, boxShadow: `0 6px 0 ${mastered ? ROLES.reward.lip : C.lineLip}`,
              gridTemplateRows: "auto 1fr auto", padding: "14px 0",
            }}
          >
            <span style={{ fontSize: 26, visibility: mastered ? "visible" : "hidden" }}>👑</span>
            <span style={hi(96, 700)}>{LETTER}</span>
            <span style={hi(18, 600)}>
              {word.image} {word.word}
            </span>
          </div>
        </motion.div>
      </div>
      <div style={hi(22, 800)}>{mastered ? `${LETTER} अब तुम्हारा है!` : `${LETTER} तुम्हारे एल्बम में!`}</div>
    </div>
  );
}

function Sticker() {
  const [landed, setLanded] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => {
      setLanded(true);
      sfx.thwip();
    }, 500);
    return () => clearTimeout(t);
  }, []);
  return (
    <div style={{ display: "grid", gap: 24, margin: "auto 0", justifyItems: "center" }}>
      <div style={hi(22, 800)}>आज का स्टिकर!</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6, width: "100%" }}>
        {DAYS.map((d, i) => {
          const done = i < TODAY ? i !== 2 : i === TODAY && landed;
          return (
            <div key={d} style={{ display: "grid", justifyItems: "center", gap: 4, position: "relative" }}>
              <div
                style={{
                  width: "100%", maxWidth: 46, aspectRatio: "1", borderRadius: "50%", display: "grid", placeItems: "center", fontSize: 22,
                  background: done ? ROLES.day.fill : C.card, border: `3px solid ${i === TODAY ? C.ink : done ? ROLES.day.lip : C.line}`,
                }}
              >
                {i < TODAY && done ? "⭐" : ""}
              </div>
              <span style={{ ...hi(12, i === TODAY ? 800 : 500), color: i === TODAY ? C.ink : C.muted }}>{d}</span>
              {i === TODAY && (
                <motion.span
                  initial={{ y: -160, scale: 2.4, rotate: -30 }}
                  animate={{ y: 0, scale: 1, rotate: 0 }}
                  transition={{ delay: 0.3, type: "spring", stiffness: 260, damping: 16 }}
                  style={{ position: "absolute", top: 4, fontSize: 24 }}
                >
                  🐄
                </motion.span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ChestBeat({ shiny }: { shiny?: boolean }) {
  const [open, setOpen] = useState(false);
  const word = getLetterContent(LETTER).exampleWords[0];
  return (
    <div style={{ display: "grid", gap: 16, margin: "auto 0", justifyItems: "center" }}>
      {shiny && <div style={{ ...hi(16, 800), color: "#7B4FC9", letterSpacing: "0.1em" }}>चमकीला!</div>}
      <motion.button
        aria-label="Open the chest"
        animate={open ? { scale: [1, 1.15, 1] } : { rotate: [0, -5, 5, -5, 5, 0] }}
        transition={open ? { duration: 0.3 } : { duration: 0.6, repeat: Infinity, repeatDelay: 0.8 }}
        onClick={() => {
          if (open) return;
          sfx.pop();
          buzz(50);
          setOpen(true);
          setTimeout(() => say(`${word.word}!`), 400);
        }}
        style={{ border: 0, background: "none", cursor: open ? "default" : "pointer", position: "relative", padding: "60px 0 0" }}
      >
        <Chest size={170} open={open} shiny={shiny} />
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ y: 40, scale: 0 }}
              animate={{ y: -60, scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 12, delay: 0.15 }}
              style={{
                position: "absolute", left: "50%", top: 0, translateX: "-50%", width: 104, height: 104, borderRadius: "50%",
                background: C.card, border: `4px dashed ${ROLES.reward.fill}`, display: "grid", placeItems: "center", fontSize: 58,
              }}
            >
              {word.image}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>
      <div style={hi(22, 800)}>{open ? `${word.word} का स्टिकर!` : "खोलो!"}</div>
    </div>
  );
}

export function CelebrationStation({ variant }: { variant: string }) {
  const facts = PROFILES[variant] ?? PROFILES.full;
  const beats = facts.chest ? 4 : 3;
  const [at, setAt] = useState(0);
  const end = at >= beats;
  return (
    <Screen>
      {!end && <Dots n={beats} at={at} />}
      {end ? (
        <div style={{ margin: "auto", display: "grid", justifyItems: "center", gap: 16 }}>
          <Mitthu pose="wave" size={140} />
          <p style={{ ...hi(18, 700), margin: 0 }}>रास्ते पर वापस — मिट्ठू एक कदम आगे</p>
          <Btn3D outline onClick={() => setAt(0)}>
            फिर से देखो
          </Btn3D>
        </div>
      ) : (
        <>
          {at === 0 && <Proud facts={facts} />}
          {at === 1 && <Collected mastered={facts.mastered} />}
          {at === 2 && <Sticker />}
          {at === 3 && <ChestBeat shiny={facts.mastered} />}
          <div style={{ marginTop: "auto", display: "flex", justifyContent: "center" }}>
            <Btn3D full onClick={() => setAt(at + 1)}>
              आगे
            </Btn3D>
          </div>
        </>
      )}
    </Screen>
  );
}
