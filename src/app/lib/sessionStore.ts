import { supabase, isSupabaseConfigured } from "./supabase";
import { computeSessionMetrics } from "./sessionMetrics";
import {
  sessionAttempts,
  sessionDurationMs,
  type LearningSession,
} from "../types/session";

/**
 * Write-through persistence for sessions.
 *
 * Every mutation hits localStorage synchronously, so a refresh or a closed tab
 * cannot lose a session in progress. The remote mirror is best effort and never
 * blocks the child.
 *
 * Sessions live in the same `learning_sessions` table as before. Each row is
 * written so that it is **simultaneously a valid v1 row and a v2 row**: the old
 * scalar columns the report already aggregates are populated, and the new
 * session fields sit alongside them. That lets the new session model land
 * without rewriting the report in the same change.
 */
const TABLE_KEY = "akshara_db_learning_sessions";
const ACTIVE_KEY = "akshara_active_session_id";

/** A session left open longer than this is treated as abandoned on next boot. */
export const STALE_SESSION_HOURS = 6;

function readRows(): any[] {
  try {
    const raw = localStorage.getItem(TABLE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeRows(rows: any[]): void {
  try {
    localStorage.setItem(TABLE_KEY, JSON.stringify(rows));
  } catch (err) {
    console.error("[sessionStore] local write failed", err);
  }
}

/** Shape a session as a row that both the old and the new readers understand. */
function toRow(s: LearningSession): Record<string, unknown> {
  const attempts = sessionAttempts(s);
  const metrics = s.metrics ?? computeSessionMetrics(attempts);
  const errorRate =
    metrics.total_attempts > 0
      ? Math.round((metrics.errors / metrics.total_attempts) * 1000) / 10
      : 0;

  return {
    // v1 columns — what the current report aggregates
    id: s.session_id,
    user_id: s.user_id,
    letter: s.letter,
    session_number: s.session_number,
    cognitive_state: s.cognitive_state ?? s.level_config.cognitive_state,
    distractor_pool: s.level_config.distractor_pool,
    scaffold_intensity: s.level_config.scaffold_intensity,
    error_rate_pct: errorRate,
    avg_latency_ms: metrics.latency_median_ms ?? 0,
    confused_pairs: {
      confused_pairs: attempts
        .filter((a) => a.target_letter !== a.selected_letter)
        .map((a) => [a.target_letter, a.selected_letter]),
      reasoning: s.reasoning ?? s.level_config.reasoning,
      metrics,
    },
    provider_used: s.level_config.provider_used,
    created_at: s.started_at,

    // v2 fields
    session_id: s.session_id,
    status: s.status,
    started_at: s.started_at,
    ended_at: s.ended_at,
    duration_ms: sessionDurationMs(s),
    activities: s.activities,
    metrics: s.metrics,
    level_config: s.level_config,
    schema_version: 2,
  };
}

export function upsertSession(s: LearningSession): void {
  const row = toRow(s);
  const rows = readRows();
  const i = rows.findIndex(
    (r) => r.session_id === s.session_id || r.id === s.session_id,
  );
  if (i >= 0) rows[i] = { ...rows[i], ...row };
  else rows.push(row);
  writeRows(rows);

  // Mirror remotely only when a real backend exists. In offline mode the
  // supabase proxy would write to this same localStorage table and duplicate it.
  const offline = localStorage.getItem("akshara_offline_mode") === "true";
  if (!offline && isSupabaseConfigured) {
    try {
      Promise.resolve(
        supabase.from("learning_sessions").upsert(row as never),
      ).catch(() => {});
    } catch {
      /* never block the child on a network write */
    }
  }
}

export function loadSession(sessionId: string): LearningSession | null {
  const row = readRows().find(
    (r) => r.session_id === sessionId || r.id === sessionId,
  );
  if (!row || row.schema_version !== 2) return null;
  return {
    session_id: row.session_id,
    user_id: row.user_id,
    letter: row.letter,
    session_number: row.session_number,
    status: row.status,
    started_at: row.started_at,
    ended_at: row.ended_at,
    level_config: row.level_config,
    activities: row.activities ?? [],
    metrics: row.metrics ?? null,
    cognitive_state: row.cognitive_state ?? null,
    reasoning: row.confused_pairs?.reasoning ?? null,
    schema_version: 2,
  };
}

/** Every v2 session, newest first. Legacy v1 rows are excluded. */
export function loadAllSessions(): LearningSession[] {
  return readRows()
    .filter((r) => r.schema_version === 2)
    .map((r) => loadSession(r.session_id))
    .filter((s): s is LearningSession => s !== null)
    .sort(
      (a, b) =>
        new Date(b.started_at).getTime() - new Date(a.started_at).getTime(),
    );
}

export function getActiveSessionId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_KEY);
  } catch {
    return null;
  }
}

export function setActiveSessionId(id: string | null): void {
  try {
    if (id) localStorage.setItem(ACTIVE_KEY, id);
    else localStorage.removeItem(ACTIVE_KEY);
  } catch {
    /* private mode — the session still works, it just will not resume */
  }
}

/**
 * Close out sessions left open from a previous visit.
 * A tab closed mid-activity leaves `in_progress` forever otherwise, which would
 * both block a fresh start and overstate engagement in the report.
 */
export function sweepStaleSessions(now: Date = new Date()): number {
  const rows = readRows();
  let changed = 0;
  rows.forEach((r) => {
    if (r.schema_version !== 2 || r.status !== "in_progress") return;
    const age = now.getTime() - new Date(r.started_at).getTime();
    if (age > STALE_SESSION_HOURS * 3600_000) {
      r.status = "abandoned";
      r.ended_at = r.ended_at ?? new Date(
        new Date(r.started_at).getTime() + age,
      ).toISOString();
      changed++;
    }
  });
  if (changed > 0) {
    writeRows(rows);
    const active = getActiveSessionId();
    if (active && rows.some((r) => r.session_id === active && r.status !== "in_progress")) {
      setActiveSessionId(null);
    }
  }
  return changed;
}
