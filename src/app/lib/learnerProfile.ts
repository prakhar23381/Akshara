import type { CognitiveState } from "../types/levelConfig";
import { sessionAttempts, type LearningSession } from "../types/session";
import { loadAllSessions, rowToSession } from "./sessionStore";
import { diagnose, overallErrorRate, ownAttempts } from "./adaptiveEngine";
import { supabase, isSupabaseConfigured } from "./supabase";
import {
  checksDue,
  isLetter,
  letterStatuses,
  type DueCheck,
  type LetterStatus,
  type SavedProgress,
} from "./letterStatus";

/**
 * What the app knows about one child, built from their recorded sessions.
 *
 * Before this existed, nothing that shapes a session read the child's history.
 * Every session was configured by calling the engine with zero attempts, so the
 * only thing that carried over between sessions was "the most recent state on
 * any letter". The child's own confusions were recorded, aggregated and shown
 * in the report — and then ignored when choosing what to show them next. The
 * database was written to and never read back.
 *
 * The profile closes that loop. It is the single input to `planSession`, so a
 * session is now configured from what this child actually did.
 */
export interface LearnerProfile {
  /** How many sessions the profile was built from. */
  sessionCount: number;
  /** Where the history came from, so the reasoning shown to adults is traceable. */
  source: "database+device" | "device";
  /**
   * Each letter's state, judged from the child's answers by today's rules (see
   * `letterStatus.ts`) — not the label saved when the session ended.
   */
  stateByLetter: Record<string, CognitiveState>;
  /** Share of the letter's latest finished session's questions missed — wrong or supplied. */
  errorRateByLetter: Record<string, number>;
  /** State of the most recent finished session on any letter, judged the same way. */
  latestState: CognitiveState | null;
  /** Mastered letters this child keeps picking by mistake, due a check question (E3). */
  checks: DueCheck[];
  /**
   * Recency-weighted confusion strength: `confusions[target][chosen]`.
   * Higher means the child has picked `chosen` in place of `target` more often
   * and more recently.
   */
  confusions: Record<string, Record<string, number>>;
  /** Median unguided response time over recent sessions, or null if unknown. */
  latencyMedianMs: number | null;
}

export const EMPTY_PROFILE: LearnerProfile = {
  sessionCount: 0,
  source: "device",
  stateByLetter: {},
  errorRateByLetter: {},
  latestState: null,
  checks: [],
  confusions: {},
  latencyMedianMs: null,
};

/** Confusions are taken from this many of the most recent sessions. */
const HISTORY_LIMIT = 30;
/**
 * Sessions read from the database. States need every session, not the recent
 * ones: a letter last played long ago still has a status.
 */
const FULL_HISTORY_LIMIT = 1000;
/**
 * Each older session counts 0.8× the one after it, so a confusion the child
 * has since grown out of fades instead of steering distractors forever.
 */
const RECENCY_DECAY = 0.8;
/**
 * A mistake is evidence about both letters: picking म for भ also says भ is a
 * plausible distractor when म is the target. The reverse direction is weaker
 * evidence, so it counts half.
 */
const REVERSE_WEIGHT = 0.5;
/** Response times are taken from this many recent sessions. */
const LATENCY_SESSIONS = 5;
/** How long the database gets before the device's own history is used alone. */
export const REMOTE_TIMEOUT_MS = 2500;

/**
 * Whether this child has a database history to read. Guests do not: they have
 * no auth session, and their id is not a UUID, so row-level security rejects
 * every read and write.
 */
export function readsDatabase(userId: string): boolean {
  const offline = localStorage.getItem("akshara_offline_mode") === "true";
  return !offline && isSupabaseConfigured && userId !== "offline";
}

/** Resolve to the promise's value, or to null if it is slower than `ms` or throws. */
export async function withTimeout<T>(p: PromiseLike<T>, ms = REMOTE_TIMEOUT_MS): Promise<T | null> {
  const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), ms));
  try {
    return await Promise.race([Promise.resolve(p), timeout]);
  } catch {
    return null;
  }
}

/**
 * Postgres returns `2026-10-10T07:46:49.12+00:00`; this device stores
 * `2026-10-10T07:46:49.120Z`. Both are the same instant, but code here sorts
 * timestamps as strings, so a merged history must use one format.
 */
export function normaliseRow<T extends Record<string, unknown>>(row: T): T {
  const out: Record<string, unknown> = { ...row };
  for (const k of ["created_at", "started_at", "ended_at", "updated_at"]) {
    const v = out[k];
    if (typeof v === "string") {
      const t = Date.parse(v);
      if (!Number.isNaN(t)) out[k] = new Date(t).toISOString();
    }
  }
  return out as T;
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

/**
 * Pure: sessions in, profile out. Sessions may be in any order. `saved` is the
 * child's `letter_progress` rows, which only letters with no saved answers rely
 * on (see `letterStatus.ts`).
 */
export function buildLearnerProfile(
  sessions: LearningSession[],
  source: LearnerProfile["source"] = "device",
  saved: SavedProgress[] = [],
): LearnerProfile {
  const newestFirst = [...sessions].sort((a, b) => (a.started_at < b.started_at ? 1 : -1));
  const recent = newestFirst.slice(0, HISTORY_LIMIT);

  // Every letter's state, judged again from its answers. Trusting the label
  // saved at the time kept a letter "mastered" under a rule since corrected
  // (E2), and could not see a mastery the child's later mix-ups put in doubt (E3).
  const statuses = letterStatuses(sessions, saved);
  const stateByLetter: Record<string, CognitiveState> = {};
  Object.entries(statuses).forEach(([letter, st]) => {
    if (st.judged && st.state !== "insufficient_data") stateByLetter[letter] = st.state;
  });

  const errorRateByLetter: Record<string, number> = {};
  const confusions: Record<string, Record<string, number>> = {};
  let latestState: CognitiveState | null = null;
  const latencies: number[] = [];

  const bump = (target: string, chosen: string, w: number) => {
    (confusions[target] ??= {})[chosen] = (confusions[target][chosen] ?? 0) + w;
  };

  // Only sessions that finished: an abandoned session was never diagnosed.
  newestFirst.forEach((s) => {
    if (s.status !== "completed") return;
    const attempts = sessionAttempts(s);
    const { state } = diagnose(attempts, s.letter);
    if (state === "insufficient_data") return;
    latestState ??= state;
    // A supplied answer is a miss, as in the diagnosis. Leaving supplied
    // answers out made a child rescued on most questions look accurate.
    if (!(s.letter in errorRateByLetter)) {
      errorRateByLetter[s.letter] = overallErrorRate(ownAttempts(attempts, s.letter));
    }
  });

  recent.forEach((s, rank) => {
    const unguided = sessionAttempts(s).filter((a) => !a.was_guided_win);

    // Mistakes count from abandoned sessions too: a wrong answer is a wrong
    // answer whether or not the child finished the letter.
    const w = RECENCY_DECAY ** rank;
    unguided.forEach((a) => {
      if (a.target_letter === a.selected_letter) return;
      if (!isLetter(a.target_letter) || !isLetter(a.selected_letter)) return;
      bump(a.target_letter, a.selected_letter, w);
      bump(a.selected_letter, a.target_letter, w * REVERSE_WEIGHT);
    });

    if (rank < LATENCY_SESSIONS) {
      unguided.forEach((a) => {
        if (a.time_to_interact_ms > 0) latencies.push(a.time_to_interact_ms);
      });
    }
  });

  return {
    sessionCount: sessions.length,
    source,
    stateByLetter,
    errorRateByLetter,
    latestState,
    checks: checksDue(statuses),
    confusions,
    latencyMedianMs: median(latencies),
  };
}

/** Letters this child confuses with `target`, strongest first. */
export function confusedWith(profile: LearnerProfile, target: string): string[] {
  return Object.entries(profile.confusions[target] ?? {})
    .filter(([l]) => l !== target)
    .sort((a, b) => b[1] - a[1])
    .map(([l]) => l);
}

async function fetchRemoteSessions(userId: string): Promise<LearningSession[] | null> {
  const query = Promise.resolve(
    supabase
      .from("learning_sessions")
      .select(
        "session_id, user_id, letter, session_number, status, started_at, ended_at, " +
          "activities, metrics, level_config, cognitive_state, schema_version, created_at",
      )
      .eq("user_id", userId)
      .eq("schema_version", 2)
      .order("started_at", { ascending: false })
      .limit(FULL_HISTORY_LIMIT),
  ).then(({ data, error }) => {
    if (error) {
      console.warn("[LearnerProfile] remote history unavailable:", error.message);
      return null;
    }
    return ((data ?? []) as unknown as Record<string, unknown>[])
      .map((r) => rowToSession(normaliseRow(r)))
      .filter((s): s is LearningSession => s !== null);
  });
  return withTimeout(query);
}

/**
 * The child's sessions, from every place they are kept.
 *
 * - **This device**, filtered to this child. Local storage holds every session
 *   played on the device by anyone; reading it unfiltered is how one child's
 *   mistakes would steer another child's games.
 * - **The database**, for a signed-in child, so their history follows them to a
 *   new phone or a cleared browser. Guests have no database identity — their
 *   mirror writes are rejected by row-level security — so for them the device
 *   is the whole history.
 *
 * Merged by session id, preferring the device copy, which is the more current
 * one for a session still being written. A slow or failed database read falls
 * back to the device alone after 2.5s rather than holding the child on the
 * roadmap.
 */
export async function loadHistory(
  userId: string,
): Promise<{ sessions: LearningSession[]; source: LearnerProfile["source"] }> {
  const local = loadAllSessions().filter((s) => s.user_id === userId);
  if (!readsDatabase(userId)) return { sessions: local, source: "device" };

  const remote = await fetchRemoteSessions(userId);
  if (remote === null) return { sessions: local, source: "device" };

  const merged = new Map<string, LearningSession>();
  remote.forEach((s) => merged.set(s.session_id, s));
  local.forEach((s) => merged.set(s.session_id, s));
  return { sessions: [...merged.values()], source: "database+device" };
}

/** A saved `letter_progress` row, with the fields the resume screen also reads. */
export interface SavedProgressRow extends SavedProgress {
  letter_index?: number | null;
  last_avg_latency_ms?: number | null;
}

const LOCAL_PROGRESS_KEY = "akshara_db_letter_progress";

/**
 * The child's saved `letter_progress` rows: from the database for a signed-in
 * child, otherwise from this device, where the offline store keeps a guest's.
 * Never throws; a failed or slow read is an empty list.
 */
export async function loadSavedProgress(userId: string): Promise<SavedProgressRow[]> {
  if (!readsDatabase(userId)) {
    try {
      const rows = JSON.parse(localStorage.getItem(LOCAL_PROGRESS_KEY) ?? "[]") as (SavedProgressRow & {
        user_id?: string;
      })[];
      return rows.filter((r) => r?.user_id === userId);
    } catch {
      return [];
    }
  }
  const res = await withTimeout(
    supabase
      .from("letter_progress")
      .select("letter, letter_index, mastered, last_cognitive_state, sessions_count, last_avg_latency_ms")
      .eq("user_id", userId),
  );
  if (!res || res.error || !res.data) return [];
  return res.data as unknown as SavedProgressRow[];
}

/** The profile a session is planned from. */
export async function loadLearnerProfile(userId: string): Promise<LearnerProfile> {
  const [{ sessions, source }, saved] = await Promise.all([
    loadHistory(userId),
    loadSavedProgress(userId),
  ]);
  return buildLearnerProfile(sessions, source, saved);
}

/**
 * Every letter's status for one child — what the roadmap, the resume screen,
 * the adult home and the report show. `saved` comes back too, for the fields
 * statuses do not carry (session numbering, the last response time).
 */
export async function loadLetterStatuses(userId: string): Promise<{
  statuses: Record<string, LetterStatus>;
  saved: SavedProgressRow[];
  source: LearnerProfile["source"];
}> {
  const [{ sessions, source }, saved] = await Promise.all([
    loadHistory(userId),
    loadSavedProgress(userId),
  ]);
  return { statuses: letterStatuses(sessions, saved), saved, source };
}
