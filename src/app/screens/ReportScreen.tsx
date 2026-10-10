import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, Download } from "lucide-react";
import { Screen } from "../components/Screen";
import {
  fetchProgressReport,
  type LetterStat,
  type ProgressReport,
  type SessionSummary,
} from "../api/client";
import { LETTER_SEQUENCE } from "../types/levelConfig";
import {
  BAND,
  CRITICAL_ABOVE_PCT,
  GOOD_BELOW_PCT,
  errorBand,
  readableReasoning,
  type Band,
} from "../lib/reportBands";
import { useAuth } from "../contexts/AuthContext";

/* ── Colour ───────────────────────────────────────────────────────────────────
   Section accents come from the validated categorical palette and carry
   *identity* — which part of the report you are in — not a judgement. Stage
   uses the status palette, always with a symbol and a word beside it, because a
   stage is a genuine discrete state.

   Error magnitude stays a single hue encoded by bar length. It is deliberately
   not a red/amber/green scale: this tool has no validated cut-off scores, so
   colouring 30% "red" would assert a clinical threshold it has not earned. That
   restraint is what makes the report defensible to a specialist.             */
const C = {
  overview: "#2a78d6",
  sessions: "#1baf7a",
  letters: "#4a3aa7",
  lookalike: "#eb6834",
  ink: "#0b0b0b",
  ink2: "#52514e",
  muted: "#898781",
  grid: "#e1e0d9",
  good: "#0ca30c",
  warn: "#fab219",
  serious: "#ec835a",
};

const STAGE: Record<string, { label: string; color: string; mark: string }> = {
  insufficient_data: { label: "Just started", color: C.muted, mark: "○" },
  gross_shape_blindness: { label: "Learning the shape", color: C.serious, mark: "◔" },
  feature_neglect: { label: "Learning fine detail", color: C.warn, mark: "◑" },
  visual_mastery: { label: "Mastered", color: C.good, mark: "●" },
};

const ACTIVITY_LABEL: Record<string, string> = {
  intro: "Intro",
  pronunciation: "Sound",
  example_words: "Words",
  matras: "Matras",
  tracing: "Tracing",
  memory: "Matching",
  identify: "Listen & tap",
  word_fill: "Fill the blank",
  word_spelling: "Spelling",
};

const pc = (v?: number | null) => (typeof v === "number" ? `${Math.round(v)}%` : "—");
const secs = (ms?: number | null) =>
  typeof ms === "number" ? `${(ms / 1000).toFixed(1)}s` : "—";
const mins = (ms: number) => {
  const m = Math.floor(ms / 60000);
  const s = Math.round((ms % 60000) / 1000);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
};
const day = (iso?: string | null) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
};
const clock = (iso: string) =>
  new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });

/* ── Building blocks ──────────────────────────────────────────────────────────
   Adult screens scroll. The child-screen rule — fill one viewport, never
   scroll — was applied to this report too, which is what left a tablet showing
   four numbers and two stretched, half-empty boxes behind three tabs. The page
   now scrolls and the content sits in a grid of cards: one column on a phone,
   two on a tablet, three on a desktop. */

function Card({
  title,
  aside,
  children,
  className = "",
}: {
  title: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-xl border bg-white flex flex-col min-w-0 ${className}`}
      style={{ borderColor: C.grid }}
    >
      <header className="flex items-center justify-between gap-2 px-4 pt-3 pb-2">
        <h2 className="t-0 font-semibold" style={{ color: C.ink }}>
          {title}
        </h2>
        {aside}
      </header>
      <div className="px-4 pb-4 min-w-0 flex-1">{children}</div>
    </section>
  );
}

/** A status chip: always a mark and a word beside the colour, never colour alone. */
function BandBadge({ band, detail }: { band: Band; detail?: string }) {
  const b = BAND[band];
  return (
    <span
      className="t--1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 whitespace-nowrap"
      style={{ background: b.tint, color: C.ink }}
    >
      <span aria-hidden style={{ color: b.color }}>
        {b.mark}
      </span>
      {b.label}
      {detail && <span style={{ color: C.ink2 }}>· {detail}</span>}
    </span>
  );
}

/** Label, value, and either a status chip or a quiet sub-line. */
function StatTile({
  label,
  value,
  sub,
  band,
}: {
  label: string;
  value: string;
  sub?: string;
  band?: Band;
}) {
  return (
    <div className="rounded-xl border bg-white px-4 py-3 min-w-0" style={{ borderColor: C.grid }}>
      <p className="t--1 leading-tight" style={{ color: C.ink2 }}>
        {label}
      </p>
      {/* Proportional figures: a lone large number looks loose in tabular. */}
      <p className="t-3 font-semibold leading-tight mt-1" style={{ color: C.ink }}>
        {value}
      </p>
      {band && band !== "none" ? (
        <div className="mt-1.5">
          <BandBadge band={band} />
        </div>
      ) : sub ? (
        <p className="t--1 mt-1.5 leading-tight" style={{ color: C.muted }}>
          {sub}
        </p>
      ) : null}
    </div>
  );
}

/** A meter whose fill wears the status colour of the error rate it shows. */
function ErrorMeter({ label, pct }: { label: string; pct: number | null }) {
  const band = errorBand(pct);
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between gap-2">
        <span className="t--1" style={{ color: C.ink2 }}>
          {label}
        </span>
        <span className="t--1 font-semibold whitespace-nowrap" style={{ color: C.ink, fontVariantNumeric: "tabular-nums" }}>
          {pc(pct)} wrong
        </span>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ background: "#f0efec" }}>
        <div
          className="h-full rounded-full"
          style={{
            width: `${Math.max(0, Math.min(100, pct ?? 0))}%`,
            background: BAND[band].color,
          }}
        />
      </div>
      {band !== "none" && (
        <div>
          <BandBadge band={band} />
        </div>
      )}
    </div>
  );
}

/**
 * Error rate per session for one letter, oldest first.
 *
 * One series, so no legend: the card title names it. Thin 2px line, 8px
 * points ringed in the surface colour, solid hairlines at the engine's two
 * decision lines (dashed would read as a projection), first and last points
 * labelled and the rest left to the hover title and the table beneath.
 */
function ErrorSparkline({ series }: { series: number[] }) {
  const W = 320;
  const H = 110;
  const L = 34; // room for the 10% / 30% labels
  const R = 44; // room for the last value
  const T = 10;
  const B = 20;
  const top = Math.min(100, Math.max(40, Math.ceil(Math.max(...series) / 10) * 10));
  const x = (i: number) =>
    series.length === 1 ? L + (W - L - R) / 2 : L + (i * (W - L - R)) / (series.length - 1);
  const y = (v: number) => T + (1 - v / top) * (H - T - B);
  const path = series.map((v, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(v)}`).join(" ");
  const last = series[series.length - 1];

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      role="img"
      aria-label={`Share of answers wrong, by session: ${series.map((v) => `${Math.round(v)}%`).join(", ")}`}
      style={{ display: "block", overflow: "visible" }}
    >
      {/* Baseline and the engine's two decision lines. */}
      <line x1={L} x2={W - R} y1={y(0)} y2={y(0)} stroke="#c3c2b7" strokeWidth={1} />
      {[GOOD_BELOW_PCT, CRITICAL_ABOVE_PCT].map((t) =>
        t <= top ? (
          <g key={t}>
            <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke="#e1e0d9" strokeWidth={1} />
            <text x={L - 6} y={y(t) + 3.5} textAnchor="end" fontSize={10} fill={C.muted}>
              {t}%
            </text>
          </g>
        ) : null,
      )}
      <text x={L - 6} y={y(0) + 3.5} textAnchor="end" fontSize={10} fill={C.muted}>
        0
      </text>

      {series.length > 1 && (
        <path d={path} fill="none" stroke="#2a78d6" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      )}

      {series.map((v, i) => (
        <g key={i} tabIndex={0} aria-label={`Session ${i + 1}: ${Math.round(v)}% wrong`}>
          <title>{`Session ${i + 1}: ${Math.round(v)}% wrong`}</title>
          {/* The hit target is bigger than the mark. */}
          <circle cx={x(i)} cy={y(v)} r={12} fill="transparent" />
          <circle cx={x(i)} cy={y(v)} r={4} fill="#2a78d6" stroke="#ffffff" strokeWidth={2} />
        </g>
      ))}

      {/* Selective direct labels: where it started and where it is now. */}
      {series.length > 1 && (
        <text x={x(0)} y={y(series[0]) - 9} textAnchor="middle" fontSize={11} fill={C.ink2}>
          {Math.round(series[0])}%
        </text>
      )}
      <text x={x(series.length - 1) + 9} y={y(last) + 4} fontSize={12} fontWeight={600} fill={C.ink}>
        {Math.round(last)}%
      </text>

      <text x={L} y={H - 4} fontSize={10} fill={C.muted}>
        Session 1
      </text>
      {series.length > 1 && (
        <text x={W - R} y={H - 4} textAnchor="end" fontSize={10} fill={C.muted}>
          Session {series.length}
        </text>
      )}
    </svg>
  );
}

/**
 * All 33 consonants at a glance: the first thing the old report could not
 * show, because it only listed letters already practised.
 *
 * Each tile is tinted by the band of its most recent session's error rate —
 * the figure the engine acts on — with the band's mark in the corner, a tick
 * once mastered, and grey for not started. Every tile carries its full reading
 * as a label and tooltip.
 */
function LetterMap({
  stats,
  selected,
  onSelect,
}: {
  stats: Record<string, LetterStat>;
  selected: string | null;
  onSelect: (l: string) => void;
}) {
  return (
    <div className="grid grid-cols-6 sm:grid-cols-11 gap-1.5">
      {LETTER_SEQUENCE.map((l) => {
        const st = stats[l];
        const latest = st ? st.error_series[st.error_series.length - 1] ?? st.avg_error_rate_pct : null;
        const band = st ? errorBand(latest) : "none";
        const b = BAND[band];
        const reading = st
          ? `${l}: ${b.label.toLowerCase()}, ${pc(latest)} wrong in the latest session, ` +
            `${st.sessions_count} session${st.sessions_count === 1 ? "" : "s"}` +
            (st.mastered ? ", mastered" : "")
          : `${l}: not started`;
        const on = l === selected;
        return (
          <button
            key={l}
            onClick={() => st && onSelect(l)}
            disabled={!st}
            title={reading}
            aria-label={reading}
            aria-pressed={on}
            className="relative aspect-square rounded-lg border flex items-center justify-center transition-shadow disabled:cursor-default"
            style={{
              background: st ? b.tint : "#ffffff",
              borderColor: on ? C.ink : C.grid,
              borderWidth: on ? 2 : 1,
              borderBottomWidth: st ? 3 : 1,
              borderBottomColor: st ? b.color : C.grid,
            }}
          >
            <span
              className="letter-glyph font-semibold"
              style={{ color: st ? C.ink : "#c3c2b7", fontSize: "clamp(1rem, 3.2vw, 1.6rem)" }}
            >
              {l}
            </span>
            {st && (
              <span
                aria-hidden
                className="absolute top-0.5 right-1 leading-none"
                style={{ color: st.mastered ? C.good : b.color, fontSize: "0.7rem" }}
              >
                {st.mastered ? "✓" : b.mark}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function BandLegend() {
  const rows: [Band, string][] = [
    ["good", `under ${GOOD_BELOW_PCT}% wrong`],
    ["warning", `${GOOD_BELOW_PCT}–${CRITICAL_ABOVE_PCT}%`],
    ["critical", `over ${CRITICAL_ABOVE_PCT}%`],
  ];
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 t--1 mt-3" style={{ color: C.ink2 }}>
      {rows.map(([band, range]) => (
        <span key={band} className="inline-flex items-center gap-1">
          <span aria-hidden style={{ color: BAND[band].color }}>
            {BAND[band].mark}
          </span>
          <span style={{ color: C.ink }}>{BAND[band].label}</span>
          <span>{range}</span>
        </span>
      ))}
      <span className="inline-flex items-center gap-1">
        <span aria-hidden style={{ color: C.good }}>✓</span>
        <span style={{ color: C.ink }}>Mastered</span>
      </span>
      <span className="inline-flex items-center gap-1">
        <span aria-hidden style={{ color: "#c3c2b7" }}>○</span>
        <span style={{ color: C.ink }}>Not started</span>
      </span>
    </div>
  );
}

const SESSIONS_SHOWN = 6;

export function ReportScreen() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [report, setReport] = useState<ProgressReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [openSession, setOpenSession] = useState<string | null>(null);
  const [pickedLetter, setPickedLetter] = useState<string | null>(null);
  const [allSessions, setAllSessions] = useState(false);

  // Wait for auth to settle: building the report for "no one" first would
  // flash "No sessions recorded yet" before the child's own report arrived.
  const userId = user?.id ?? "offline";
  const metadataName = user?.user_metadata?.display_name as string | undefined;
  useEffect(() => {
    if (authLoading) return;
    let live = true;
    fetchProgressReport(userId, metadataName).then((r) => {
      if (!live) return;
      setReport(r);
      setLoading(false);
    });
    return () => {
      live = false;
    };
  }, [authLoading, userId, metadataName]);

  const practised = useMemo(
    () => (report ? LETTER_SEQUENCE.filter((l) => report.letter_stats[l]) : []),
    [report],
  );

  // Open on the letter practised most recently, which is what a parent asks
  // about first.
  useEffect(() => {
    if (pickedLetter || !report) return;
    const latest = report.sessions?.[0]?.letter;
    setPickedLetter(latest && report.letter_stats[latest] ? latest : practised[practised.length - 1] ?? null);
  }, [report, practised, pickedLetter]);

  if (loading) {
    return (
      <Screen>
        <div className="flex-1 flex items-center justify-center">
          <p className="t-1" style={{ color: C.ink2 }}>
            Building report…
          </p>
        </div>
      </Screen>
    );
  }

  if (!report || report.empty) {
    return (
      <Screen>
        <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6 text-center">
          <h1 className="t-2 font-semibold" style={{ color: C.ink }}>
            No sessions recorded yet
          </h1>
          <p className="t-0 max-w-md" style={{ color: C.ink2 }}>
            Once a letter has been practised, this shows accuracy, response
            times and which letters were confused with which.
          </p>
          <button
            onClick={() => navigate("/roadmap")}
            className="t-0 rounded-xl bg-[#4A90E2] px-5 py-2.5 font-semibold text-white"
          >
            Go to the roadmap
          </button>
        </div>
      </Screen>
    );
  }

  const { letter_stats, total_sessions, letters_mastered, totals, ai_insights } = report;
  const sessions = report.sessions ?? [];
  const attempts = totals?.attempts ?? 0;
  const gross = totals?.gross_shape;
  const feature = totals?.feature_level;
  const stoppedEarly = sessions.filter((s) => s.status === "abandoned").length;

  // Sessions written before the session model existed carry no activity detail.
  const legacyOnly = total_sessions > 0 && sessions.length === 0;

  const unaidedPct = attempts > 0 ? ((totals?.true_wins ?? 0) / attempts) * 100 : null;

  const confusions = Object.entries(
    practised.reduce<Record<string, number>>((acc, l) => {
      Object.entries(letter_stats[l].confusion_counts).forEach(([k, v]) => {
        acc[k] = (acc[k] ?? 0) + v;
      });
      return acc;
    }, {}),
  ).sort((a, b) => b[1] - a[1]);
  const topConfusion = confusions[0]?.[1] ?? 1;

  let reading: string | null = null;
  if (
    gross?.error_pct != null &&
    feature?.error_pct != null &&
    gross.attempts >= 4 &&
    feature.attempts >= 4
  ) {
    const diff = feature.error_pct - gross.error_pct;
    reading =
      diff > 15
        ? "Errors concentrate on look-alike letters — fine detail, not overall shape."
        : diff < -15
          ? "Errors occur even against distinct letters — the overall shape is not yet secure."
          : "Errors are spread evenly across distinct and look-alike letters.";
  }

  const sel: LetterStat | null = pickedLetter ? letter_stats[pickedLetter] ?? null : null;
  const selStage = sel ? STAGE[sel.last_cognitive_state] ?? STAGE.insufficient_data : null;
  const selLatest = sel ? sel.error_series[sel.error_series.length - 1] ?? sel.avg_error_rate_pct : null;
  const selConfusions = sel
    ? Object.entries(sel.confusion_counts).sort((a, b) => b[1] - a[1]).slice(0, 4)
    : [];

  const latest = sessions[0] ?? null;
  const targeting = sessions.find((s) => s.targeted.length > 0) ?? null;
  const shownSessions = allSessions ? sessions : sessions.slice(0, SESSIONS_SHOWN);

  return (
    <div
      className="h-[100dvh] overflow-y-auto print:h-auto print:overflow-visible"
      style={{ background: "#F7F6F2" }}
    >
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-10 border-b bg-white/95 backdrop-blur print:hidden"
        style={{ borderColor: C.grid }}
      >
        <div className="mx-auto w-full max-w-6xl flex items-center gap-2 px-3 py-2">
          <button
            onClick={() => navigate(-1)}
            aria-label="Go back"
            className="rounded-lg p-1.5 hover:bg-gray-100"
            style={{ color: C.ink2 }}
          >
            <ArrowLeft size={18} />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="t-1 font-semibold leading-tight truncate" style={{ color: C.ink }}>
              {report.display_name} · learning report
            </h1>
            <p className="t--1 leading-tight truncate" style={{ color: C.muted }}>
              {report.assessment_window?.first
                ? `${day(report.assessment_window.first)}–${day(report.assessment_window.last)}`
                : "No dates yet"}
              {/* A device-only report may be missing sessions played elsewhere.
                  Say so, or an adult reads a partial record as the whole one. */}
              {report.data_source === "device" && " · saved on this device only"}
            </p>
          </div>
          <button
            onClick={() => window.print()}
            className="t--1 shrink-0 inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 font-semibold hover:bg-gray-50"
            style={{ borderColor: C.grid, color: C.ink2 }}
          >
            <Download size={14} />
            <span className="hidden sm:inline">Download</span>
          </button>
        </div>
      </header>

      <main
        className="mx-auto w-full max-w-6xl grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 print:hidden"
        style={{ padding: "var(--pad-screen)" }}
      >
        {legacyOnly && (
          <p
            className="col-span-full t--1 rounded-lg border px-3 py-2"
            style={{ borderColor: C.grid, background: "#fffdf7", color: C.ink2 }}
          >
            These {total_sessions} session{total_sessions === 1 ? "" : "s"} were
            recorded by an earlier version that did not store activity detail.
            Practise a letter to populate the session list.
          </p>
        )}

        {/* ── Headline figures ─────────────────────────────────────────── */}
        <div className="col-span-full grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <StatTile
            label="Correct without help"
            value={pc(unaidedPct)}
            band={unaidedPct === null ? undefined : errorBand(100 - unaidedPct)}
          />
          <StatTile label="Letters mastered" value={`${letters_mastered} / ${LETTER_SEQUENCE.length}`} sub={`${practised.length} practised`} />
          <StatTile
            label="Sessions"
            value={String(total_sessions)}
            sub={stoppedEarly > 0 ? `${stoppedEarly} stopped early` : "none stopped early"}
          />
          <StatTile label="Typical response" value={secs(totals?.latency_median_ms)} sub="median, unaided answers" />
          <StatTile
            label="Answer supplied"
            value={pc(totals?.rescue_pct)}
            sub={`of ${attempts} question${attempts === 1 ? "" : "s"}`}
          />
        </div>

        {/* ── All letters ──────────────────────────────────────────────── */}
        <Card title="All 33 letters" className="md:col-span-2" aside={
          <span className="t--1" style={{ color: C.muted }}>tap a letter</span>
        }>
          <LetterMap stats={letter_stats} selected={pickedLetter} onSelect={setPickedLetter} />
          <BandLegend />
        </Card>

        {/* ── One letter in detail ─────────────────────────────────────── */}
        <Card
          title={pickedLetter ? `Letter ${pickedLetter}` : "Letter detail"}
          className="xl:row-span-2"
          aside={sel ? <BandBadge band={errorBand(selLatest)} /> : undefined}
        >
          {sel && selStage ? (
            <div className="flex flex-col gap-3">
              <div className="flex items-baseline gap-3">
                <span className="letter-glyph glyph-lg font-semibold" style={{ color: C.ink }}>
                  {pickedLetter}
                </span>
                <div className="min-w-0">
                  <p className="t-0 font-semibold" style={{ color: C.ink }}>
                    <span aria-hidden style={{ color: selStage.color }}>{selStage.mark}</span> {selStage.label}
                    {sel.mastered && <span style={{ color: C.good }}> · ✓ mastered</span>}
                  </p>
                  <p className="t--1" style={{ color: C.ink2 }}>
                    {sel.trend === "improving"
                      ? "Getting better: fewer mistakes in recent sessions"
                      : sel.trend === "needs attention"
                        ? "More mistakes in recent sessions than earlier"
                        : sel.error_series.length >= 2
                          ? "Holding steady"
                          : "One session so far"}
                  </p>
                </div>
              </div>

              {sel.error_series.length > 0 && (
                <div>
                  <p className="t--1 mb-1" style={{ color: C.ink2 }}>
                    Share of answers wrong, each session
                  </p>
                  <ErrorSparkline series={sel.error_series} />
                  {/* The table twin: every value readable without hovering. */}
                  <table className="w-full t--1 mt-2" style={{ color: C.ink2 }}>
                    <tbody>
                      {sel.error_series.map((v, i) => (
                        <tr key={i} className="border-t" style={{ borderColor: C.grid }}>
                          <td className="py-0.5">Session {i + 1}</td>
                          <td className="py-0.5 text-right" style={{ color: C.ink, fontVariantNumeric: "tabular-nums" }}>
                            {Math.round(v)}% wrong
                          </td>
                          <td className="py-0.5 pl-2 w-6 text-right" aria-label={BAND[errorBand(v)].label}>
                            <span style={{ color: BAND[errorBand(v)].color }}>{BAND[errorBand(v)].mark}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <dl className="grid grid-cols-1 gap-y-1 t--1" style={{ color: C.ink2 }}>
                <Row k="Sessions" v={String(sel.sessions_count)} />
                <Row k="Correct without help" v={sel.total_attempts > 0 ? `${sel.true_wins} of ${sel.total_attempts}` : "—"} />
                <Row k="Answer given by app" v={pc(sel.rescue_pct)} />
                <Row k="Typical response" v={secs(sel.latency_median_ms)} />
                <Row k="Distinct letters" v={sel.gross_shape.attempts ? `${pc(sel.gross_shape.error_pct)} wrong` : "—"} />
                <Row k="Look-alike letters" v={sel.feature_level.attempts ? `${pc(sel.feature_level.error_pct)} wrong` : "—"} />
                <Row k="First practised" v={day(sel.first_practised)} />
                <Row k="Last practised" v={day(sel.last_practised)} />
              </dl>

              {selConfusions.length > 0 && (
                <div>
                  <p className="t--1 mb-1" style={{ color: C.ink2 }}>
                    Mistaken for
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {selConfusions.map(([pair, n]) => (
                      <span
                        key={pair}
                        className="inline-flex items-center gap-1 rounded-lg border px-2 py-0.5"
                        style={{ borderColor: C.grid }}
                      >
                        <span className="letter-glyph glyph-md font-semibold" style={{ color: C.ink }}>
                          {pair.split("→")[1]}
                        </span>
                        <span className="t--1" style={{ color: C.ink2 }}>{n}×</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {ai_insights.letter_insights[pickedLetter!] && (
                <p className="t--1 leading-snug rounded-lg px-3 py-2" style={{ background: "#f6f6f3", color: C.ink2 }}>
                  {ai_insights.letter_insights[pickedLetter!]}
                </p>
              )}
            </div>
          ) : (
            <p className="t--1" style={{ color: C.muted }}>
              Tap a practised letter to see its detail.
            </p>
          )}
        </Card>

        {/* ── Confusions ───────────────────────────────────────────────── */}
        <Card title="Letters confused">
          {confusions.length === 0 ? (
            <p className="t--1" style={{ color: C.muted }}>None recorded.</p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {confusions.slice(0, 7).map(([pair, n]) => {
                const [a, b] = pair.split("→");
                return (
                  <li
                    key={pair}
                    className="grid items-center gap-3"
                    style={{ gridTemplateColumns: "auto 1fr auto" }}
                    title={`${a} read as ${b}, ${n} time${n === 1 ? "" : "s"}`}
                  >
                    {/* Its own column, sized to the glyphs: a fixed width let
                        the bar run over the second letter. */}
                    <span className="inline-flex items-center gap-1 whitespace-nowrap">
                      <span className="letter-glyph t-1 font-semibold" style={{ color: C.ink }}>{a}</span>
                      <span className="t--1" style={{ color: C.muted }}>→</span>
                      <span className="letter-glyph t-1 font-semibold" style={{ color: C.ink }}>{b}</span>
                    </span>
                    <span className="h-2 rounded-full overflow-hidden" style={{ background: "#f0efec" }}>
                      <span className="block h-full rounded-full" style={{ width: `${(n / topConfusion) * 100}%`, background: "#2a78d6" }} />
                    </span>
                    <span className="t--1 font-semibold text-right" style={{ color: C.ink, fontVariantNumeric: "tabular-nums" }}>
                      {n}×
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
          {targeting && (
            <p className="t--1 leading-snug mt-3 pt-3 border-t" style={{ borderColor: C.grid, color: C.ink2 }}>
              The {day(targeting.started_at)} session on{" "}
              <span className="letter-glyph font-semibold" style={{ color: C.ink }}>{targeting.letter}</span>{" "}
              deliberately included{" "}
              {targeting.targeted.map((l, i) => (
                <span key={l}>
                  <span className="letter-glyph font-semibold" style={{ color: C.ink }}>{l}</span>
                  {i < targeting.targeted.length - 1 ? ", " : ""}
                </span>
              ))}{" "}
              — letters this child mixes up with it.
            </p>
          )}
        </Card>

        {/* ── Strengths and focus ──────────────────────────────────────── */}
        <Card title="Strengths and focus">
          <p className="t--1 font-semibold mb-1" style={{ color: C.ink }}>Going well</p>
          {ai_insights.strengths.length > 0 ? (
            <ul className="t--1 leading-snug flex flex-col gap-1 mb-3" style={{ color: C.ink2 }}>
              {ai_insights.strengths.map((s) => (
                <li key={s} className="flex gap-1.5"><span aria-hidden style={{ color: C.good }}>✓</span>{s}</li>
              ))}
            </ul>
          ) : (
            <p className="t--1 mb-3" style={{ color: C.muted }}>Nothing measurable yet.</p>
          )}
          <p className="t--1 font-semibold mb-1" style={{ color: C.ink }}>To work on</p>
          <ul className="t--1 leading-snug flex flex-col gap-1" style={{ color: C.ink2 }}>
            {ai_insights.focus_areas.map((s) => (
              <li key={s} className="flex gap-1.5"><span aria-hidden style={{ color: C.ink2 }}>→</span>{s}</li>
            ))}
          </ul>
        </Card>

        {/* ── Where errors occur ───────────────────────────────────────── */}
        <Card title="Where errors occur">
          {gross && feature && attempts > 0 ? (
            <div className="flex flex-col gap-3">
              <ErrorMeter label="Against distinct letters (overall shape)" pct={gross.error_pct} />
              <ErrorMeter label="Against look-alike letters (fine detail)" pct={feature.error_pct} />
              {reading && (
                <p className="t--1 leading-snug" style={{ color: C.ink2 }}>{reading}</p>
              )}
            </div>
          ) : (
            <p className="t--1" style={{ color: C.muted }}>Not enough questions answered yet.</p>
          )}
        </Card>

        {/* ── What the app is doing ────────────────────────────────────── */}
        <Card title="What the app is doing" className="md:col-span-2">
          {latest ? (
            <div className="flex flex-col gap-2 t--1 leading-snug" style={{ color: C.ink2 }}>
              <p>
                <span className="font-semibold" style={{ color: C.ink }}>Latest session</span> ·{" "}
                <span className="letter-glyph font-semibold" style={{ color: C.ink }}>{latest.letter}</span> ·{" "}
                {day(latest.started_at)} · {mins(latest.duration_ms)}
              </p>
              {latest.plan_reasoning && (
                <p>
                  <span className="font-semibold" style={{ color: C.ink }}>How it was set up: </span>
                  {readableReasoning(latest.plan_reasoning)}
                </p>
              )}
              {latest.diagnosis && (
                <p>
                  <span className="font-semibold" style={{ color: C.ink }}>What it concluded: </span>
                  {readableReasoning(latest.diagnosis)}
                </p>
              )}
            </div>
          ) : (
            <p className="t--1" style={{ color: C.muted }}>No session detail recorded yet.</p>
          )}
        </Card>

        {/* ── Sessions ─────────────────────────────────────────────────── */}
        <Card
          title="Sessions"
          className="col-span-full"
          aside={<span className="t--1" style={{ color: C.muted }}>newest first</span>}
        >
          {sessions.length === 0 ? (
            <p className="t--1" style={{ color: C.muted }}>No sessions with activity detail yet.</p>
          ) : (
            <>
              <ul className="grid grid-cols-1 lg:grid-cols-2 gap-1.5">
                {shownSessions.map((s) => (
                  <SessionRow
                    key={s.session_id}
                    s={s}
                    open={openSession === s.session_id}
                    onToggle={() => setOpenSession(openSession === s.session_id ? null : s.session_id)}
                  />
                ))}
              </ul>
              {sessions.length > SESSIONS_SHOWN && (
                <button
                  onClick={() => setAllSessions((v) => !v)}
                  className="t--1 font-semibold mt-2 rounded-lg px-2 py-1 hover:bg-gray-50"
                  style={{ color: C.ink2 }}
                >
                  {allSessions ? "Show fewer" : `Show all ${sessions.length}`}
                </button>
              )}
            </>
          )}
        </Card>

        <p className="col-span-full t--1 leading-snug" style={{ color: C.muted }}>
          A practice and adaptation tool, <strong>not a diagnostic instrument</strong> —
          not normed, and with no validated cut-off scores. The colours mark the
          engine's own decision lines: under {GOOD_BELOW_PCT}% wrong it treats a
          letter as mastered, over {CRITICAL_ABOVE_PCT}% as needing support.
        </p>
      </main>

      {/* The download is the long-form document: everything, in full. */}
      <PrintReport report={report} sessions={sessions} confusions={confusions} />
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-2">
      <dt>{k}</dt>
      <dd style={{ color: C.ink, fontVariantNumeric: "tabular-nums" }}>{v}</dd>
    </div>
  );
}

function SessionRow({
  s,
  open,
  onToggle,
}: {
  s: SessionSummary;
  open: boolean;
  onToggle: () => void;
}) {
  const statusColor =
    s.status === "completed" ? C.good : s.status === "abandoned" ? C.serious : C.muted;
  const statusLabel =
    s.status === "completed" ? "Completed" : s.status === "abandoned" ? "Stopped early" : "In progress";

  return (
    <li className="rounded-lg border" style={{ borderColor: C.grid }}>
      <button onClick={onToggle} className="w-full flex items-center gap-2 px-2.5 py-2 text-left">
        <span className="letter-glyph glyph-md font-semibold shrink-0" style={{ color: C.ink }}>
          {s.letter}
        </span>
        <span className="min-w-0 flex-1">
          <span className="t--1 block truncate" style={{ color: C.ink }}>
            {day(s.started_at)} · {clock(s.started_at)} · {mins(s.duration_ms)}
          </span>
          <span className="t--1 block truncate" style={{ color: C.muted }}>
            {s.activities_done}/{s.activities_total} activities · {s.attempts} question
            {s.attempts === 1 ? "" : "s"}
          </span>
        </span>
        <span className="shrink-0 text-right">
          <span
            className="t--1 font-semibold block"
            style={{ color: C.ink, fontVariantNumeric: "tabular-nums" }}
          >
            {pc(s.accuracy_pct)}
          </span>
          <span className="t--1 inline-flex items-center gap-1" style={{ color: statusColor }}>
            <span aria-hidden>●</span>
            <span style={{ color: C.muted }}>{statusLabel}</span>
          </span>
        </span>
      </button>

      {open && (
        <div className="px-2.5 pb-2.5 border-t pt-2" style={{ borderColor: C.grid }}>
          <div className="flex flex-wrap gap-1 mb-2">
            {s.completed.map((a) => (
              <span
                key={a}
                className="t--1 rounded px-1.5 py-0.5"
                style={{ background: "#f3f3f0", color: C.ink2 }}
              >
                {ACTIVITY_LABEL[a] ?? a}
              </span>
            ))}
          </div>
          <dl className="grid grid-cols-2 sm:grid-cols-4 gap-x-3 gap-y-0.5 t--1" style={{ color: C.ink2 }}>
            <Row k="Unaided" v={`${s.true_wins}/${s.attempts}`} />
            <Row k="Supplied" v={pc(s.rescue_pct)} />
            <Row k="Typical" v={secs(s.latency_median_ms)} />
            {s.tracing_score !== null && <Row k="Tracing" v={`${s.tracing_score}%`} />}
            {s.memory_moves !== null && <Row k="Matching" v={`${s.memory_moves} moves`} />}
          </dl>
          {Object.keys(s.confusions).length > 0 && (
            <p className="t--1 mt-1.5 flex flex-wrap items-center gap-1.5" style={{ color: C.ink2 }}>
              Read as:
              {Object.entries(s.confusions).map(([pair, n]) => (
                <span key={pair} className="inline-flex items-center gap-0.5">
                  <span className="letter-glyph glyph-md font-semibold" style={{ color: C.lookalike }}>
                    {pair.split("→")[1]}
                  </span>
                  <span style={{ color: C.muted }}>{n}×</span>
                </span>
              ))}
            </p>
          )}
        </div>
      )}
    </li>
  );
}

/**
 * The downloadable document. Hidden on screen, laid out in full on paper: this
 * is where the text-heavy detail belongs, so the screen can stay scannable.
 */
function PrintReport({
  report,
  sessions,
  confusions,
}: {
  report: ProgressReport;
  sessions: SessionSummary[];
  confusions: [string, number][];
}) {
  const t = report.totals;
  return (
    <div className="hidden print:block t-0" style={{ color: C.ink2 }}>
      <h1 className="t-2 font-semibold mb-1" style={{ color: C.ink }}>
        Letter recognition report — {report.display_name}
      </h1>
      <p className="mb-3">
        {report.total_sessions} session{report.total_sessions === 1 ? "" : "s"}
        {report.assessment_window?.first
          ? ` recorded between ${day(report.assessment_window.first)} and ${day(report.assessment_window.last)}`
          : ""}
        . Generated {day(report.generated_at)}.
      </p>

      <h2 className="font-semibold mt-3 mb-1" style={{ color: C.ink }}>
        How to read this report
      </h2>
      <p className="leading-relaxed mb-3">
        This records how reliably {report.display_name} matched a spoken
        Devanagari letter to its written form, how long each response took, and
        which letters were mistaken for which. It is a practice and adaptation
        tool, <strong>not a diagnostic instrument</strong>: the figures are not
        normed against an age-matched sample and there are no validated cut-off
        scores. Use them to guide practice and conversation, not to confirm or
        rule out a learning difficulty. Stages are assigned by fixed error-rate
        thresholds — above 30% of answers incorrect, or below 10% — not by a
        predictive model. “Answer supplied” counts questions the app answered
        after the child paused, a measure of how often they could not reach the
        answer unaided.
      </p>

      <h2 className="font-semibold mt-3 mb-1" style={{ color: C.ink }}>
        Summary
      </h2>
      <ul className="mb-3">
        <li>Questions answered: {t?.attempts ?? 0}</li>
        <li>
          Correct unaided: {t?.true_wins ?? 0}
          {t && t.attempts > 0 ? ` (${Math.round((t.true_wins / t.attempts) * 100)}%)` : ""}
        </li>
        <li>Answer supplied: {t?.guided_wins ?? 0} ({pc(t?.rescue_pct)})</li>
        <li>Typical response time: {secs(t?.latency_median_ms)}</li>
        <li>
          Errors against distinct letters: {t?.gross_shape.errors ?? 0} of{" "}
          {t?.gross_shape.attempts ?? 0} ({pc(t?.gross_shape.error_pct)})
        </li>
        <li>
          Errors against look-alike letters: {t?.feature_level.errors ?? 0} of{" "}
          {t?.feature_level.attempts ?? 0} ({pc(t?.feature_level.error_pct)})
        </li>
      </ul>

      {confusions.length > 0 && (
        <>
          <h2 className="font-semibold mt-3 mb-1" style={{ color: C.ink }}>
            Confusions
          </h2>
          <ul className="mb-3">
            {confusions.map(([pair, n]) => (
              <li key={pair}>
                {pair.split("→")[0]} read as {pair.split("→")[1]} — {n} time
                {n === 1 ? "" : "s"}
              </li>
            ))}
          </ul>
        </>
      )}

      {sessions.length > 0 && (
        <>
          <h2 className="font-semibold mt-3 mb-1" style={{ color: C.ink }}>
            Session log
          </h2>
          <table className="w-full border-collapse t--1">
            <thead>
              <tr className="border-b" style={{ borderColor: C.grid }}>
                <th className="text-left py-1">Date</th>
                <th className="text-left py-1">Letter</th>
                <th className="text-left py-1">Duration</th>
                <th className="text-left py-1">Activities</th>
                <th className="text-left py-1">Unaided</th>
                <th className="text-left py-1">Supplied</th>
                <th className="text-left py-1">Status</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((s) => (
                <tr key={s.session_id} className="border-b" style={{ borderColor: C.grid }}>
                  <td className="py-1">
                    {day(s.started_at)} {clock(s.started_at)}
                  </td>
                  <td className="py-1">{s.letter}</td>
                  <td className="py-1">{mins(s.duration_ms)}</td>
                  <td className="py-1">
                    {s.activities_done}/{s.activities_total}
                  </td>
                  <td className="py-1">
                    {s.true_wins}/{s.attempts}
                  </td>
                  <td className="py-1">{pc(s.rescue_pct)}</td>
                  <td className="py-1">{s.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      <h2 className="font-semibold mt-3 mb-1" style={{ color: C.ink }}>
        What the stages mean
      </h2>
      <ul>
        <li>Just started — no completed questions for this letter yet.</li>
        <li>
          Learning the shape — still mistaking the letter for visually distinct
          ones; practice stays on tracing and easy contrasts.
        </li>
        <li>
          Learning fine detail — recognises the overall shape but confuses it
          with look-alike letters; practice targets the distinguishing feature.
        </li>
        <li>
          Mastered — reliably picked out among its closest look-alikes with no
          visual support.
        </li>
      </ul>
    </div>
  );
}
