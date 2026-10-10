import type { CognitiveState, LevelConfig } from "../types/levelConfig";
import { sessionAttempts, type LearningSession } from "../types/session";
import { loadAllSessions } from "./sessionStore";
import { supabase, isSupabaseConfigured } from "./supabase";

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
  /** Last diagnosed state per letter, from that letter's own latest completed session. */
  stateByLetter: Record<string, CognitiveState>;
  /** Error rate of that same session, unguided attempts only. */
  errorRateByLetter: Record<string, number>;
  /** Most recent diagnosed state on any letter. */
  latestState: CognitiveState | null;
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
  confusions: {},
  latencyMedianMs: null,
};

/** Only this many of the most recent sessions are considered. */
const HISTORY_LIMIT = 30;
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
const REMOTE_TIMEOUT_MS = 2500;

/**
 * A single letter, not a matra, a half-form or a whole word. The word games
 * have recorded matras and whole words as `selected_letter` (see the W3 grapheme
 * fix); counting those as confusions would offer a child a vowel sign as a
 * "letter" distractor.
 */
const isLetter = (s: string) => /^\p{Lo}$/u.test(s);

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

/** Pure: sessions in, profile out. Sessions may be in any order. */
export function buildLearnerProfile(
  sessions: LearningSession[],
  source: LearnerProfile["source"] = "device",
): LearnerProfile {
  const recent = [...sessions]
    .sort((a, b) => (a.started_at < b.started_at ? 1 : -1))
    .slice(0, HISTORY_LIMIT);

  const stateByLetter: Record<string, CognitiveState> = {};
  const errorRateByLetter: Record<string, number> = {};
  const confusions: Record<string, Record<string, number>> = {};
  let latestState: CognitiveState | null = null;
  const latencies: number[] = [];

  const bump = (target: string, chosen: string, w: number) => {
    (confusions[target] ??= {})[chosen] = (confusions[target][chosen] ?? 0) + w;
  };

  recent.forEach((s, rank) => {
    const attempts = sessionAttempts(s);
    const unguided = attempts.filter((a) => !a.was_guided_win);

    // State only from sessions that finished: an abandoned session was never
    // diagnosed, so its stored state is just the config it started with.
    const diagnosed =
      s.status === "completed" &&
      s.cognitive_state &&
      s.cognitive_state !== "insufficient_data"
        ? s.cognitive_state
        : null;
    if (diagnosed) {
      latestState ??= diagnosed;
      if (!(s.letter in stateByLetter)) {
        stateByLetter[s.letter] = diagnosed;
        errorRateByLetter[s.letter] =
          unguided.length > 0
            ? unguided.filter((a) => a.target_letter !== a.selected_letter).length /
              unguided.length
            : 0;
      }
    }

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
    sessionCount: recent.length,
    source,
    stateByLetter,
    errorRateByLetter,
    latestState,
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

/** A database row from `learning_sessions`, as a session, or null if it predates v2. */
function rowToSession(row: Record<string, unknown>): LearningSession | null {
  if (row.schema_version !== 2 || !row.session_id) return null;
  return {
    session_id: row.session_id as string,
    user_id: row.user_id as string,
    letter: row.letter as string,
    session_number: (row.session_number as number) ?? 1,
    status: (row.status as LearningSession["status"]) ?? "completed",
    started_at: (row.started_at as string) ?? (row.created_at as string),
    ended_at: (row.ended_at as string) ?? null,
    level_config: row.level_config as LevelConfig,
    activities: (row.activities as LearningSession["activities"]) ?? [],
    metrics: (row.metrics as LearningSession["metrics"]) ?? null,
    cognitive_state: (row.cognitive_state as CognitiveState) ?? null,
    reasoning: null,
    schema_version: 2,
  };
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
      .limit(HISTORY_LIMIT),
  ).then(({ data, error }) => {
    if (error) {
      console.warn("[LearnerProfile] remote history unavailable:", error.message);
      return null;
    }
    return ((data ?? []) as unknown as Record<string, unknown>[])
      .map(rowToSession)
      .filter((s): s is LearningSession => s !== null);
  });

  const timeout = new Promise<null>((resolve) =>
    setTimeout(() => resolve(null), REMOTE_TIMEOUT_MS),
  );
  try {
    return await Promise.race([query, timeout]);
  } catch {
    return null;
  }
}

/**
 * The child's history, from every place it is kept.
 *
 * - **This device**, filtered to this child. Local storage holds every session
 *   played on the device by anyone; reading it unfiltered is how one child's
 *   mistakes would steer another child's games.
 * - **The database**, for a signed-in child, so their profile follows them to a
 *   new phone or a cleared browser. Guests have no database identity — their
 *   mirror writes are rejected by row-level security — so for them the device
 *   is the whole history.
 *
 * Merged by session id, preferring the device copy, which is the more current
 * one for a session still being written. A slow or failed database read falls
 * back to the device alone after 2.5s rather than holding the child on the
 * roadmap.
 */
export async function loadLearnerProfile(userId: string): Promise<LearnerProfile> {
  const local = loadAllSessions().filter((s) => s.user_id === userId);

  const offline = localStorage.getItem("akshara_offline_mode") === "true";
  if (offline || !isSupabaseConfigured || userId === "offline") {
    return buildLearnerProfile(local, "device");
  }

  const remote = await fetchRemoteSessions(userId);
  if (remote === null) return buildLearnerProfile(local, "device");

  const merged = new Map<string, LearningSession>();
  remote.forEach((s) => merged.set(s.session_id, s));
  local.forEach((s) => merged.set(s.session_id, s));
  return buildLearnerProfile([...merged.values()], "database+device");
}
