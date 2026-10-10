import type { ReportSources } from "../../api/client";

/**
 * The teacher's class report — PLACEHOLDER.
 *
 * Built after the parent report, with three tabs: who needs help, the whole
 * class, and class-wide patterns. Like `ParentReport` it takes its records
 * rather than loading them; for now it lists the roster it receives.
 */
export interface ClassChild {
  id: string;
  display_name: string;
  avatar: string;
  sources: ReportSources;
}

export interface ClassReportProps {
  className: string;
  roster: ClassChild[];
  today: Date;
}

const C = { ink: "#0b0b0b", ink2: "#52514e", grid: "#e1e0d9", dash: "#c3c2b7" };
const DAY = 86_400_000;

export function ClassReport({ className, roster, today }: ClassReportProps) {
  const rows = roster.map((c) => {
    const times = c.sources.rows.map((r) => Date.parse(r.started_at ?? r.created_at));
    const last = times.length > 0 ? Math.max(...times) : null;
    return {
      c,
      sessions: c.sources.rows.length,
      mastered: c.sources.progress.filter((p) => p.mastered).length,
      daysSince: last === null ? null : Math.floor((today.getTime() - last) / DAY),
    };
  });

  return (
    <div className="h-[100dvh] overflow-y-auto bg-[#F7F6F2]" style={{ padding: "var(--pad-screen)" }}>
      <div className="mx-auto max-w-4xl flex flex-col gap-3">
        <h1 className="t-2 font-semibold" style={{ color: C.ink }}>{className}</h1>
        <p className="t--1 rounded-lg border border-dashed px-3 py-2" style={{ borderColor: C.dash, color: C.ink2 }}>
          Placeholder for the teacher's class report, built after the parent
          report. This lists the {roster.length} children it receives.
        </p>
        <table className="t--1 w-full rounded-xl border bg-white text-left" style={{ borderColor: C.grid }}>
          <thead style={{ color: C.ink2 }}>
            <tr>
              <th style={{ fontWeight: 400 }} className="px-3 py-2">Child</th>
              <th style={{ fontWeight: 400 }} className="px-3 py-2 text-right">Sessions</th>
              <th style={{ fontWeight: 400 }} className="px-3 py-2 text-right">Mastered</th>
              <th style={{ fontWeight: 400 }} className="px-3 py-2 text-right">Last played</th>
            </tr>
          </thead>
          <tbody style={{ color: C.ink, fontVariantNumeric: "tabular-nums" }}>
            {rows.map(({ c, sessions, mastered, daysSince }) => (
              <tr key={c.id} className="border-t" style={{ borderColor: C.grid }}>
                <td className="px-3 py-1.5">
                  <span aria-hidden>{c.avatar}</span> {c.display_name}
                </td>
                <td className="px-3 py-1.5 text-right">{sessions}</td>
                <td className="px-3 py-1.5 text-right">{mastered}</td>
                <td className="px-3 py-1.5 text-right">
                  {daysSince === null ? "never" : daysSince === 0 ? "today" : `${daysSince}d ago`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
