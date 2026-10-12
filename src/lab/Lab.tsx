import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { ParentReport } from "../app/screens/report-v2/ParentReport";
import type { Range } from "../app/screens/report-v2/model";
import type { View } from "../app/screens/report-v2/views/shared";
import { ClassReport } from "../app/screens/report-v2/ClassReport";
import { buildScenario, LAB_TODAY, SCENARIOS } from "./fixtures/scenarios";

/**
 * The report lab: one scenario, shown at phone, tablet and desktop size at
 * once, each frame a real device-sized viewport scaled down to fit.
 *
 *   /lab.html?scenario=month&range=week&view=summary&size=all   the workbench
 *   /lab.html?frame=1&scenario=month&range=week&view=letters    one report,
 *                         alone — what each frame loads, and what the
 *                         screenshots take
 *
 * Each frame is its own page, so it lays out at its own width with its own
 * media queries, and saving a file updates all three.
 *
 * Styled inline, not with Tailwind: src/lab is excluded from the production
 * stylesheet's sources, so a class used only here would not exist.
 */
const SIZES = {
  phone: { w: 390, h: 844, label: "Phone" },
  tablet: { w: 820, h: 1180, label: "Tablet" },
  desktop: { w: 1440, h: 900, label: "Desktop" },
} as const;
type Device = keyof typeof SIZES;
type Size = Device | "all";

const TODAY = new Date(LAB_TODAY);
const RANGES: Range[] = ["week", "month", "all"];
const asRange = (v: string | null): Range => (RANGES.includes(v as Range) ? (v as Range) : "week");
const VIEWS: { id: View; label: string }[] = [
  { id: "summary", label: "Summary" },
  { id: "letters", label: "Letters" },
  { id: "skills", label: "Skills" },
  { id: "practice", label: "Practice" },
  { id: "mixups", label: "Mix-ups" },
];
const asView = (v: string | null): View => (VIEWS.some((x) => x.id === v) ? (v as View) : "summary");
const frameUrl = (scenario: string, range: Range, view: View) =>
  `/lab.html?frame=1&scenario=${encodeURIComponent(scenario)}&range=${range}&view=${view}`;

export function Lab() {
  const params = new URLSearchParams(window.location.search);
  const scenario = params.get("scenario") ?? "week";
  const range = asRange(params.get("range"));
  const view = asView(params.get("view"));
  return params.get("frame") === "1" ? (
    <Frame scenario={scenario} initialRange={range} initialView={view} />
  ) : (
    <Workbench
      initialScenario={scenario}
      initialRange={range}
      initialView={view}
      initialSize={(params.get("size") as Size) ?? "all"}
    />
  );
}

function Frame({ scenario, initialRange, initialView }: { scenario: string; initialRange: Range; initialView: View }) {
  const sc = useMemo(() => buildScenario(scenario), [scenario]);
  // The report's own switch and links work in each frame too; the address keeps up.
  const [range, setRange] = useState(initialRange);
  const [view, setView] = useState(initialView);
  useEffect(() => {
    window.history.replaceState(null, "", frameUrl(scenario, range, view));
  }, [scenario, range, view]);
  return sc.kind === "parent" ? (
    <ParentReport
      sources={sc.child.sources}
      today={TODAY}
      avatar={sc.child.avatar}
      range={range}
      onRangeChange={setRange}
      view={view}
      onViewChange={setView}
    />
  ) : (
    <ClassReport className={sc.className} roster={sc.children} today={TODAY} />
  );
}

const TOOLBAR = 52;
const LABEL = 26;
const GAP = 20;
const PAD = 16;

const INK = "#0b0b0b";
const MUTED = "#6b6a65";
const LINE = "#d4d3cc";
const s = {
  page: { height: "100dvh", display: "flex", flexDirection: "column", background: "#e6e5e0", color: INK } as CSSProperties,
  bar: {
    height: TOOLBAR, flexShrink: 0, display: "flex", alignItems: "center", gap: 12, padding: "0 16px",
    background: "#fff", borderBottom: `1px solid ${LINE}`, fontSize: 14,
  } as CSSProperties,
  select: { fontSize: 14, border: `1px solid ${LINE}`, borderRadius: 6, padding: "4px 8px", background: "#fff" } as CSSProperties,
  group: { display: "flex", border: `1px solid ${LINE}`, borderRadius: 6, overflow: "hidden" } as CSSProperties,
  button: (on: boolean): CSSProperties => ({
    fontSize: 14, padding: "4px 10px", border: 0, cursor: "pointer",
    background: on ? INK : "#fff", color: on ? "#fff" : INK,
  }),
  note: { marginLeft: "auto", fontSize: 12, color: MUTED } as CSSProperties,
  stage: { flex: 1, display: "flex", alignItems: "flex-start", justifyContent: "center", overflow: "hidden", padding: PAD, gap: GAP } as CSSProperties,
  label: { height: LABEL, display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 12, color: MUTED } as CSSProperties,
  screen: { background: "#fff", borderRadius: 6, overflow: "hidden", boxShadow: "0 4px 14px rgba(0,0,0,0.12)" } as CSSProperties,
};

function Workbench({
  initialScenario,
  initialRange,
  initialView,
  initialSize,
}: {
  initialScenario: string;
  initialRange: Range;
  initialView: View;
  initialSize: Size;
}) {
  const [scenario, setScenario] = useState(initialScenario);
  const [range, setRange] = useState(initialRange);
  const [view, setView] = useState(initialView);
  const [size, setSize] = useState<Size>(initialSize in SIZES || initialSize === "all" ? initialSize : "all");
  const [win, setWin] = useState({ w: window.innerWidth, h: window.innerHeight });

  useEffect(() => {
    const onResize = () => setWin({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // The address bar always reproduces the view.
  useEffect(() => {
    window.history.replaceState(
      null,
      "",
      `/lab.html?scenario=${encodeURIComponent(scenario)}&range=${range}&view=${view}&size=${size}`,
    );
  }, [scenario, range, view, size]);

  const devices: Device[] = size === "all" ? ["phone", "tablet", "desktop"] : [size];
  const availW = win.w - PAD * 2 - GAP * (devices.length - 1);
  const availH = win.h - TOOLBAR - LABEL - PAD * 2;
  const scale = Math.min(
    1,
    availW / devices.reduce((sum, d) => sum + SIZES[d].w, 0),
    availH / Math.max(...devices.map((d) => SIZES[d].h)),
  );

  return (
    <div style={s.page}>
      <header style={s.bar}>
        <strong>Report lab</strong>
        <select value={scenario} onChange={(e) => setScenario(e.target.value)} style={s.select} aria-label="Scenario">
          {(["parent", "class"] as const).map((kind) => (
            <optgroup key={kind} label={kind === "parent" ? "Parent report" : "Teacher report"}>
              {SCENARIOS.filter((x) => x.kind === kind).map((x) => (
                <option key={x.id} value={x.id}>
                  {x.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <div style={s.group} role="group" aria-label="Period, in every frame">
          {RANGES.map((r) => (
            <button key={r} onClick={() => setRange(r)} aria-pressed={range === r} style={s.button(range === r)}>
              {r[0].toUpperCase() + r.slice(1)}
            </button>
          ))}
        </div>
        <div style={s.group} role="group" aria-label="View, in every frame">
          {VIEWS.map((v) => (
            <button key={v.id} onClick={() => setView(v.id)} aria-pressed={view === v.id} style={s.button(view === v.id)}>
              {v.label}
            </button>
          ))}
        </div>
        <div style={s.group} role="group" aria-label="Size">
          {(["all", "phone", "tablet", "desktop"] as const).map((x) => (
            <button key={x} onClick={() => setSize(x)} aria-pressed={size === x} style={s.button(size === x)}>
              {x === "all" ? "All sizes" : SIZES[x].label}
            </button>
          ))}
        </div>
        <span style={s.note}>
          Today is fixed at {TODAY.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
          {" · "}
          {Math.round(scale * 100)}%
        </span>
      </header>

      <main style={s.stage}>
        {devices.map((d) => {
          const { w, h, label } = SIZES[d];
          return (
            <section key={d} style={{ display: "flex", flexDirection: "column", flexShrink: 0 }}>
              <div style={s.label}>
                <span>
                  {label} · {w}×{h}
                </span>
                <a href={frameUrl(scenario, range, view)} target="_blank" rel="noreferrer" style={{ color: MUTED }}>
                  open alone
                </a>
              </div>
              <div style={{ ...s.screen, width: w * scale, height: h * scale }}>
                <iframe
                  key={`${scenario}-${range}-${view}`}
                  title={`${label} report`}
                  src={frameUrl(scenario, range, view)}
                  width={w}
                  height={h}
                  style={{ border: 0, transform: `scale(${scale})`, transformOrigin: "0 0" }}
                />
              </div>
            </section>
          );
        })}
      </main>
    </div>
  );
}
