import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import confetti from "canvas-confetti";
import { ChildScreen } from "../../../components/ChildScreen";
import { AksharaButton } from "../../../components/AksharaButton";
import { Mitthu } from "../../../components/Mitthu";
import { Bubble, say } from "../../../components/Bubble";
import { Chest } from "../../../components/art";
import { useSession } from "../../../contexts/SessionContext";
import { useAccount } from "../../../contexts/AccountContext";
import { useLevelConfig } from "../../../hooks/useLevelConfig";
import { supabase } from "../../../lib/supabase";
import { LETTER_SEQUENCE } from "../../../types/levelConfig";
import { isLetterLesson, type LearningSession } from "../../../types/session";
import { TEACHING_ORDER } from "../../../data/curriculum";
import { LINES, QUALITY } from "../../../data/mitthuLines";
import { loadLetterStatuses } from "../../../lib/learnerProfile";
import {
  chestOpened,
  firstToday,
  letterSticker,
  markChestOpened,
  qualitiesOf,
  todaysSticker,
  weekStrip,
} from "../../../lib/rewards";
import { buzz, sfx } from "../../../utils/soundEffects";

type Beat = "proud" | "collected" | "sticker" | "chest";

/**
 * Closes the session and celebrates — in beats, not one screen (G4; docs/11
 * §3.7). Each beat is one moment and one tap, the whole under about fifteen
 * seconds:
 *
 * 1. **Mitthu is proud**, aloud, with three stars and the quality cards the
 *    lesson earned — each praising something true, never a score or a time.
 * 2. **The letter is collected** — when its last lesson is done. A mastered
 *    letter turns gold with a crown.
 * 3. **Today's sticker** lands on the week strip — on the day's first lesson.
 * 4. **A chest**, when one was earned: the day's first lesson (the mission)
 *    or a unit check, which holds a sticker for each of the unit's letters.
 *
 * What it saves is as before: the session is closed, and a letter lesson
 * writes the letter's progress row; a review lesson writes none.
 */
export function RewardStep() {
  const navigate = useNavigate();
  const { session, endSession } = useSession();
  const { activeChild } = useAccount();
  const { setLevelConfig, jumpToLetterIndex } = useLevelConfig();

  const [mastered, setMastered] = useState(false);
  const [history, setHistory] = useState<LearningSession[] | null>(null);
  const [ready, setReady] = useState(false);
  const [beat, setBeat] = useState(0);
  const [opened, setOpened] = useState(false);
  const closed = useRef(false);

  useEffect(() => {
    if (closed.current || !session) return;
    closed.current = true;

    endSession().then(async ({ letterMastered: lessonAlone, nextConfig }) => {
      // Everything the beats need comes from the child's sessions, this one
      // now closed among them.
      let statusesNow: Awaited<ReturnType<typeof loadLetterStatuses>> | null = null;
      try {
        statusesNow = await loadLetterStatuses(session.user_id);
        setHistory(statusesNow.sessions);
      } catch {
        setHistory([]);
      }

      // A lesson on several letters (G2) is review: it judges no letter and
      // writes no letter's progress row.
      if (!isLetterLesson(session)) {
        if (nextConfig) setLevelConfig(nextConfig);
        setReady(true);
        confetti({ particleCount: 90, spread: 70, origin: { y: 0.7 } });
        return;
      }
      // A lesson is one part of a letter, so whether the letter is mastered is
      // read from its status — the letter's lessons judged together
      // (letterStatus.ts) — not from this lesson's answers alone. A session
      // from before lessons held every game and still judges itself.
      let letterMastered = lessonAlone;
      let stateNow = nextConfig?.cognitive_state ?? session.level_config.cognitive_state;
      if (session.level_config.lesson) {
        const st = statusesNow?.statuses[session.letter];
        letterMastered = st?.mastered ?? false;
        if (st?.judged) stateNow = st.state;
      }
      setMastered(letterMastered);
      if (nextConfig) setLevelConfig(nextConfig);
      setReady(true);
      confetti({ particleCount: 90, spread: 70, origin: { y: 0.7 } });

      // Letter-level progress is what older readers of the database use.
      const index = LETTER_SEQUENCE.indexOf(session.letter as (typeof LETTER_SEQUENCE)[number]);
      try {
        await supabase.from("letter_progress").upsert(
          {
            user_id: session.user_id,
            letter: session.letter,
            letter_index: index,
            mastered: letterMastered,
            sessions_count: session.session_number,
            last_cognitive_state: stateNow,
            last_scaffold_intensity: nextConfig?.scaffold_intensity ?? 0.55,
            last_avg_latency_ms: session.metrics?.latency_median_ms ?? 6000,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,letter" },
        );
      } catch (err) {
        console.warn("[Reward] letter_progress write failed", err);
      }
    });
  }, [session, endSession, setLevelConfig]);

  // What the chest holds, fixed once the history is in: a unit check's, a
  // sticker per letter of the unit; the day's first lesson's, today's sticker —
  // unless Home opened today's chest already. Worked out once, so opening it
  // (which marks it opened) does not take the beat away mid-celebration.
  const chestStickers = useMemo(() => {
    if (!session || !history) return [];
    const isSticker = (x: { emoji: string; word: string } | null): x is { emoji: string; word: string } => x !== null;
    if (session.level_config.lesson === "checkpoint") {
      return (session.level_config.focus ?? []).map(letterSticker).filter(isSticker);
    }
    const now = new Date();
    return firstToday(history, session) && !chestOpened(activeChild?.id ?? session.user_id, now)
      ? [todaysSticker(history, now)].filter(isSticker)
      : [];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [history]);

  // Mitthu is proud, aloud, as the first beat appears.
  const name = activeChild?.display_name ?? "";
  useEffect(() => {
    if (ready) say(LINES.proud(name).hi);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  if (!session) return null;

  // From the session, not the app's "current letter": that is held in memory
  // only, so after a refresh mid-lesson it pointed at the first letter again.
  const letterIndex = Math.max(0, TEACHING_ORDER.indexOf(session.letter));
  const nextLetter = letterIndex < TEACHING_ORDER.length - 1 ? TEACHING_ORDER[letterIndex + 1] : null;
  // The course moves on when the letter's last lesson is finished, however
  // well it went (plan §3, principle 7). A session from before lessons was
  // the whole letter.
  const lesson = session.level_config.lesson;
  const review = !isLetterLesson(session);
  const letterDone = !review && (!lesson || lesson === "words");
  const checkpoint = lesson === "checkpoint";
  const now = new Date();
  const first = history ? firstToday(history, session) : false;
  const childId = activeChild?.id ?? session.user_id;

  const beats: Beat[] = [
    "proud",
    ...(letterDone ? (["collected"] as const) : []),
    ...(first ? (["sticker"] as const) : []),
    ...(chestStickers.length > 0 ? (["chest"] as const) : []),
  ];
  const current = beats[Math.min(beat, beats.length - 1)];
  const last = beat >= beats.length - 1;

  function nextBeat() {
    sfx.tap();
    const to = beats[beat + 1];
    if (to === "collected") {
      sfx.flip();
      say(mastered ? LINES.mastered(session!.letter).hi : LINES.collected(session!.letter).hi);
    } else if (to === "sticker") {
      sfx.thwip();
      say(LINES.todaySticker.hi);
    } else if (to === "chest") {
      say(LINES.chest.hi);
    }
    setBeat((b) => b + 1);
  }

  function openChest() {
    if (opened) return;
    sfx.pop();
    buzz(40);
    setOpened(true);
    if (!checkpoint) markChestOpened(childId, now);
    const word = chestStickers[0]?.word;
    if (word) say(LINES.sticker(word).hi);
  }

  // A chest waits to be opened before the way on appears: it always holds
  // something, and opening it is the point of the beat.
  const footer = !ready || (current === "chest" && !opened) ? null : !last ? (
    <AksharaButton fullWidth onClick={nextBeat}>
      <span className="letter-glyph">{LINES.next.hi}</span>
    </AksharaButton>
  ) : letterDone && nextLetter ? (
    <AksharaButton
      fullWidth
      onClick={() => {
        jumpToLetterIndex(letterIndex + 1);
        navigate("/roadmap", { replace: true });
      }}
    >
      Next letter: {nextLetter} →
    </AksharaButton>
  ) : (
    <AksharaButton fullWidth onClick={() => navigate("/roadmap", { replace: true })}>
      Back to my letters
    </AksharaButton>
  );

  return (
    <ChildScreen footer={footer}>
      {!ready ? (
        <Mitthu pose="listen" size={130} title="Mitthu" />
      ) : current === "proud" ? (
        <ProudBeat name={name} cards={qualitiesOf(session)} />
      ) : current === "collected" ? (
        <CollectedBeat letter={session.letter} mastered={mastered} />
      ) : current === "sticker" ? (
        <StickerBeat history={history ?? []} now={now} />
      ) : (
        <ChestBeat stickers={chestStickers} opened={opened} onOpen={openChest} />
      )}
    </ChildScreen>
  );
}

/** Beat 1: Mitthu proud, three stars, the quality cards. */
function ProudBeat({ name, cards }: { name: string; cards: ReturnType<typeof qualitiesOf> }) {
  const line = LINES.proud(name);
  return (
    <div className="flex flex-col items-center gap-3">
      <Mitthu pose="proud" size={120} title="Mitthu" />
      <Bubble text={line.hi} caption={line.en} tail="bottom" />
      <div className="flex gap-2" aria-label="Three stars">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="t-2"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2 + 0.15 * i, type: "spring" }}
            aria-hidden
          >
            ⭐
          </motion.span>
        ))}
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {cards.map((id, i) => {
          const q = QUALITY[id];
          return (
            <motion.div
              key={id}
              initial={{ y: 16, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.6 + 0.2 * i }}
              className="flex flex-col items-center rounded-2xl bg-white border-2 border-[var(--c-reward)] shadow-[0_4px_0_var(--c-reward-lip)] px-3 py-2"
              style={{ minWidth: "6.5rem" }}
            >
              <span className="t-1" aria-hidden>
                {q.icon}
              </span>
              <span className="letter-glyph t-0 font-extrabold text-[var(--c-reward-ink)]">{q.hi}</span>
              <span className="t--1 text-[var(--c-muted)]">{q.en}</span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

/** Beat 2: the letter flips into the collection; gold with a crown when mastered. */
function CollectedBeat({ letter, mastered }: { letter: string; mastered: boolean }) {
  const line = mastered ? LINES.mastered(letter) : LINES.collected(letter);
  return (
    <div className="flex flex-col items-center gap-4">
      <motion.div
        initial={{ rotateY: 180, scale: 0.6 }}
        animate={{ rotateY: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 120, damping: 14 }}
        className="letter-glyph relative grid place-items-center rounded-3xl font-black"
        style={{
          width: "clamp(8rem, 40vmin, 12rem)",
          height: "clamp(8rem, 40vmin, 12rem)",
          fontSize: "clamp(4rem, 22vmin, 7rem)",
          background: mastered ? "var(--c-reward)" : "var(--c-card)",
          color: mastered ? "var(--c-reward-ink)" : "var(--c-ink)",
          border: `4px solid ${mastered ? "var(--c-reward-lip)" : "var(--c-info)"}`,
          boxShadow: `0 8px 0 ${mastered ? "var(--c-reward-lip)" : "var(--c-info-lip)"}`,
        }}
      >
        {letter}
        {mastered && (
          <span aria-hidden className="absolute" style={{ top: "-1.6rem", fontSize: "2.4rem" }}>
            👑
          </span>
        )}
      </motion.div>
      <Bubble text={line.hi} caption={line.en} tail="bottom" />
      <Mitthu pose={mastered ? "dance" : "hop"} size={90} />
    </div>
  );
}

/** Beat 3: today's sticker lands on the week strip. */
function StickerBeat({ history, now }: { history: LearningSession[]; now: Date }) {
  const days = weekStrip(history, now);
  return (
    <div className="flex flex-col items-center gap-4 w-full">
      <Bubble text={LINES.todaySticker.hi} caption={LINES.todaySticker.en} tail="bottom" />
      <div className="grid grid-cols-7 gap-1.5 w-full max-w-md">
        {days.map((d) => (
          <div key={d.label} className="grid justify-items-center gap-1">
            <motion.div
              initial={d.today ? { scale: 0, rotate: -30 } : false}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 12, delay: 0.3 }}
              className="w-full grid place-items-center rounded-full"
              style={{
                maxWidth: 44,
                aspectRatio: "1",
                fontSize: "clamp(1rem, 4.5vmin, 1.4rem)",
                background: d.practised ? "var(--c-day)" : "var(--c-card)",
                border: `3px solid ${d.today ? "var(--c-ink)" : d.practised ? "var(--c-day-lip)" : "var(--c-line)"}`,
              }}
            >
              {d.practised ? d.sticker : ""}
            </motion.div>
            <span className="letter-glyph" style={{ fontSize: 12, fontWeight: d.today ? 800 : 500 }}>
              {d.label}
            </span>
          </div>
        ))}
      </div>
      <Mitthu pose="hop" size={90} />
    </div>
  );
}

/** Beat 4: a chest to open; it always holds something. */
function ChestBeat({
  stickers,
  opened,
  onOpen,
}: {
  stickers: { emoji: string; word: string }[];
  opened: boolean;
  onOpen: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-4">
      <Bubble text={LINES.chest.hi} caption={LINES.chest.en} tail="bottom" />
      <motion.button
        onClick={onOpen}
        aria-label={opened ? "The chest is open" : "Chest — tap to open"}
        animate={!opened ? { rotate: [0, -6, 6, -6, 0] } : {}}
        transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 1 }}
        className="relative bg-transparent border-0 p-0"
        style={{ cursor: opened ? "default" : "pointer" }}
      >
        <Chest size={150} open={opened} shiny={stickers.length > 1} />
      </motion.button>
      {opened && (
        <div className="flex flex-wrap justify-center gap-3">
          {stickers.map((s, i) => (
            <motion.div
              key={`${s.word}-${i}`}
              initial={{ y: 30, scale: 0 }}
              animate={{ y: 0, scale: 1 }}
              transition={{ delay: 0.1 * i, type: "spring" }}
              className="flex flex-col items-center"
            >
              <span style={{ fontSize: "2.6rem", lineHeight: 1 }} aria-hidden>
                {s.emoji}
              </span>
              {s.word && <span className="letter-glyph t-0 font-bold">{s.word}</span>}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
