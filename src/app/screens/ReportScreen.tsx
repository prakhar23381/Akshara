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

type Tab = "overview" | "sessions" | "letters";

const TABS: { id: Tab; label: string; accent: string }[] = [
  { id: "overview", label: "Overview", accent: C.overview },
  { id: "sessions", label: "Sessions", accent: C.sessions },
  { id: "letters", label: "Letters", accent: C.letters },
];

function Tile({ value, label, accent }: { value: string; label: string; accent: string }) {
  return (
    <div
      className="rounded-xl border bg-white px-3 py-2 min-w-0 border-l-4"
      style={{ borderColor: C.grid, borderLeftColor: accent }}
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

function Bar({ value, color, width = 110 }: { value: number | null; color: string; width?: number }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span
        className="inline-block rounded-sm overflow-hidden"
        style={{ width, height: 8, background: C.grid }}
      >
        <span
          className="block h-full rounded-r-sm"
          style={{ width: `${Math.max(0, Math.min(100, value ?? 0))}%`, background: color }}
        />
      </span>
      <span
        className="t--1 font-semibold"
        style={{ color: C.ink, fontVariantNumeric: "tabular-nums" }}
      >
        {pc(value)}
      </span>
    </span>
  );
}

function Section({
  title,
  accent,
  children,
  className = "",
}: {
  title: string;
  accent: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-xl border bg-white flex flex-col min-h-0 ${className}`}
      style={{ borderColor: C.grid }}
    >
      <h2
        className="t-0 font-semibold px-3 py-2 border-b shrink-0 flex items-center gap-2"
        style={{ borderColor: C.grid, color: C.ink }}
      >
        <span
          className="inline-block rounded-full shrink-0"
          style={{ width: 8, height: 8, background: accent }}
        />
        {title}
      </h2>
      <div className="flex-1 min-h-0 p-3">{children}</div>
    </section>
  );
}

export function ReportScreen() {
  const navigate = useNavigate();
  const [report, setReport] = useState<ProgressReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("overview");
  const [openSession, setOpenSession] = useState<string | null>(null);
  const [pickedLetter, setPickedLetter] = useState<string | null>(null);

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
    if (!pickedLetter && practised.length) setPickedLetter(practised[practised.length - 1]);
  }, [practised, pickedLetter]);

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

  const { letter_stats, total_sessions, letters_mastered, totals } = report;
  const sessions = report.sessions ?? [];
  const attempts = totals?.attempts ?? 0;
  const gross = totals?.gross_shape;
  const feature = totals?.feature_level;

  // Sessions written before the session model existed carry no activity detail.
  const legacyOnly = total_sessions > 0 && sessions.length === 0;

  const confusions = Object.entries(
    practised.reduce<Record<string, number>>((acc, l) => {
      Object.entries(letter_stats[l].confusion_counts).forEach(([k, v]) => {
        acc[k] = (acc[k] ?? 0) + v;
      });
      return acc;
    }, {}),
  ).sort((a, b) => b[1] - a[1]);

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

  const sel: LetterStat | null = pickedLetter ? letter_stats[pickedLetter] : null;
  const selStage = sel ? STAGE[sel.last_cognitive_state] ?? STAGE.insufficient_data : null;

  return (
    <Screen>
      {/* Header */}
      <header
        className="shrink-0 flex items-center gap-2 border-b bg-white px-3 py-2 print:hidden"
        style={{ borderColor: C.grid }}
      >
        <button
          onClick={() => navigate(-1)}
          aria-label="Go back"
          className="rounded-lg p-1.5 hover:bg-gray-100"
          style={{ color: C.ink2 }}
        >
          <ArrowLeft size={18} />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="t-0 font-semibold leading-tight truncate" style={{ color: C.ink }}>
            Learning report
          </h1>
          <p className="t--1 leading-tight truncate" style={{ color: C.muted }}>
            {report.display_name} · {total_sessions} session
            {total_sessions === 1 ? "" : "s"}
            {report.assessment_window?.first
              ? ` · ${day(report.assessment_window.first)}–${day(report.assessment_window.last)}`
              : ""}
            {" · "}
            {letters_mastered}/{LETTER_SEQUENCE.length} mastered
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
      </header>

      {/* Segments */}
      <nav
        className="shrink-0 flex gap-1 border-b bg-white px-3 print:hidden"
        style={{ borderColor: C.grid }}
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="t--1 font-semibold px-3 py-2 border-b-2 -mb-px transition-colors"
            style={{
              color: tab === t.id ? t.accent : C.muted,
              borderBottomColor: tab === t.id ? t.accent : "transparent",
            }}
          >
            {t.label}
            {t.id === "sessions" && sessions.length > 0 && (
              <span className="ml-1 opacity-70">({sessions.length})</span>
            )}
          </button>
        ))}
      </nav>

      <div
        className="flex-1 min-h-0 flex flex-col print:overflow-visible"
        style={{ gap: "var(--gap-screen)", padding: "var(--pad-screen)" }}
      >
        {legacyOnly && (
          <p
            className="t--1 shrink-0 rounded-lg border px-3 py-2"
            style={{ borderColor: C.grid, background: "#fffdf7", color: C.ink2 }}
          >
            These {total_sessions} session{total_sessions === 1 ? "" : "s"} were
            recorded by an earlier version that did not store activity detail.
            Practise a letter to populate the Sessions view.
          </p>
        )}

        {/* ── Overview ──────────────────────────────────────────────────── */}
        {tab === "overview" && (
          <>
            <div className="shrink-0 grid grid-cols-2 sm:grid-cols-4 gap-2">
              <Tile value={String(attempts)} label="Questions answered" accent={C.overview} />
              <Tile
                value={
                  attempts > 0
                    ? `${Math.round(((totals?.true_wins ?? 0) / attempts) * 100)}%`
                    : "—"
                }
                label="Correct unaided"
                accent={C.overview}
              />
              <Tile value={pc(totals?.rescue_pct)} label="Answer supplied" accent={C.lookalike} />
              <Tile
                value={secs(totals?.latency_median_ms)}
                label="Typical response"
                accent={C.overview}
              />
            </div>

            <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 gap-2 print:grid-cols-1">
              <Section title="Where errors occur" accent={C.overview}>
                {gross && feature && attempts > 0 ? (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-2 min-w-0">
                      <span className="t--1 truncate" style={{ color: C.ink2 }}>
                        Distinct letters
                      </span>
                      <Bar value={gross.error_pct} color={C.overview} />
                    </div>
                    <div className="flex items-center justify-between gap-2 min-w-0">
                      <span className="t--1 truncate" style={{ color: C.ink2 }}>
                        Look-alike letters
                      </span>
                      <Bar value={feature.error_pct} color={C.lookalike} />
                    </div>
                    {reading && (
                      <p className="t--1 leading-snug mt-1" style={{ color: C.ink2 }}>
                        {reading}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="t--1" style={{ color: C.muted }}>
                    Not enough questions answered yet.
                  </p>
                )}
              </Section>

              <Section title="Letters confused" accent={C.lookalike}>
                {confusions.length === 0 ? (
                  <p className="t--1" style={{ color: C.muted }}>
                    None recorded.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-1.5 overflow-hidden">
                    {confusions.slice(0, 8).map(([pair, n]) => {
                      const [a, b] = pair.split("→");
                      return (
                        <span
                          key={pair}
                          className="inline-flex items-center gap-1 rounded-lg border px-2 py-1"
                          style={{ borderColor: C.grid }}
                        >
                          <span className="letter-glyph glyph-md font-semibold" style={{ color: C.ink }}>
                            {a}
                          </span>
                          <span className="t--1" style={{ color: C.muted }}>
                            →
                          </span>
                          <span
                            className="letter-glyph glyph-md font-semibold"
                            style={{ color: C.lookalike }}
                          >
                            {b}
                          </span>
                          <span className="t--1 font-semibold" style={{ color: C.ink2 }}>
                            {n}×
                          </span>
                        </span>
                      );
                    })}
                  </div>
                )}
              </Section>
            </div>
          </>
        )}

        {/* ── Sessions ──────────────────────────────────────────────────── */}
        {tab === "sessions" && (
          <Section title="Every sitting, newest first" accent={C.sessions} className="flex-1 min-h-0">
            {sessions.length === 0 ? (
              <p className="t--1" style={{ color: C.muted }}>
                No sessions with activity detail yet.
              </p>
            ) : (
              <div className="h-full overflow-y-auto -mx-1 px-1">
                <ul className="flex flex-col gap-1.5">
                  {sessions.map((s) => (
                    <SessionRow
                      key={s.session_id}
                      s={s}
                      open={openSession === s.session_id}
                      onToggle={() =>
                        setOpenSession(openSession === s.session_id ? null : s.session_id)
                      }
                    />
                  ))}
                </ul>
              </div>
            )}
          </Section>
        )}

        {/* ── Letters ───────────────────────────────────────────────────── */}
        {tab === "letters" && (
          <Section title="Letters practised" accent={C.letters} className="flex-1 min-h-0">
            <div className="flex flex-wrap gap-1.5 shrink-0">
              {practised.map((l) => {
                const st = STAGE[letter_stats[l].last_cognitive_state] ?? STAGE.insufficient_data;
                const on = l === pickedLetter;
                return (
                  <button
                    key={l}
                    onClick={() => setPickedLetter(l)}
                    className={`flex items-center gap-1 rounded-lg border px-2 py-1 transition-colors ${
                      on ? "ring-2" : "hover:bg-gray-50"
                    }`}
                    style={{ borderColor: C.grid, ...(on ? { ["--tw-ring-color" as string]: C.letters } : {}) }}
                  >
                    <span className="letter-glyph glyph-md font-semibold" style={{ color: C.ink }}>
                      {l}
                    </span>
                    <span aria-hidden className="t--1" style={{ color: st.color }}>
                      {st.mark}
                    </span>
                  </button>
                );
              })}
            </div>

            {sel && selStage && (
              <div className="mt-3 flex flex-col gap-1.5">
                <p className="t-0 font-semibold" style={{ color: C.ink }}>
                  <span className="letter-glyph" style={{ fontSize: "1.3em" }}>
                    {pickedLetter}
                  </span>
                  <span aria-hidden className="ml-2" style={{ color: selStage.color }}>
                    {selStage.mark}
                  </span>
                  <span className="ml-1.5 font-normal t--1" style={{ color: C.ink2 }}>
                    {selStage.label}
                  </span>
                </p>
                <dl className="grid grid-cols-2 gap-x-3 gap-y-0.5 t--1" style={{ color: C.ink2 }}>
                  <Row k="Sessions" v={String(sel.sessions_count)} />
                  <Row
                    k="Correct unaided"
                    v={sel.total_attempts > 0 ? `${sel.true_wins}/${sel.total_attempts}` : "—"}
                  />
                  <Row k="Answer supplied" v={pc(sel.rescue_pct)} />
                  <Row k="Typical time" v={secs(sel.latency_median_ms)} />
                </dl>
              </div>
            )}
          </Section>
        )}

        <p className="t--1 shrink-0 leading-snug print:hidden" style={{ color: C.muted }}>
          A practice and adaptation tool, <strong>not a diagnostic instrument</strong> —
          not normed, no validated cut-off scores. Stages use fixed thresholds
          (above 30% incorrect, below 10%).
        </p>

        {/* The download is the long-form document: everything, in full. */}
        <PrintReport report={report} sessions={sessions} confusions={confusions} />
      </div>
    </Screen>
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
