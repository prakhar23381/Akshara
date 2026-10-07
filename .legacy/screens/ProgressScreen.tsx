import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, Printer } from "lucide-react";
import { Screen } from "../components/Screen";
import {
  fetchProgressReport,
  type ProgressReport,
  type LetterStat,
} from "../api/client";
import { LETTER_SEQUENCE } from "../types/levelConfig";

/* Two categorical slots validated against this app's surface #F7F6F2:
   worst-pair CVD ΔE 24.7, normal-vision ΔE 33.6. Orange is 2.96:1 against the
   surface, so every value it encodes also carries a visible number.

   Error magnitude uses one hue and encodes by bar length, never a red/amber/
   green scale — there are no validated cut-off scores here, so colouring 30%
   as "red" would assert a threshold this tool has not established. */
const C = {
  distinct: "#2a78d6",
  lookalike: "#eb6834",
  ink: "#0b0b0b",
  ink2: "#52514e",
  muted: "#898781",
  grid: "#e1e0d9",
  good: "#0ca30c",
  warn: "#fab219",
  serious: "#ec835a",
};

const STAGE: Record<string, { label: string; short: string; color: string; mark: string }> = {
  insufficient_data: { label: "Just started", short: "New", color: C.muted, mark: "○" },
  gross_shape_blindness: { label: "Learning the shape", short: "Shape", color: C.serious, mark: "◔" },
  feature_neglect: { label: "Learning fine detail", short: "Detail", color: C.warn, mark: "◑" },
  visual_mastery: { label: "Mastered", short: "Mastered", color: C.good, mark: "●" },
};

const d = (iso?: string | null) => {
  if (!iso) return "—";
  const x = new Date(iso);
  return Number.isNaN(x.getTime())
    ? "—"
    : x.toLocaleDateString(undefined, { day: "numeric", month: "short" });
};
const secs = (ms?: number | null) =>
  typeof ms === "number" ? `${(ms / 1000).toFixed(1)}s` : "—";
const pc = (v?: number | null) =>
  typeof v === "number" ? `${Math.round(v)}%` : "—";

function Tile({ value, label }: { value: string; label: string }) {
  return (
    <div
      className="rounded-xl border bg-white px-3 py-2 flex flex-col justify-center min-w-0"
      style={{ borderColor: C.grid }}
    >
      <p
        className="t-2 font-semibold leading-none truncate"
        style={{ color: C.ink, fontVariantNumeric: "tabular-nums" }}
      >
        {value}
      </p>
      <p className="t--1 mt-1 leading-tight" style={{ color: C.ink2 }}>
        {label}
      </p>
    </div>
  );
}

function Panel({
  title,
  children,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-xl border bg-white p-3 flex flex-col min-h-0 ${className}`}
      style={{ borderColor: C.grid }}
    >
      <h2 className="t-0 font-semibold mb-2 shrink-0" style={{ color: C.ink }}>
        {title}
      </h2>
      <div className="flex-1 min-h-0 flex flex-col">{children}</div>
    </section>
  );
}

function Bar({ label, value, n, of, color }: {
  label: string; value: number | null; n: number; of: number; color: string;
}) {
  return (
    <div className="flex items-center gap-2 min-w-0">
      <span className="t--1 w-24 shrink-0 truncate" style={{ color: C.ink2 }}>
        {label}
      </span>
      <span
        className="flex-1 h-2 rounded-sm overflow-hidden min-w-0"
        style={{ background: C.grid }}
      >
        <span
          className="block h-full rounded-r-sm"
          style={{ width: `${Math.max(0, Math.min(100, value ?? 0))}%`, background: color }}
        />
      </span>
      <span
        className="t--1 font-semibold w-9 text-right shrink-0"
        style={{ color: C.ink, fontVariantNumeric: "tabular-nums" }}
      >
        {pc(value)}
      </span>
      <span className="t--1 w-12 text-right shrink-0" style={{ color: C.muted }}>
        {n}/{of}
      </span>
    </div>
  );
}

function Spark({ series }: { series: number[] }) {
  if (series.length < 2) return null;
  const w = 64, h = 18, p = 2;
  const max = Math.max(...series, 100);
  const x = (i: number) => p + (i * (w - p * 2)) / (series.length - 1);
  const y = (v: number) => p + (1 - v / max) * (h - p * 2);
  const delta = series[series.length - 1] - series[0];
  return (
    <span className="inline-flex items-center gap-1.5">
      <svg width={w} height={h} role="img"
        aria-label={`Error rate over ${series.length} sessions: ${series.map(v=>Math.round(v)+"%").join(", ")}`}>
        <polyline points={series.map((v, i) => `${x(i)},${y(v)}`).join(" ")}
          fill="none" stroke={C.distinct} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={x(series.length - 1)} cy={y(series[series.length - 1])} r={2.5}
          fill={C.distinct} stroke="#fff" strokeWidth={1.5} />
      </svg>
      <span className="t--1 font-semibold" style={{ color: delta < 0 ? "#006300" : C.ink2 }}>
        {delta < 0 ? "↓" : delta > 0 ? "↑" : "→"}{Math.abs(Math.round(delta))}
      </span>
    </span>
  );
}

export function ProgressScreen() {
  const navigate = useNavigate();
  const [report, setReport] = useState<ProgressReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [picked, setPicked] = useState<string | null>(null);

  useEffect(() => {
    fetchProgressReport().then((r) => {
      setReport(r);
      setLoading(false);
    });
  }, []);

  const practised = useMemo(
    () => (report ? LETTER_SEQUENCE.filter((l) => report.letter_stats[l]) : []),
    [report],
  );

  useEffect(() => {
    if (!picked && practised.length) setPicked(practised[practised.length - 1]);
  }, [practised, picked]);

  if (loading) {
    return (
      <Screen>
        <div className="flex-1 min-h-0 flex items-center justify-center">
          <p className="t-1" style={{ color: C.ink2 }}>Building report…</p>
        </div>
      </Screen>
    );
  }

  if (!report || report.empty) {
    return (
      <Screen>
        <div className="flex-1 min-h-0 flex flex-col items-center justify-center gap-4 p-6 text-center">
          <h1 className="t-2 font-semibold" style={{ color: C.ink }}>
            No sessions recorded yet
          </h1>
          <p className="t-0 max-w-md" style={{ color: C.ink2 }}>
            Once a letter has been practised, this page shows accuracy, response
            times and which letters were confused with which.
          </p>
          <button onClick={() => navigate("/roadmap")}
            className="t-0 rounded-xl bg-[#4A90E2] px-5 py-2.5 font-semibold text-white">
            Go to the roadmap
          </button>
        </div>
      </Screen>
    );
  }

  const { letter_stats, total_sessions, letters_mastered, totals } = report;
  const gross = totals?.gross_shape;
  const feature = totals?.feature_level;
  const attempts = totals?.attempts ?? 0;

  // Sessions written by an older build carry no question-level detail. Saying
  // so plainly is better than a grid of dashes that reads as a broken page.
  const noDetail = total_sessions > 0 && attempts === 0;

  const confusions = Object.entries(
    practised.reduce<Record<string, number>>((acc, l) => {
      Object.entries(letter_stats[l].confusion_counts).forEach(([k, v]) => {
        acc[k] = (acc[k] ?? 0) + v;
      });
      return acc;
    }, {}),
  ).sort((a, b) => b[1] - a[1]);

  // One deterministic sentence instead of generated prose: same data always
  // yields the same wording, which is what a clinical artifact needs.
  let reading: string | null = null;
  if (gross?.error_pct != null && feature?.error_pct != null && gross.attempts >= 4 && feature.attempts >= 4) {
    const diff = feature.error_pct - gross.error_pct;
    reading =
      diff > 15
        ? "Errors concentrate on look-alike letters — fine detail, not overall shape."
        : diff < -15
          ? "Errors occur even against distinct letters — the overall shape is not yet secure."
          : "Errors are spread evenly across distinct and look-alike letters.";
  }

  const sel: LetterStat | null = picked ? letter_stats[picked] : null;
  const selStage = sel ? STAGE[sel.last_cognitive_state] ?? STAGE.insufficient_data : null;
  const selConf = sel
    ? Object.entries(sel.confusion_counts).sort((a, b) => b[1] - a[1]).slice(0, 3)
    : [];

  return (
    <Screen>
      {/* Header */}
      <header
        className="shrink-0 flex items-center gap-2 border-b bg-white px-3 py-2 print:hidden"
        style={{ borderColor: C.grid }}
      >
        <button onClick={() => navigate(-1)} aria-label="Go back"
          className="rounded-lg p-1.5 hover:bg-gray-100" style={{ color: C.ink2 }}>
          <ArrowLeft size={18} />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="t-0 font-semibold leading-tight truncate" style={{ color: C.ink }}>
            Letter recognition report
          </h1>
          <p className="t--1 leading-tight truncate" style={{ color: C.muted }}>
            {report.display_name} · {total_sessions} session
            {total_sessions === 1 ? "" : "s"}
            {report.assessment_window?.first
              ? ` · ${d(report.assessment_window.first)}–${d(report.assessment_window.last)}`
              : ""}
            {" · "}{letters_mastered}/{LETTER_SEQUENCE.length} mastered
          </p>
        </div>
        <button onClick={() => window.print()}
          className="t--1 shrink-0 inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 font-semibold hover:bg-gray-50"
          style={{ borderColor: C.grid, color: C.ink2 }}>
          <Printer size={14} /> <span className="hidden sm:inline">Print</span>
        </button>
      </header>

      {/* Body — fits the viewport; nothing here scrolls */}
      <div
        className="flex-1 min-h-0 flex flex-col print:overflow-visible print:h-auto"
        style={{ gap: "var(--gap-screen)", padding: "var(--pad-screen)" }}
      >
        {noDetail && (
          <p className="t--1 shrink-0 rounded-lg border px-3 py-2"
            style={{ borderColor: C.grid, background: "#fffdf7", color: C.ink2 }}>
            These {total_sessions} session{total_sessions === 1 ? "" : "s"} were
            recorded by an earlier version that did not store question-level
            detail. Practise a letter to populate the figures below.
          </p>
        )}

        {/* Headline numbers */}
        <div className="shrink-0 grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Tile value={String(attempts)} label="Questions answered" />
          <Tile
            value={attempts > 0 ? `${Math.round(((totals?.true_wins ?? 0) / attempts) * 100)}%` : "—"}
            label="Correct unaided"
          />
          <Tile value={pc(totals?.rescue_pct)} label="Answer supplied" />
          <Tile value={secs(totals?.latency_median_ms)} label="Typical response" />
        </div>

        {/* Two panels, side by side when there is width */}
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 gap-2 print:grid-cols-1">
          <Panel title="Where errors occur">
            {gross && feature && attempts > 0 ? (
              <div className="flex flex-col gap-2">
                <Bar label="Distinct letters" value={gross.error_pct}
                  n={gross.errors} of={gross.attempts} color={C.distinct} />
                <Bar label="Look-alike letters" value={feature.error_pct}
                  n={feature.errors} of={feature.attempts} color={C.lookalike} />
                {reading && (
                  <p className="t--1 mt-1 leading-snug" style={{ color: C.ink2 }}>
                    {reading}
                  </p>
                )}
              </div>
            ) : (
              <p className="t--1" style={{ color: C.muted }}>
                Not enough questions answered yet.
              </p>
            )}

            {/* Confusions, as the actual letterforms */}
            <h3 className="t-0 font-semibold mt-3 mb-1.5 shrink-0" style={{ color: C.ink }}>
              Letters confused
            </h3>
            {confusions.length === 0 ? (
              <p className="t--1" style={{ color: C.muted }}>None recorded.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5 overflow-hidden">
                {confusions.slice(0, 6).map(([pair, n]) => {
                  const [a, b] = pair.split("→");
                  return (
                    <span key={pair}
                      className="inline-flex items-center gap-1 rounded-lg border px-2 py-1"
                      style={{ borderColor: C.grid }}>
                      <span className="letter-glyph glyph-md font-semibold" style={{ color: C.ink }}>{a}</span>
                      <span className="t--1" style={{ color: C.muted }}>→</span>
                      <span className="letter-glyph glyph-md font-semibold" style={{ color: C.lookalike }}>{b}</span>
                      <span className="t--1 font-semibold" style={{ color: C.ink2 }}>{n}×</span>
                    </span>
                  );
                })}
                {confusions.length > 6 && (
                  <span className="t--1 self-center" style={{ color: C.muted }}>
                    +{confusions.length - 6} more
                  </span>
                )}
              </div>
            )}
          </Panel>

          <Panel title="Letters practised">
            {/* Chips: colour + symbol + the letter, so stage is never colour alone */}
            <div className="flex flex-wrap gap-1.5 shrink-0">
              {practised.map((l) => {
                const st = STAGE[letter_stats[l].last_cognitive_state] ?? STAGE.insufficient_data;
                const on = l === picked;
                return (
                  <button key={l} onClick={() => setPicked(l)}
                    className={`flex items-center gap-1 rounded-lg border px-2 py-1 transition-colors ${on ? "ring-2 ring-[#2a78d6]" : "hover:bg-gray-50"}`}
                    style={{ borderColor: C.grid }}>
                    <span className="letter-glyph glyph-md font-semibold" style={{ color: C.ink }}>{l}</span>
                    <span aria-hidden className="t--1" style={{ color: st.color }}>{st.mark}</span>
                  </button>
                );
              })}
            </div>

            {/* Detail for the selected letter, replacing the old wide table */}
            {sel && selStage && (
              <div className="mt-3 flex-1 min-h-0 flex flex-col gap-1.5">
                <p className="t-0 font-semibold" style={{ color: C.ink }}>
                  <span className="letter-glyph" style={{ fontSize: "1.3em" }}>{picked}</span>
                  <span aria-hidden className="ml-2" style={{ color: selStage.color }}>{selStage.mark}</span>
                  <span className="ml-1.5 font-normal t--1" style={{ color: C.ink2 }}>{selStage.label}</span>
                </p>
                <dl className="grid grid-cols-2 gap-x-3 gap-y-0.5 t--1" style={{ color: C.ink2 }}>
                  <div className="flex justify-between"><dt>Sessions</dt><dd style={{ color: C.ink }}>{sel.sessions_count}</dd></div>
                  <div className="flex justify-between"><dt>Correct unaided</dt><dd style={{ color: C.ink }}>{sel.total_attempts > 0 ? `${sel.true_wins}/${sel.total_attempts}` : "—"}</dd></div>
                  <div className="flex justify-between"><dt>Answer supplied</dt><dd style={{ color: C.ink }}>{pc(sel.rescue_pct)}</dd></div>
                  <div className="flex justify-between"><dt>Typical time</dt><dd style={{ color: C.ink }}>{secs(sel.latency_median_ms)}</dd></div>
                </dl>
                {sel.error_series.length >= 2 && (
                  <p className="t--1 flex items-center gap-2" style={{ color: C.ink2 }}>
                    Error rate over time <Spark series={sel.error_series} />
                  </p>
                )}
                {selConf.length > 0 && (
                  <p className="t--1 flex flex-wrap items-center gap-1.5" style={{ color: C.ink2 }}>
                    Read as:
                    {selConf.map(([pair, n]) => (
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
          </Panel>
        </div>

        {/* Scope: one line on screen, the full statement on paper */}
        <p className="t--1 shrink-0 leading-snug print:hidden" style={{ color: C.muted }}>
          A practice and adaptation tool, <strong>not a diagnostic instrument</strong> —
          not normed, no validated cut-off scores. Stages use fixed thresholds
          (above 30% incorrect, below 10%). “Answer supplied” counts questions
          the app answered after a pause.
        </p>
        <div className="hidden print:block mt-4 t-0" style={{ color: C.ink2 }}>
          <h2 className="font-semibold mb-1" style={{ color: C.ink }}>How to read this report</h2>
          <p className="leading-relaxed">
            This records how reliably {report.display_name} matched a spoken
            Devanagari letter to its written form, how long each response took,
            and which letters were mistaken for which. It is a practice and
            adaptation tool, <strong>not a diagnostic instrument</strong>: the
            figures are not normed against an age-matched sample and there are no
            validated cut-off scores. Use them to guide practice and
            conversation, not to confirm or rule out a learning difficulty.
            Stages are assigned by fixed error-rate thresholds — above 30% of
            answers incorrect, or below 10% — not by a predictive model.
            Generated {d(report.generated_at)}.
          </p>
        </div>
      </div>
    </Screen>
  );
}
