import { useState } from "react";
import { motion } from "motion/react";
import { Mitthu } from "../Mitthu";
import { Chest, Tree } from "../art";
import { Btn3D, Bubble, Screen, hi } from "../ui";
import { C, ROLES } from "../tokens";
import { buzz, say, sfx } from "../sounds";

/**
 * docs/11 §3.4–3.5: one small mission a day, a week strip that starts fresh on
 * Monday without losing anything, and a tree that only ever grows. No counter
 * that resets; the days-in-a-row number belongs to the grown-up's report.
 */
const DAYS = ["सोम", "मंगल", "बुध", "गुरु", "शुक्र", "शनि", "रवि"];
const STICKERS = ["🐄", "🐇", "🪷", "🥕", "🏡", "🐘", "🦚"];

const SCENARIOS: Record<string, { today: number; practised: number[]; leaves: number; mission: boolean }> = {
  // Monday: a fresh strip — last week's stickers are in the album, the tree kept its leaves.
  monday: { today: 0, practised: [], leaves: 9, mission: false },
  // Thursday, Wednesday missed: nothing went back to zero.
  midweek: { today: 3, practised: [0, 1], leaves: 11, mission: false },
  // Thursday, today's lesson done: the mission's chest waits to be opened.
  done: { today: 3, practised: [0, 1, 3], leaves: 12, mission: true },
};

function WeekStrip({ today, practised }: { today: number; practised: number[] }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6 }}>
      {DAYS.map((d, i) => {
        const done = practised.includes(i);
        return (
          <div key={d} style={{ display: "grid", justifyItems: "center", gap: 4 }}>
            <div
              style={{
                width: "100%", maxWidth: 46, aspectRatio: "1", borderRadius: "50%", display: "grid", placeItems: "center", fontSize: 22,
                background: done ? ROLES.day.fill : C.card,
                border: `3px solid ${i === today ? C.ink : done ? ROLES.day.lip : C.line}`,
              }}
            >
              {done ? STICKERS[i] : ""}
            </div>
            <span style={{ ...hi(12, i === today ? 800 : 500), color: i === today ? C.ink : C.muted }}>{d}</span>
          </div>
        );
      })}
    </div>
  );
}

export function HomeStation({ variant }: { variant: string }) {
  const sc = SCENARIOS[variant] ?? SCENARIOS.midweek;
  const [opened, setOpened] = useState(false);
  const card = { background: C.card, border: `2px solid ${C.line}`, borderRadius: 20, padding: 16, boxShadow: `0 4px 0 ${C.line}` };

  return (
    <Screen>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Mitthu pose="wave" size={110} />
        <Bubble text="नमस्ते आरव!" />
      </div>

      <section style={card}>
        <div style={{ ...hi(18, 800), marginBottom: 10 }}>आज का मिशन</div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 28 }} aria-hidden>🎯</span>
          <div style={{ flex: 1 }}>
            <div style={{ ...hi(16, 600), marginBottom: 6 }}>1 अक्षर खेलो</div>
            <div style={{ height: 18, borderRadius: 9, background: C.ghost, overflow: "hidden" }}>
              <motion.div
                initial={{ width: "4%" }}
                animate={{ width: sc.mission ? "100%" : "4%" }}
                transition={{ duration: 0.8, delay: 0.2 }}
                style={{ height: "100%", borderRadius: 9, background: ROLES.reward.fill }}
              />
            </div>
          </div>
          <motion.button
            aria-label="chest"
            disabled={!sc.mission}
            animate={sc.mission && !opened ? { rotate: [0, -6, 6, -6, 0] } : {}}
            transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 1.2 }}
            onClick={() => {
              if (!sc.mission || opened) return;
              sfx.pop();
              buzz(40);
              setOpened(true);
              say("वाह! गाय का स्टिकर!");
            }}
            style={{ border: 0, background: "none", padding: 0, cursor: sc.mission ? "pointer" : "default", position: "relative" }}
          >
            <Chest size={56} open={opened} />
            {opened && (
              <motion.span
                initial={{ y: 0, scale: 0 }}
                animate={{ y: -46, scale: 1.4 }}
                style={{ position: "absolute", left: 14, top: 0, fontSize: 26 }}
              >
                🐄
              </motion.span>
            )}
          </motion.button>
        </div>
        {sc.mission && !opened && <div style={{ ...hi(15, 700), color: ROLES.go.fill, marginTop: 8, textAlign: "right" }}>खोलो!</div>}
      </section>

      <section style={card}>
        <div style={{ ...hi(18, 800), marginBottom: 12 }}>मेरा हफ़्ता</div>
        <WeekStrip today={sc.today} practised={sc.practised} />
      </section>

      <section style={{ ...card, display: "flex", alignItems: "center", gap: 12 }}>
        <Tree leaves={sc.leaves} size={130} fresh={sc.mission} />
        <div style={hi(16, 600)}>मिट्ठू का पेड़ — हर दिन एक नया पत्ता</div>
      </section>

      <div style={{ marginTop: "auto", display: "flex", justifyContent: "center" }}>
        <Btn3D full onClick={() => say("चलो खेलें!")}>
          चलो खेलें
        </Btn3D>
      </div>
    </Screen>
  );
}
