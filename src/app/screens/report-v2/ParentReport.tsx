import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Download } from "lucide-react";
import type { ReportSources } from "../../api/reportSources";
import { buildReportModel, type Range, type ReportModel, type SkillId } from "./model";
import { Summary } from "./views/Summary";
import { LettersView } from "./views/Letters";
import { SkillsView } from "./views/Skills";
import { PracticeView } from "./views/Practice";
import { MixUpsView } from "./views/MixUps";
import { LetterView } from "./views/Letter";
import { PairView } from "./views/Pair";
import { SkillView } from "./views/Skill";
import { SessionsView } from "./views/Sessions";
import { PrintReport } from "./PrintReport";
import { Glyph, periodCaption, upOf, type Section, type View } from "./views/shared";
import { GRID, INK, INK2, PAGE, SURFACE } from "./charts/theme";

/**
 * The new parent report (W4; design: docs/10_REPORT_DESIGN.md).
 *
 * Takes one child's records and a "today" instead of loading them, so the
 * report lab can render it with any scenario; `/report` loads them
 * (`screens/ParentReportScreen.tsx`, B5). The summary and the period switch
 * (B2), the four sections a card's title opens (B3), and the detail views and
 * Download (B4).
 *
 * The period and the view can each be controlled (the app will keep both in
 * the URL, so the phone's back button goes up a level) or left to the report.
 */
export interface ParentReportProps {
  sources: ReportSources;
  today: Date;
  avatar?: string;
  range?: Range;
  onRangeChange?: (range: Range) => void;
  view?: View;
  onViewChange?: (view: View) => void;
  /** Shows a back button; the app returns to the adult home. */
  onBack?: () => void;
}

const TITLES: Record<Section, string> = {
  letters: "Letters",
  skills: "Skills",
  practice: "Practice",
  mixups: "Mix-ups",
};

const RANGES: { id: Range; label: string }[] = [
  { id: "week", label: "Week" },
  { id: "month", label: "Month" },
  { id: "all", label: "All" },
];

/** A letter and a pair cover the whole history; the period switch does not apply (user, 2026-10-12). */
const wholeHistory = (view: View) => view.startsWith("letter:") || view.startsWith("pair:");

function titleOf(view: View, model: ReportModel): ReactNode {
  if (view in TITLES) return TITLES[view as Section];
  if (view === "sessions") return "All sessions";
  const rest = view.slice(view.indexOf(":") + 1);
  if (view.startsWith("letter:")) return <Glyph>{rest}</Glyph>;
  if (view.startsWith("pair:")) {
    const [a, b] = rest.split("-");
    return (
      <Glyph>
        {a} ↔ {b}
      </Glyph>
    );
  }
  return model.skills.entries.find((s) => s.id === rest)?.label ?? "";
}

export function ParentReport({
  sources,
  today,
  avatar,
  range: controlled,
  onRangeChange,
  view: controlledView,
  onViewChange,
  onBack,
}: ParentReportProps) {
  const [own, setOwn] = useState<Range>("week");
  const range = controlled ?? own;
  const setRange = (r: Range) => (onRangeChange ? onRangeChange(r) : setOwn(r));
  const [ownView, setOwnView] = useState<View>("summary");
  const view = controlledView ?? ownView;
  const setView = (v: View) => (onViewChange ? onViewChange(v) : setOwnView(v));
  const model = useMemo(() => buildReportModel(sources, today, range), [sources, today, range]);

  // A new view starts at its top.
  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scroller.current?.scrollTo(0, 0);
  }, [view]);

  // Download: lay the document out, then print it. `afterprint` brings the
  // report back; the document also has its own way back, for browsers that
  // do not send it.
  const [printing, setPrinting] = useState(false);
  useEffect(() => {
    if (!printing) return;
    const done = () => setPrinting(false);
    window.addEventListener("afterprint", done);
    const t = window.setTimeout(() => window.print(), 400);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("afterprint", done);
    };
  }, [printing]);

  if (printing) {
    return (
      <div className="h-[100dvh] overflow-y-auto print:h-auto print:overflow-visible" style={{ background: SURFACE }}>
        <div className="print:hidden flex justify-center gap-2 p-3">
          <PillButton onClick={() => setPrinting(false)}>‹ Back to the report</PillButton>
          <PillButton onClick={() => window.print()}>Print or save as PDF</PillButton>
        </div>
        <div className="p-3 print:p-0">
          <PrintReport model={model} today={today} />
        </div>
      </div>
    );
  }

  const up = upOf(view);
  const fixedSpan = wholeHistory(view);

  return (
    <div ref={scroller} className="h-[100dvh] overflow-y-auto" style={{ background: PAGE, color: INK }}>
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
            <h1 className="t-2 font-semibold min-w-0 truncate">{sources.displayName}</h1>
            {model.hasAnySessions && (
              <button
                onClick={() => setPrinting(true)}
                className="t--1 ml-auto inline-flex items-center gap-1.5 rounded-full px-4 font-semibold bg-white shrink-0"
                style={{ minHeight: "var(--tap-min)", color: INK, boxShadow: `inset 0 0 0 1px ${GRID}` }}
              >
                <Download size={16} aria-hidden />
                Download
              </button>
            )}
          </div>
          {!fixedSpan && (
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
          )}
          <p className="t--1" style={{ color: INK2 }}>
            {periodCaption(model, fixedSpan)}
          </p>
        </div>
      </header>

      <main style={{ padding: "var(--pad-screen)" }}>
        <div className="mx-auto max-w-5xl">
          {!model.hasAnySessions ? (
            <div className="rounded-2xl bg-white p-4 flex flex-col gap-3 items-start" style={{ boxShadow: `inset 0 0 0 1px ${GRID}` }}>
              <p className="t-0">No sessions yet. When {sources.displayName} plays, what they practise shows up here.</p>
              {onBack && <PillButton onClick={onBack}>‹ Back to your children</PillButton>}
            </div>
          ) : view === "summary" ? (
            <Summary model={model} today={today} onOpen={setView} />
          ) : (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <PillButton onClick={() => setView(up)}>
                  <span aria-hidden className="t-1 leading-none">
                    ‹
                  </span>
                  {up === "summary" ? "Summary" : TITLES[up as Section]}
                </PillButton>
                {/* A letter or a pair is shown large in the view itself. */}
                <h2 className={fixedSpan ? "sr-only" : "t-2 font-bold min-w-0 truncate"} style={{ color: INK }}>
                  {titleOf(view, model)}
                </h2>
              </div>
              <ViewBody view={view} model={model} sources={sources} today={today} onOpen={setView} />
            </div>
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

function ViewBody({
  view,
  model,
  sources,
  today,
  onOpen,
}: {
  view: View;
  model: ReportModel;
  sources: ReportSources;
  today: Date;
  onOpen: (view: View) => void;
}) {
  if (view === "letters") return <LettersView model={model} onOpen={onOpen} />;
  if (view === "skills") return <SkillsView model={model} onOpen={onOpen} />;
  if (view === "practice") return <PracticeView model={model} today={today} onOpen={onOpen} />;
  if (view === "mixups") return <MixUpsView model={model} onOpen={onOpen} />;
  if (view === "sessions") return <SessionsView model={model} />;
  const rest = view.slice(view.indexOf(":") + 1);
  if (view.startsWith("letter:")) return <LetterView sources={sources} today={today} letter={rest} onOpen={onOpen} />;
  if (view.startsWith("pair:")) {
    const [a, b] = rest.split("-");
    return <PairView sources={sources} today={today} a={a} b={b} />;
  }
  return <SkillView model={model} id={rest as SkillId} onOpen={onOpen} />;
}

function PillButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="t-0 inline-flex items-center gap-1 rounded-full pl-3 pr-4 font-semibold bg-white shrink-0"
      style={{ minHeight: "var(--tap-min)", color: INK, boxShadow: `inset 0 0 0 1px ${GRID}` }}
    >
      {children}
    </button>
  );
}
