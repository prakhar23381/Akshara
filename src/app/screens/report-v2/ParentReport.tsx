import { useMemo } from "react";
import { buildProgressReport, type ReportSources } from "../../api/client";

/**
 * The new parent report — PLACEHOLDER.
 *
 * Takes one child's records and a "today" instead of loading them, so the
 * report lab can render it with any scenario. Not routed: `/report` still
 * serves the W4a `ReportScreen` until this replaces it. Its design is the next
 * step (TODO W4-P); for now it shows the data it receives, so each lab
 * scenario can be checked.
 */
export interface ParentReportProps {
  sources: ReportSources;
  today: Date;
}

// Colours come from one palette as style props, as in the W4a report; Tailwind does layout.
const C = { ink: "#0b0b0b", ink2: "#52514e", grid: "#e1e0d9", dash: "#c3c2b7" };
const DAY = 86_400_000;
const day = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" }) : "—";

export function ParentReport({ sources, today }: ParentReportProps) {
  const report = useMemo(() => buildProgressReport(sources), [sources]);
  const inWindow = (from: number, to: number) =>
    sources.rows.filter((r) => {
      const t = today.getTime() - Date.parse(r.started_at ?? r.created_at);
      return t >= from * DAY && t < to * DAY;
    }).length;

  const facts: [string, string][] = [
    ["Sessions", String(report.total_sessions)],
    ["This week / last week", `${inWindow(0, 7)} / ${inWindow(7, 14)}`],
    ["Letters practised", String(Object.keys(report.letter_stats).length)],
    ["Letters mastered", `${report.letters_mastered} / 33`],
    ["First / latest session", `${day(report.assessment_window?.first)} – ${day(report.assessment_window?.last)}`],
    ["Answer supplied", report.totals?.rescue_pct != null ? `${report.totals.rescue_pct}%` : "—"],
  ];

  return (
    <div className="h-[100dvh] overflow-y-auto bg-[#F7F6F2]" style={{ padding: "var(--pad-screen)" }}>
      <div className="mx-auto max-w-3xl flex flex-col gap-3">
        <h1 className="t-2 font-semibold" style={{ color: C.ink }}>{sources.displayName}</h1>
        <p className="t--1 rounded-lg border border-dashed px-3 py-2" style={{ borderColor: C.dash, color: C.ink2 }}>
          Placeholder for the new parent report. Designed in the next step; this
          lists the data it receives.
        </p>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {facts.map(([k, v]) => (
            <div key={k} className="rounded-xl border bg-white px-4 py-3" style={{ borderColor: C.grid }}>
              <dt className="t--1" style={{ color: C.ink2 }}>{k}</dt>
              <dd className="t-1 font-semibold" style={{ color: C.ink }}>{v}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
