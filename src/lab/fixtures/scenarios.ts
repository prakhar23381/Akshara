import type { ReportSources } from "../../app/api/reportSources";
import { LETTER_SEQUENCE, type LevelConfig } from "../../app/types/levelConfig";
import type { LearningSession } from "../../app/types/session";
import { createPlayer, progressOf, rng, rowsOf, SUPPLIED, type SessionScript } from "./play";

/**
 * The children the report lab renders.
 *
 * All dates hang off one fixed "today", so a week or month window always has
 * data in it and every screenshot repeats exactly. The report is handed this
 * date as its today.
 */
export const LAB_TODAY = "2026-10-11T12:00:00Z";

export interface LabChild {
  id: string;
  display_name: string;
  age: number;
  avatar: string;
  sources: ReportSources;
}

export type Scenario =
  | { kind: "parent"; id: string; label: string; child: LabChild }
  | { kind: "class"; id: string; label: string; className: string; children: LabChild[] };

/** What the toolbar lists. Cheap: nothing is played until a scenario is built. */
export const SCENARIOS: { id: string; label: string; kind: Scenario["kind"] }[] = [
  { id: "new", label: "Brand new — no sessions", kind: "parent" },
  { id: "first", label: "One session", kind: "parent" },
  { id: "week", label: "One week, four letters (Aarav)", kind: "parent" },
  { id: "month", label: "A month, many letters", kind: "parent" },
  { id: "struggling", label: "Struggling child", kind: "parent" },
  { id: "class", label: "Class of 25", kind: "class" },
];

// ── Aarav's week ─────────────────────────────────────────────────────────────
// Also what scripts/visual/seed.ts plays for the app screenshots.
const K = "क", KH = "ख", G = "ग", GH = "घ";
export const AARAV_WEEK: SessionScript[] = [
  { letter: K, when: "2026-10-03T10:00:00Z", identify: [K, "ख", K, "ख", K], words: [K, "ख", K, "फ", K, K] },
  { letter: K, when: "2026-10-05T10:00:00Z", identify: [K, K, "ख", K, K], words: [K, K, K, "ख", K, K] },
  { letter: KH, when: "2026-10-06T10:00:00Z", identify: [KH, K, KH, K, KH], words: [KH, "थ", KH, KH, K, KH] },
  { letter: K, when: "2026-10-07T10:00:00Z", identify: [K, K, K, K, K], words: [K, K, K, K, K, K] },
  { letter: KH, when: "2026-10-08T10:00:00Z", identify: [KH, KH, K, KH, KH], words: [KH, KH, KH, K, KH, KH] },
  { letter: G, when: "2026-10-09T10:00:00Z", identify: [G, "घ", "घ", "ध"], words: [], status: "abandoned" },
  { letter: GH, when: "2026-10-10T09:00:00Z", identify: [GH, GH, "ग", GH, GH], words: [GH, GH, "ध", GH, GH, GH] },
];

// ── Simulated children ───────────────────────────────────────────────────────

interface Learner {
  /** Chance of an unaided right answer on a letter met for the first time. */
  start: number;
  /** How much that chance rises with each session on the same letter. */
  gain: number;
  /** Of the answers not known, the share where the child stalls and the app supplies it. */
  rescue: number;
  /** Chance a session is stopped early. */
  quit: number;
  /** Typical response time, ms. */
  ms: number;
  /** Chance of practising on any given day. */
  practice: number;
  /** Sessions on one letter before moving on without mastering it. */
  patience: number;
  /** First and last day of practice, counted back from today (0 = today). */
  fromDay: number;
  toDay?: number;
}

const DAY = 86_400_000;
const at = (daysAgo: number, hourUtc: number, minute = 0) => {
  const d = new Date(Date.parse(LAB_TODAY) - daysAgo * DAY);
  d.setUTCHours(hourUtc, minute, 0, 0);
  return d.toISOString();
};

/**
 * Plays a learner forward day by day: new letters in order, moving on after
 * mastery or after `patience` sessions, and now and then going back to an
 * earlier letter not yet mastered. Wrong answers come from the distractors the
 * planner actually put on screen, mostly the first — which is where the
 * child's own confusions go — so confusions persist the way real ones do.
 */
function simulate(uid: string, idPrefix: string, l: Learner, seed: number): LearningSession[] {
  const r = rng(seed);
  const { history, play } = createPlayer(uid, { idPrefix, metrics: true });
  const played = new Map<string, number>();
  const mastered = new Set<string>();
  let next = 0;

  const answers = (letter: string, p: number, n: number) => (cfg: LevelConfig) =>
    Array.from({ length: n }, () => {
      if (r() < p) return letter;
      if (r() < l.rescue) return SUPPLIED;
      const pool = cfg.distractor_pool.filter((d) => d !== letter);
      const x = r();
      return pool[x < 0.6 ? 0 : x < 0.85 ? 1 : 1 + Math.floor(r() * (pool.length - 1))] ?? pool[0];
    });

  for (let d = l.fromDay; d >= (l.toDay ?? 0); d--) {
    if (r() > l.practice) continue;
    const count = r() < 0.25 ? 2 : 1;
    let hour = 3 + Math.floor(r() * 7);
    for (let k = 0; k < count && next < LETTER_SEQUENCE.length; k++) {
      const behind = [...played.keys()].filter((x) => !mastered.has(x) && x !== LETTER_SEQUENCE[next]);
      const letter = behind.length > 0 && r() < 0.12 ? behind[Math.floor(r() * behind.length)] : LETTER_SEQUENCE[next];
      const before = played.get(letter) ?? 0;
      const p = Math.min(0.97, l.start + l.gain * before);
      const s = play({
        letter,
        when: at(d, hour, Math.floor(r() * 50)),
        identify: answers(letter, p, 5),
        words: answers(letter, p - 0.05, 6),
        status: r() < l.quit ? "abandoned" : "completed",
        ms: Math.round(l.ms * (0.8 + r() * 0.4)),
        tracing: 35 + p * 55 + (r() - 0.5) * 20,
      });
      played.set(letter, before + 1);
      if (s.status === "completed" && s.cognitive_state === "visual_mastery") mastered.add(letter);
      if (letter === LETTER_SEQUENCE[next] && (mastered.has(letter) || before + 1 >= l.patience)) next++;
      hour += 1 + Math.floor(r() * 2);
    }
  }
  return history;
}

const AVERAGE: Learner = { start: 0.6, gain: 0.07, rescue: 0.3, quit: 0.08, ms: 4600, practice: 0.78, patience: 2, fromDay: 30 };
const STRONG: Learner = { start: 0.8, gain: 0.1, rescue: 0.2, quit: 0.03, ms: 3400, practice: 0.8, patience: 3, fromDay: 30 };
const STRUGGLING: Learner = { start: 0.4, gain: 0.06, rescue: 0.6, quit: 0.28, ms: 7600, practice: 0.5, patience: 5, fromDay: 30 };

// ── Building ─────────────────────────────────────────────────────────────────

const uuid = (prefix: string) => `${prefix}-0000-4000-8000-000000000000`;

function child(
  id: string,
  display_name: string,
  age: number,
  avatar: string,
  history: LearningSession[],
): LabChild {
  return {
    id,
    display_name,
    age,
    avatar,
    sources: {
      rows: rowsOf(history),
      progress: progressOf(id, history),
      displayName: display_name,
      source: "database+device",
    },
  };
}

const NAMES = [
  "Aarav", "Ananya", "Arjun", "Diya", "Ishaan", "Kavya", "Rohan", "Saanvi", "Vivaan",
  "Meera", "Kabir", "Riya", "Aditya", "Pari", "Reyansh", "Myra", "Atharv", "Anika",
  "Dhruv", "Ira", "Vihaan", "Tara", "Shaurya", "Navya", "Yash",
];
const AVATARS = ["🐻", "🐼", "🐨", "🦁", "🐯", "🐸", "🐰", "🦊"];

/**
 * A class of 25: mostly average, a few strong, a few struggling, two who
 * stopped practising a fortnight ago, one who has played once and one who
 * has not played at all.
 */
function buildClass(): LabChild[] {
  const r = rng(2026);
  return NAMES.map((name, i) => {
    const prefix = `c1a55${i.toString(16).padStart(3, "0")}`;
    const id = uuid(prefix);
    const jitter = (l: Learner): Learner => ({
      ...l,
      start: l.start + (r() - 0.5) * 0.12,
      practice: Math.min(0.95, l.practice + (r() - 0.5) * 0.2),
    });
    const learner: Learner | null =
      i === 24 ? null
      : i === 23 ? { ...AVERAGE, fromDay: 1, practice: 1 }
      : i >= 21 ? { ...jitter(AVERAGE), toDay: 13 + i - 21 }
      : i % 4 === 1 ? jitter(STRUGGLING)
      : i % 3 === 0 ? jitter(STRONG)
      : jitter(AVERAGE);
    const history = learner ? simulate(id, prefix, learner, 100 + i) : [];
    return child(id, name, 6 + (i % 3), AVATARS[i % AVATARS.length], history);
  });
}

export function buildScenario(id: string): Scenario {
  const parent = (label: string, c: LabChild): Scenario => ({ kind: "parent", id, label, child: c });
  const label = SCENARIOS.find((s) => s.id === id)?.label ?? id;
  switch (id) {
    case "new":
      return parent(label, child(uuid("d1a00000"), "Diya", 6, "🐼", []));
    case "first": {
      const kid = uuid("4ab14000");
      const { history, play } = createPlayer(kid, { idPrefix: "4ab14000", metrics: true });
      play({ letter: K, when: at(1, 10), identify: [K, "ख", K, SUPPLIED, K], words: [K, K, "ख", K, K, K], tracing: 58 });
      return parent(label, child(kid, "Kabir", 6, "🐯", history));
    }
    case "week": {
      const kid = uuid("aa4a0000");
      const { history, play } = createPlayer(kid, { idPrefix: "aa4a0000", metrics: true });
      AARAV_WEEK.forEach(play);
      return parent(label, child(kid, "Aarav", 7, "🦁", history));
    }
    case "month": {
      const kid = uuid("15a40000");
      return parent(label, child(kid, "Ishaan", 7, "🦊", simulate(kid, "15a40000", AVERAGE, 7)));
    }
    case "struggling": {
      const kid = uuid("41a00000");
      return parent(label, child(kid, "Riya", 8, "🐰", simulate(kid, "41a00000", STRUGGLING, 11)));
    }
    case "class":
      return { kind: "class", id, label, className: "Class 1 · Sunflower", children: buildClass() };
    default:
      return buildScenario("week");
  }
}
