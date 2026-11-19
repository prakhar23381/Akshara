import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import { TopBar } from "../../components/TopBar";
import { Mitthu } from "../../components/Mitthu";
import { Chest } from "../../components/art";
import { useLevelConfig } from "../../hooks/useLevelConfig";
import { useSession } from "../../contexts/SessionContext";
import { useAccount } from "../../contexts/AccountContext";
import { prepareReviewConfig, prepareSessionConfig } from "../../api/client";
import { loadLetterStatuses } from "../../lib/learnerProfile";
import { pageLetters, pageOpen, TOTAL_PAGES, type LetterStatus } from "../../lib/letterStatus";
import { checkpointsDone, type UnitPlan } from "../../lib/review";
import { LESSON_KINDS, PRACTICE_LESSONS, TEACHING_ORDER } from "../../data/curriculum";
import { LINES } from "../../data/mitthuLines";
import { sfx } from "../../utils/soundEffects";

/**
 * The path (G4; docs/11 §3.3), at /roadmap: one winding path through the
 * course, unit after unit, in place of pages of tiles.
 *
 * The next lesson is large and pulses, with "शुरू करो" over it and Mitthu
 * beside it. A letter's ring fills a third for each of its three lessons; a
 * mastered letter turns gold with a crown. After a unit's letters come its
 * lessons side by side, its practice when owed, and its unit check — the
 * unit's chest. No percentage anywhere: the ring fills; figures are for the
 * grown-ups' report.
 *
 * **The one child screen that scrolls** (the user's choice, 2026-11-19): seeing
 * how far you have walked is the point of a path. It opens on the next lesson.
 * Units ahead that are not open yet are grey; tapping one wiggles it.
 *
 * Replaced the roadmap grid (in `.legacy/screens/`). Starting a lesson is the
 * same as there.
 */
type NodeKind = "mastered" | "practising" | "current" | "ahead" | "locked";

/** Sideways offsets that make the path wind. */
const SWAY = [0, 44, 66, 44, 0, -44, -66, -44];

export function PathScreen() {
  const navigate = useNavigate();
  const { activeChild } = useAccount();
  const userId = activeChild?.id ?? "offline";
  const { setLevelConfig, jumpToLetterIndex, setLastAvgLatencyMs } = useLevelConfig();
  const { startSession } = useSession();
  const [statuses, setStatuses] = useState<Record<string, LetterStatus>>({});
  const [units, setUnits] = useState<UnitPlan[]>([]);
  const [sessionsCount, setSessionsCount] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState<string | null>(null);
  const here = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!activeChild) {
      setLoading(false);
      return;
    }
    loadLetterStatuses(userId)
      .then(({ statuses, saved, units }) => {
        setStatuses(statuses);
        setUnits(units);
        setSessionsCount(Object.fromEntries(saved.map((r) => [r.letter, r.sessions_count ?? 0])));
      })
      .catch((e) => console.error("[Path] Error:", e))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // Open on the next lesson.
  useEffect(() => {
    if (!loading) here.current?.scrollIntoView({ block: "center" });
  }, [loading]);

  const done = checkpointsDone(units);
  const open = (u: number) => pageOpen(u, statuses, done);
  // The next lesson: the first letter, in teaching order, not complete in an
  // open unit. (Once a unit's letters are all complete, its unit check is the
  // next thing, and its chest is on the path.)
  const currentLetter = TEACHING_ORDER.find((l) => {
    const u = units.findIndex((p) => p.letters.includes(l));
    return u >= 0 && open(u) && !statuses[l]?.complete;
  });

  async function startLetter(letter: string) {
    if (starting) return;
    setStarting(letter);
    try {
      jumpToLetterIndex(TEACHING_ORDER.indexOf(letter));
      const levelConfig = await prepareSessionConfig(userId, letter);
      setLevelConfig(levelConfig);
      setLastAvgLatencyMs(levelConfig.hesitation_trigger_stage1_ms - 8000 || 6000);
      startSession({ userId, letter, sessionNumber: (sessionsCount[letter] ?? 0) + 1, levelConfig });
      navigate("/play");
    } catch (err) {
      console.error("[Path] Failed to start a lesson:", err);
      setStarting(null);
    }
  }

  async function startReview(item: ReviewItem) {
    if (starting) return;
    setStarting(item.key);
    try {
      const levelConfig = await prepareReviewConfig(userId, item.kind, item.focus, item.unit);
      setLevelConfig(levelConfig);
      startSession({ userId, letter: item.focus[0], sessionNumber: 1, levelConfig });
      navigate("/play");
    } catch (err) {
      console.error("[Path] Failed to start a review lesson:", err);
      setStarting(null);
    }
  }

  if (loading) {
    return (
      <div className="h-[100dvh] bg-[var(--c-page)] grid place-items-center">
        <Mitthu pose="listen" size={110} title="Mitthu" />
      </div>
    );
  }

  let sway = 0;
  const nextSway = () => SWAY[sway++ % SWAY.length];

  return (
    <div className="h-[100dvh] bg-[var(--c-page)] flex flex-col overflow-hidden">
      <TopBar
        avatarEmoji={activeChild?.avatar ?? "🐻"}
        progress={null}
        onExit={() => navigate("/resume")}
        action={
          <button
            onClick={() => navigate("/unlock?next=/home")}
            className="t--1 shrink-0 bg-white border-2 border-gray-300 rounded-full font-bold text-gray-600 px-3"
            style={{ minHeight: "var(--tap-min)" }}
          >
            ⚙️ Grown-ups
          </button>
        }
      />

      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="max-w-xl mx-auto flex flex-col items-center gap-6" style={{ padding: "var(--pad-screen)", paddingBottom: "4rem" }}>
          {Array.from({ length: TOTAL_PAGES }, (_, u) => {
            const plan = units[u];
            const isOpen = open(u);
            const items = itemsOf(plan);
            return (
              <section key={u} className="w-full flex flex-col items-center gap-5" aria-label={`Unit ${u + 1}`}>
                <header
                  className="self-stretch rounded-2xl px-4 py-2 text-white"
                  style={{
                    background: !isOpen ? "#9E9B92" : u % 2 ? "var(--c-info)" : "var(--c-go)",
                    boxShadow: `0 5px 0 ${!isOpen ? "#7D7A72" : u % 2 ? "var(--c-info-lip)" : "var(--c-go-lip)"}`,
                  }}
                >
                  <div className="letter-glyph" style={{ fontSize: 13, fontWeight: 700, opacity: 0.9 }}>इकाई {u + 1}</div>
                  <div className="letter-glyph" style={{ fontSize: "clamp(1.1rem, 5vmin, 1.4rem)", fontWeight: 700 }}>
                    {pageLetters(u).join(" ")}
                  </div>
                </header>

                {pageLetters(u).map((l) => {
                  const st = statuses[l];
                  const kind: NodeKind = !isOpen
                    ? "locked"
                    : l === currentLetter
                      ? "current"
                      : st?.mastered
                        ? "mastered"
                        : st && (st.lessons.meet || st.sessions > 0)
                          ? "practising"
                          : "ahead";
                  const done = st ? LESSON_KINDS.filter((k) => st.lessons[k]).length : 0;
                  const x = nextSway();
                  return (
                    <div
                      key={l}
                      ref={kind === "current" ? here : undefined}
                      className="relative"
                      style={{ transform: `translateX(${x}px)`, marginTop: kind === "current" ? 56 : 0 }}
                    >
                      <LetterNode
                        letter={l}
                        kind={kind}
                        fill={done / 3}
                        busy={starting === l}
                        onStart={() => startLetter(l)}
                      />
                      {kind === "current" && (
                        <div
                          className="absolute pointer-events-none"
                          style={{ top: 0, [x > 0 ? "right" : "left"]: 100, transform: x > 0 ? undefined : "scaleX(-1)" }}
                        >
                          <Mitthu pose="wave" size={70} />
                        </div>
                      )}
                    </div>
                  );
                })}

                {items.map((item) => (
                  <div key={item.key} style={{ transform: `translateX(${nextSway()}px)` }}>
                    <ReviewNode
                      item={item}
                      live={isOpen && item.open}
                      busy={starting === item.key}
                      onStart={() => startReview(item)}
                    />
                  </div>
                ))}
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** The ring that fills a third per finished lesson. */
function Ring({ fill, size }: { fill: number; size: number }) {
  const r = size / 2 - 5;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} className="absolute inset-0" style={{ transform: "rotate(-90deg)" }} aria-hidden>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--c-ghost)" strokeWidth={7} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="var(--c-info)"
        strokeWidth={7}
        strokeLinecap="round"
        strokeDasharray={`${c * fill} ${c}`}
      />
    </svg>
  );
}

function LetterNode({
  letter,
  kind,
  fill,
  busy,
  onStart,
}: {
  letter: string;
  kind: NodeKind;
  fill: number;
  busy: boolean;
  onStart: () => void;
}) {
  const [nudge, setNudge] = useState(0);
  const current = kind === "current";
  const size = current ? 88 : 68;
  const look: CSSProperties =
    kind === "mastered"
      ? { background: "var(--c-reward)", color: "var(--c-reward-ink)", boxShadow: "0 6px 0 var(--c-reward-lip)" }
      : current
        ? { background: "var(--c-go)", color: "#fff", boxShadow: "0 7px 0 var(--c-go-lip)" }
        : kind === "locked"
          ? { background: "var(--c-ghost)", color: "#ABA79B", boxShadow: "0 6px 0 var(--c-line)" }
          : { background: "var(--c-card)", color: "var(--c-ink)", boxShadow: "0 6px 0 var(--c-line-lip)" };
  const label = {
    mastered: "mastered",
    current: "next lesson",
    practising: `${Math.round(fill * 3)} of 3 lessons done`,
    ahead: "not started",
    locked: "not open yet",
  }[kind];
  return (
    <div className="relative" style={{ width: size, height: size }}>
      {current && (
        <>
          <motion.div
            aria-hidden
            animate={{ scale: [1, 1.25], opacity: [0.5, 0] }}
            transition={{ duration: 1.6, repeat: Infinity }}
            className="absolute rounded-full"
            style={{ inset: -6, border: "4px solid var(--c-go)" }}
          />
          <motion.div
            aria-hidden
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 1.4, repeat: Infinity }}
            className="letter-glyph absolute whitespace-nowrap rounded-xl bg-white px-3 py-1"
            style={{
              bottom: size + 14,
              left: "50%",
              translateX: "-50%",
              border: "3px solid var(--c-line)",
              color: "var(--c-go)",
              fontSize: 17,
              fontWeight: 800,
            }}
          >
            {LINES.start.hi}
          </motion.div>
        </>
      )}
      <motion.button
        key={nudge}
        animate={kind === "locked" && nudge ? { rotate: [0, -8, 8, -4, 0] } : {}}
        onClick={() => {
          sfx.tap();
          if (kind === "locked") setNudge((n) => n + 1);
          else onStart();
        }}
        aria-label={`${letter}, ${label}`}
        className="letter-glyph relative grid place-items-center rounded-full border-0"
        style={{ width: size, height: size, fontSize: current ? 44 : 34, fontWeight: 700, cursor: "pointer", ...look }}
      >
        {(kind === "practising" || (current && fill > 0)) && <Ring fill={fill} size={size} />}
        <span className="relative">{busy ? "⏳" : letter}</span>
        {kind === "mastered" && (
          <span aria-hidden className="absolute" style={{ top: -14, fontSize: 20 }}>
            👑
          </span>
        )}
      </motion.button>
    </div>
  );
}

function ReviewNode({ item, live, busy, onStart }: { item: ReviewItem; live: boolean; busy: boolean; onStart: () => void }) {
  const [nudge, setNudge] = useState(0);
  const checkpoint = item.kind === "checkpoint";
  const size = checkpoint ? 76 : 58;
  return (
    <div className="flex flex-col items-center gap-1">
      <motion.button
        key={nudge}
        animate={!live && nudge ? { rotate: [0, -8, 8, -4, 0] } : {}}
        onClick={() => {
          sfx.tap();
          if (!live) setNudge((n) => n + 1);
          else onStart();
        }}
        aria-label={`${item.label}${item.kind === "contrast" ? ` ${item.glyph}` : ""}${item.done ? ", done" : live ? "" : ", not open yet"}`}
        className="letter-glyph relative grid place-items-center rounded-full"
        style={{
          width: size,
          height: size,
          cursor: "pointer",
          fontSize: item.kind === "contrast" ? 20 : 26,
          fontWeight: 700,
          background: checkpoint ? "transparent" : !live ? "var(--c-ghost)" : item.done ? "var(--c-correct-tint)" : "var(--c-info-tint)",
          color: !live ? "#ABA79B" : "var(--c-ink)",
          border: checkpoint ? "0" : `3px solid ${!live ? "var(--c-line)" : item.done ? "var(--c-correct)" : "var(--c-info)"}`,
          boxShadow: checkpoint ? "none" : `0 5px 0 ${!live ? "var(--c-line)" : item.done ? "var(--c-correct-lip)" : "var(--c-info-lip)"}`,
          opacity: checkpoint && !live ? 0.55 : 1,
        }}
      >
        {busy ? "⏳" : checkpoint ? <Chest size={size} open={item.done} /> : item.glyph}
        {item.done && !checkpoint && (
          <span aria-hidden className="absolute" style={{ top: -10, right: -6, fontSize: 16 }}>
            ✓
          </span>
        )}
      </motion.button>
      <span className="t--1 font-semibold text-gray-500">{item.label}</span>
    </div>
  );
}

/** A lesson on several letters (G2), as a node on the path. */
interface ReviewItem {
  key: string;
  kind: "contrast" | "practice" | "checkpoint";
  glyph: string;
  label: string;
  open: boolean;
  done: boolean;
  focus: string[];
  unit?: number;
}

/**
 * A unit's nodes after its letters, in the order a child meets them: lessons
 * side by side, practice when owed, then the unit check — the unit's chest.
 * Practice shows no count: its two lessons are two visits, not a score.
 */
function itemsOf(plan: UnitPlan | undefined): ReviewItem[] {
  if (!plan) return [];
  const items: ReviewItem[] = plan.contrasts.map((c) => ({
    key: `contrast:${c.pair.join("")}`,
    kind: "contrast",
    glyph: c.pair.join(" "),
    label: "Side by side",
    open: c.open,
    done: c.done,
    focus: [...c.pair],
  }));
  if (plan.practice.shown) {
    items.push({
      key: `practice:${plan.unit}`,
      kind: "practice",
      glyph: "🔁",
      label: "Practice",
      open: plan.complete,
      done: plan.practice.done >= PRACTICE_LESSONS && !plan.practice.needed,
      focus: plan.practice.weak.length > 0 ? plan.practice.weak : plan.letters,
      unit: plan.unit,
    });
  }
  items.push({
    key: `checkpoint:${plan.unit}`,
    kind: "checkpoint",
    glyph: "🏁",
    label: "Unit check",
    open: plan.checkpoint.open,
    done: plan.checkpoint.done,
    focus: plan.letters,
    unit: plan.unit,
  });
  return items;
}
