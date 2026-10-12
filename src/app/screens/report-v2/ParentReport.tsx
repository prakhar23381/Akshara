import { useMemo, useState } from "react";
import type { ReportSources } from "../../api/client";
import { buildReportModel, type Range, type ReportModel } from "./model";
import { Summary } from "./views/Summary";
import { parseDay } from "./charts/days";
import { GRID, INK, INK2, PAGE } from "./charts/theme";

/**
 * The new parent report (W4; design: docs/10_REPORT_DESIGN.md).
 *
 * Takes one child's records and a "today" instead of loading them, so the
 * report lab can render it with any scenario. Not routed yet: `/report` still
 * serves the W4a `ReportScreen` until B5. B2 is the summary and the period
 * switch; the sections (B3) and detail views (B4) come next.
 *
 * The period can be controlled (the app will keep it in the URL) or left to
 * the report.
 */
export interface ParentReportProps {
  sources: ReportSources;
  today: Date;
  avatar?: string;
  range?: Range;
  onRangeChange?: (range: Range) => void;
  /** Shows a back button; the app returns to the adult home. */
  onBack?: () => void;
}

const RANGES: { id: Range; label: string }[] = [
  { id: "week", label: "Week" },
  { id: "month", label: "Month" },
  { id: "all", label: "All" },
];

function caption(model: ReportModel): string {
  if (model.range === "week") return "This week so far · vs the same days last week";
  if (model.range === "month") return "This month so far · vs the same days last month";
  const first = model.practice.byDay[0]?.date;
  return first
    ? `Everything since ${parseDay(first).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" })}`
    : "Everything so far";
}

export function ParentReport({ sources, today, avatar, range: controlled, onRangeChange, onBack }: ParentReportProps) {
  const [own, setOwn] = useState<Range>("week");
  const range = controlled ?? own;
  const setRange = (r: Range) => (onRangeChange ? onRangeChange(r) : setOwn(r));
  const model = useMemo(() => buildReportModel(sources, today, range), [sources, today, range]);

  return (
    <div className="h-[100dvh] overflow-y-auto" style={{ background: PAGE, color: INK }}>
      <header
        className="sticky top-0 z-10"
        style={{ background: PAGE, boxShadow: `0 1px 0 0 ${GRID}`, padding: "var(--pad-screen)" }}
      >
        <div className="mx-auto max-w-5xl flex flex-col gap-2">
          <div className="flex items-center gap-2">
            {onBack && (
              <button
                onClick={onBack}
                aria-label="Back"
                className="t-1 rounded-full grid place-items-center"
                style={{ width: "var(--tap-min)", height: "var(--tap-min)", color: INK }}
              >
                ←
              </button>
            )}
            {avatar && (
              <span className="t-2" aria-hidden>
                {avatar}
              </span>
            )}
            <h1 className="t-2 font-semibold">{sources.displayName}</h1>
          </div>
          <div
            role="group"
            aria-label="Period"
            className="flex self-start rounded-full p-1 bg-white"
            style={{ boxShadow: `inset 0 0 0 1px ${GRID}` }}
          >
            {RANGES.map((r) => {
              const on = r.id === range;
              return (
                <button
                  key={r.id}
                  onClick={() => setRange(r.id)}
                  aria-pressed={on}
                  className="t-0 rounded-full px-5 font-semibold"
                  style={{ minHeight: "var(--tap-min)", background: on ? INK : "transparent", color: on ? "#fff" : INK2 }}
                >
                  {r.label}
                </button>
              );
            })}
          </div>
          <p className="t--1" style={{ color: INK2 }}>
            {caption(model)}
          </p>
        </div>
      </header>

      <main style={{ padding: "var(--pad-screen)" }}>
        <div className="mx-auto max-w-5xl">
          {model.hasAnySessions ? (
            <Summary model={model} today={today} />
          ) : (
            <p className="t-0 rounded-2xl bg-white p-4" style={{ boxShadow: `inset 0 0 0 1px ${GRID}` }}>
              No sessions yet. When {sources.displayName} plays, what they practise shows up here.
            </p>
          )}
          <footer className="t--1 flex flex-col gap-1 mt-4" style={{ color: INK2 }}>
            {model.dataSource === "device" && (
              <p>Saved on this device only: sessions played on another device are not included.</p>
            )}
            {model.legacySessions > 0 && (
              <p>
                {model.legacySessions} older session{model.legacySessions === 1 ? " is" : "s are"} counted but
                recorded before answers were kept, so not analysed.
              </p>
            )}
          </footer>
        </div>
      </main>
    </div>
  );
}
