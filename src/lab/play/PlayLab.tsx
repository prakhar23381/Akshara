import { useEffect, useState, type CSSProperties, type ComponentType } from "react";
import { POSES } from "./Mitthu";
import { MitthuStation } from "./stations/MitthuStation";
import { ButtonsStation } from "./stations/ButtonsStation";
import { PathStation } from "./stations/PathStation";
import { HomeStation } from "./stations/HomeStation";
import { LessonStation } from "./stations/LessonStation";
import { CelebrationStation } from "./stations/CelebrationStation";

/**
 * The play lab: the gamification ideas of docs/11, built as clickable
 * prototypes ("stations") and shown at phone, tablet and desktop size at once.
 * Nothing here is wired into the app; each station is a self-contained mock.
 *
 *   /playlab.html?station=lesson&variant=glow&size=all   the workbench
 *   /playlab.html?frame=1&station=lesson&variant=glow    one station, alone
 *
 * A separate copy of the report lab's frames, by choice: the report lab is
 * left untouched. Styled inline, like it — src/lab is outside the production
 * stylesheet's sources.
 */
type Station = {
  id: string;
  label: string;
  doc: string;
  variants: { id: string; label: string }[];
  View: ComponentType<{ variant: string }>;
};

const STATIONS: Station[] = [
  {
    id: "mitthu", label: "Mitthu", doc: "§3.1 · D1 D2 D4", View: MitthuStation,
    variants: [{ id: "all", label: "All poses" }, ...POSES.map((p) => ({ id: p.id, label: p.label }))],
  },
  {
    id: "buttons", label: "Buttons & colours", doc: "§3.9", View: ButtonsStation,
    variants: [{ id: "kit", label: "Kit" }, { id: "colours", label: "Colours (AA)" }],
  },
  {
    id: "path", label: "Path", doc: "§3.3", View: PathStation,
    variants: [{ id: "start", label: "First letter" }, { id: "unit1", label: "In unit 1" }, { id: "midway", label: "Midway" }],
  },
  {
    id: "home", label: "Home", doc: "§3.4 §3.5", View: HomeStation,
    variants: [{ id: "monday", label: "Monday" }, { id: "midweek", label: "Missed a day" }, { id: "done", label: "Mission met" }],
  },
  {
    id: "lesson", label: "In-lesson", doc: "§3.8 · D5 D6 D7", View: LessonStation,
    variants: [{ id: "play", label: "Play" }, { id: "glow", label: "Run of 3" }, { id: "sheet", label: "Success sheet" }, { id: "wrong", label: "Wrong answer" }],
  },
  {
    id: "celebrate", label: "Celebration", doc: "§3.6 §3.7", View: CelebrationStation,
    variants: [{ id: "full", label: "Good session" }, { id: "gritty", label: "Kept going" }, { id: "quick", label: "No tracing" }, { id: "mastered", label: "Mastered" }],
  },
];

const SIZES = {
  phone: { w: 390, h: 844, label: "Phone" },
  tablet: { w: 820, h: 1180, label: "Tablet" },
  desktop: { w: 1440, h: 900, label: "Desktop" },
} as const;
type Device = keyof typeof SIZES;
type Size = Device | "all";

const find = (id: string | null) => STATIONS.find((s) => s.id === id) ?? STATIONS[0];
const variantOf = (st: Station, v: string | null) => (st.variants.some((x) => x.id === v) ? v! : st.variants[0].id);
const frameUrl = (station: string, variant: string) => `/playlab.html?frame=1&station=${station}&variant=${variant}`;

export function PlayLab() {
  const params = new URLSearchParams(window.location.search);
  const station = find(params.get("station"));
  const variant = variantOf(station, params.get("variant"));
  if (params.get("frame") === "1") {
    const { View } = station;
    return <View variant={variant} />;
  }
  const size = params.get("size") as Size;
  return <Workbench initialStation={station.id} initialVariant={variant} initialSize={size in SIZES ? size : "all"} />;
}

const TOOLBAR = 92;
const LABEL = 26;
const GAP = 20;
const PAD = 16;

const INK = "#0b0b0b";
const MUTED = "#6b6a65";
const LINE = "#d4d3cc";
const s = {
  page: { height: "100dvh", display: "flex", flexDirection: "column", background: "#e6e5e0", color: INK, fontFamily: "var(--font-ui)" } as CSSProperties,
  bar: {
    height: TOOLBAR, flexShrink: 0, boxSizing: "border-box", display: "flex", flexDirection: "column", justifyContent: "center", gap: 8,
    padding: "0 16px", background: "#fff", borderBottom: `1px solid ${LINE}`, fontSize: 14,
  } as CSSProperties,
  row: { display: "flex", alignItems: "center", gap: 12, flexWrap: "nowrap", overflowX: "auto" } as CSSProperties,
  group: { display: "flex", border: `1px solid ${LINE}`, borderRadius: 6, overflow: "hidden", flexShrink: 0 } as CSSProperties,
  button: (on: boolean): CSSProperties => ({
    fontSize: 14, padding: "4px 10px", border: 0, cursor: "pointer", whiteSpace: "nowrap",
    background: on ? INK : "#fff", color: on ? "#fff" : INK,
  }),
  note: { marginLeft: "auto", fontSize: 12, color: MUTED, whiteSpace: "nowrap" } as CSSProperties,
  stage: { flex: 1, display: "flex", alignItems: "flex-start", justifyContent: "center", overflow: "hidden", padding: PAD, gap: GAP } as CSSProperties,
  label: { height: LABEL, display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 12, color: MUTED } as CSSProperties,
  screen: { background: "#fff", borderRadius: 6, overflow: "hidden", boxShadow: "0 4px 14px rgba(0,0,0,0.12)" } as CSSProperties,
};

function Workbench({ initialStation, initialVariant, initialSize }: { initialStation: string; initialVariant: string; initialSize: Size }) {
  const [stationId, setStationId] = useState(initialStation);
  const [variant, setVariant] = useState(initialVariant);
  const [size, setSize] = useState<Size>(initialSize);
  const [reload, setReload] = useState(0);
  const [win, setWin] = useState({ w: window.innerWidth, h: window.innerHeight });
  const station = find(stationId);

  useEffect(() => {
    const onResize = () => setWin({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // The address bar always reproduces the view.
  useEffect(() => {
    window.history.replaceState(null, "", `/playlab.html?station=${stationId}&variant=${variant}&size=${size}`);
  }, [stationId, variant, size]);

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
        <div style={s.row}>
          <strong style={{ flexShrink: 0 }}>Play lab</strong>
          <div style={s.group} role="group" aria-label="Station">
            {STATIONS.map((x) => (
              <button
                key={x.id}
                onClick={() => {
                  setStationId(x.id);
                  setVariant(x.variants[0].id);
                }}
                aria-pressed={x.id === stationId}
                style={s.button(x.id === stationId)}
              >
                {x.label}
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
          <span style={s.note}>docs/11 {station.doc} · {Math.round(scale * 100)}%</span>
        </div>
        <div style={s.row}>
          <div style={s.group} role="group" aria-label="Variant, in every frame">
            {station.variants.map((v) => (
              <button key={v.id} onClick={() => setVariant(v.id)} aria-pressed={variant === v.id} style={s.button(variant === v.id)}>
                {v.label}
              </button>
            ))}
          </div>
          <button onClick={() => setReload((n) => n + 1)} style={{ ...s.button(false), ...s.group }}>
            ↻ Replay
          </button>
        </div>
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
                <a href={frameUrl(stationId, variant)} target="_blank" rel="noreferrer" style={{ color: MUTED }}>
                  open alone
                </a>
              </div>
              <div style={{ ...s.screen, width: w * scale, height: h * scale }}>
                <iframe
                  key={`${stationId}-${variant}-${reload}`}
                  title={`${label} ${station.label}`}
                  src={frameUrl(stationId, variant)}
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
