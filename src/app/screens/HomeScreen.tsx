import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import { AksharaButton } from "../components/AksharaButton";
import { Mitthu } from "../components/Mitthu";
import { Bubble, say } from "../components/Bubble";
import { Chest, Tree } from "../components/art";
import { useLevelConfig } from "../hooks/useLevelConfig";
import { useAccount } from "../contexts/AccountContext";
import { loadLetterStatuses } from "../lib/learnerProfile";
import { TEACHING_ORDER } from "../data/curriculum";
import { LINES } from "../data/mitthuLines";
import {
  chestOpened,
  markChestOpened,
  missionDone,
  todaysSticker,
  treeLeaves,
  weekStrip,
  type WeekDay,
} from "../lib/rewards";
import { buzz, sfx } from "../utils/soundEffects";
import type { LearningSession } from "../types/session";

/**
 * The child's home (G4; docs/11 §3.1, §3.4–3.5), at /resume.
 *
 * Mitthu greets the child by name, in Hindi, out loud. Below: today's mission
 * (one lesson; its chest opens on a sticker), the week strip of days played,
 * which starts fresh on Monday, and Mitthu's tree, which only ever grows. No
 * number anywhere — the days-in-a-row figure is for the grown-up's report.
 *
 * Replaced the "welcome back" screen (in `.legacy/screens/`), and like it sets
 * where the child is up to: the first letter, in teaching order, not complete.
 */
export function HomeScreen() {
  const navigate = useNavigate();
  const { activeChild } = useAccount();
  const { setLastAvgLatencyMs, jumpToLetterIndex } = useLevelConfig();
  const [sessions, setSessions] = useState<LearningSession[] | null>(null);
  const [opened, setOpened] = useState(false);
  const childId = activeChild?.id;
  const now = new Date();

  useEffect(() => {
    if (!childId) return;
    let live = true;
    setOpened(chestOpened(childId, new Date()));
    loadLetterStatuses(childId)
      .then(({ statuses, saved, sessions }) => {
        if (!live) return;
        setSessions(sessions);
        const next = TEACHING_ORDER.findIndex((l) => !statuses[l]?.complete);
        const index = next >= 0 ? next : TEACHING_ORDER.length - 1;
        jumpToLetterIndex(index);
        const letter = TEACHING_ORDER[index];
        setLastAvgLatencyMs(saved.find((r) => r.letter === letter)?.last_avg_latency_ms ?? 6000);
      })
      .catch(() => {
        if (live) setSessions([]);
      });
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [childId]);

  // Mitthu says hello once the screen is up (a device may need a first tap
  // before it will speak; the bubble repeats it on a tap).
  const greeting = LINES.greet(activeChild?.display_name ?? "");
  useEffect(() => {
    if (activeChild) say(greeting.hi);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeChild?.id]);

  if (!activeChild) return null;
  const loaded = sessions !== null;
  const met = loaded && missionDone(sessions, now);
  const sticker = loaded ? todaysSticker(sessions, now) : null;

  function openChest() {
    if (!met || opened || !childId) return;
    sfx.pop();
    buzz(40);
    setOpened(true);
    markChestOpened(childId, new Date());
    if (sticker?.word) say(LINES.sticker(sticker.word).hi);
  }

  return (
    <div className="h-[100dvh] bg-[var(--c-page)] flex flex-col overflow-hidden relative">
      {/* The way out for a grown-up, quiet enough not to be a child's target. */}
      <button
        onClick={() => navigate("/unlock?next=/home")}
        className="absolute top-3 right-3 z-10 t--1 font-semibold rounded-full border-2 border-gray-300 bg-white px-3 text-gray-500"
        style={{ minHeight: "var(--tap-min)" }}
      >
        Grown-ups
      </button>

      <div
        className="flex-1 min-h-0 w-full max-w-xl mx-auto flex flex-col"
        style={{ gap: "var(--gap-screen)", padding: "var(--pad-screen)", paddingTop: "calc(var(--tap-min) + 0.75rem)" }}
      >
        <div className="shrink-0 flex items-center gap-2">
          <div className="shrink-0">
            <Mitthu pose="wave" size={96} title="Mitthu" />
          </div>
          <Bubble text={greeting.hi} caption={greeting.en} />
        </div>

        <section className="shrink-0 bg-white border-2 border-[var(--c-line)] rounded-2xl p-3 shadow-[0_4px_0_var(--c-line)]">
          <div className="letter-glyph t-0 font-extrabold mb-2">{LINES.mission.hi}</div>
          <div className="flex items-center gap-3">
            <span className="t-1" aria-hidden>🎯</span>
            <div className="flex-1 min-w-0">
              <div className="letter-glyph t--1 font-semibold mb-1">{LINES.missionTask.hi}</div>
              <div className="h-4 rounded-full bg-[var(--c-ghost)] overflow-hidden" role="img" aria-label={met ? "Mission done" : "Mission not done yet"}>
                <motion.div
                  initial={{ width: "4%" }}
                  animate={{ width: met ? "100%" : "4%" }}
                  transition={{ duration: 0.8, delay: 0.2 }}
                  className="h-full rounded-full bg-[var(--c-reward)]"
                />
              </div>
            </div>
            <motion.button
              aria-label={met ? (opened ? "Chest, opened" : "Chest — tap to open") : "Chest, opens when today's lesson is done"}
              disabled={!met}
              animate={met && !opened ? { rotate: [0, -6, 6, -6, 0] } : {}}
              transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 1.2 }}
              onClick={openChest}
              className="relative shrink-0 bg-transparent border-0 p-0"
              style={{ cursor: met && !opened ? "pointer" : "default", minWidth: "var(--tap-min)", minHeight: "var(--tap-min)" }}
            >
              <Chest size={52} open={opened} />
              {opened && sticker && (
                <motion.span
                  initial={{ y: 0, scale: 0 }}
                  animate={{ y: -40, scale: 1.4 }}
                  className="absolute left-3 top-0 t-1"
                  aria-hidden
                >
                  {sticker.emoji}
                </motion.span>
              )}
            </motion.button>
          </div>
          {/* Hidden, not removed, once opened: its line keeps its space. */}
          {met && (
            <div className="letter-glyph t--1 font-bold text-[var(--c-go)] text-right mt-1" style={{ visibility: opened ? "hidden" : "visible" }}>
              {LINES.missionOpen.hi}
            </div>
          )}
        </section>

        <section className="shrink-0 bg-white border-2 border-[var(--c-line)] rounded-2xl p-3 shadow-[0_4px_0_var(--c-line)]">
          <div className="letter-glyph t-0 font-extrabold mb-2">{LINES.week.hi}</div>
          {loaded && <WeekStrip days={weekStrip(sessions, now)} />}
        </section>

        <section className="shrink-0 flex items-center gap-3 bg-white border-2 border-[var(--c-line)] rounded-2xl p-3 shadow-[0_4px_0_var(--c-line)] overflow-hidden">
          <div className="shrink-0">
            <Tree leaves={loaded ? treeLeaves(sessions) : 0} size={104} fresh={met} />
          </div>
          <div className="letter-glyph t--1 font-semibold">{LINES.tree.hi}</div>
        </section>

        <div className="flex-1 min-h-0" />

        <div className="shrink-0 flex flex-col items-center gap-2">
          <AksharaButton fullWidth onClick={() => navigate("/roadmap")} disabled={!loaded}>
            <span className="letter-glyph">{LINES.play.hi}</span>
          </AksharaButton>
          <button onClick={() => navigate("/my-progress")} className="t--1 font-semibold text-[var(--c-info)] underline underline-offset-4" style={{ minHeight: "var(--tap-min)" }}>
            📒 My letters
          </button>
        </div>
      </div>
    </div>
  );
}

function WeekStrip({ days }: { days: WeekDay[] }) {
  return (
    <div className="grid grid-cols-7 gap-1.5">
      {days.map((d) => (
        <div key={d.label} className="grid justify-items-center gap-1">
          <div
            className="w-full grid place-items-center rounded-full"
            style={{
              maxWidth: 44,
              aspectRatio: "1",
              fontSize: "clamp(1rem, 4.5vmin, 1.4rem)",
              background: d.practised ? "var(--c-day)" : "var(--c-card)",
              border: `3px solid ${d.today ? "var(--c-ink)" : d.practised ? "var(--c-day-lip)" : "var(--c-line)"}`,
            }}
            aria-label={`${d.label}${d.practised ? ", played" : ""}${d.today ? ", today" : ""}`}
          >
            {d.practised ? d.sticker : ""}
          </div>
          <span className="letter-glyph" style={{ fontSize: 12, fontWeight: d.today ? 800 : 500, color: d.today ? "var(--c-ink)" : "var(--c-muted)" }}>
            {d.label}
          </span>
        </div>
      ))}
    </div>
  );
}
