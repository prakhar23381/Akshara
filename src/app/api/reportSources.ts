import { supabase } from "../lib/supabase";
import { loadRowsFor } from "../lib/sessionStore";
import { normaliseRow, readsDatabase, withTimeout } from "../lib/learnerProfile";

/** One child's records, from wherever they were found. */
export interface ReportSources {
  /** `learning_sessions` rows, v1 and v2, this child only. */
  rows: any[];
  /** `letter_progress` rows, this child only. */
  progress: any[];
  displayName: string;
  source: "database+device" | "device";
}

function readLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

/** Database rows and device rows for the same sessions, device copy preferred. */
export function mergeRows(remote: any[], local: any[]): any[] {
  const key = (r: any) => r.session_id ?? r.id;
  const merged = new Map<string, any>();
  remote.forEach((r) => merged.set(key(r), r));
  local.forEach((r) => merged.set(key(r), r));
  return [...merged.values()];
}

/**
 * Gathers one child's records — what both reports are built from: the parent
 * report (`screens/report-v2`, B5) and the child's own progress
 * (`fetchProgressReport` in `client.ts`).
 *
 * - **This device**, filtered to the child: their session rows, and — for a
 *   guest, whose writes go to the local mock — their progress and profile.
 * - **The database**, for a signed-in child: `learning_sessions`,
 *   `letter_progress` and their `children` name. Merged with the device by
 *   session id, device copy preferred as the more current. A request that
 *   fails or takes over 2.5s falls back to the device, and the sources say so
 *   (`source: "device"`), so a partial report is never mistaken for a
 *   complete one.
 *
 * `fallbackName` is used when no profile row has a name — pass the name the
 * adult's account holds for the child.
 */
export async function fetchReportSources(userId: string, fallbackName?: string): Promise<ReportSources> {
  const localRows = loadRowsFor(userId);
  const localProgress = readLocal<any[]>("akshara_db_letter_progress", []).filter((p) => p.user_id === userId);
  // The child's name: their own row in `children`. A guest who played before
  // accounts existed may only have the old profile row, whose id is the child's.
  const localProfile =
    readLocal<any[]>("akshara_db_children", []).find((c) => c.id === userId) ??
    readLocal<any[]>("akshara_db_user_profiles", []).find((p) => p.id === userId);

  let rows = localRows;
  let progress = localProgress;
  let name: string | undefined = localProfile?.display_name;
  let source: ReportSources["source"] = "device";

  if (readsDatabase(userId)) {
    const remote = await withTimeout(
      Promise.all([
        supabase
          .from("learning_sessions")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(1000),
        supabase.from("letter_progress").select("*").eq("user_id", userId),
        supabase.from("children").select("display_name").eq("id", userId).maybeSingle(),
      ]),
    );
    if (remote) {
      const [sessionsRes, progressRes, profileRes] = remote;
      if (!sessionsRes.error && sessionsRes.data) {
        rows = mergeRows((sessionsRes.data as any[]).map(normaliseRow), localRows);
        source = "database+device";
      } else if (sessionsRes.error) {
        console.warn("[Report] sessions unavailable:", sessionsRes.error.message);
      }
      // The database is the only place a signed-in child's progress is
      // written, so when it answers it is the whole truth.
      if (!progressRes.error && progressRes.data) progress = progressRes.data as any[];
      if (!profileRes.error && profileRes.data?.display_name) {
        name = profileRes.data.display_name as string;
      }
    }
  }

  return { rows, progress, displayName: name ?? fallbackName ?? "Your child", source };
}
