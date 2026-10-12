import { createContext, useContext, type ReactNode } from "react";
import { SKILL_IDS, type Range, type ReportModel, type SkillId } from "../model";
import { parseDay } from "../charts/days";
import { LETTER_SEQUENCE } from "../../../types/levelConfig";
import { FONT_DEVANAGARI, GRID, INK, INK2 } from "../charts/theme";

/** The four sections a summary card opens (B3). */
export type Section = "letters" | "skills" | "practice" | "mixups";

/**
 * The report's views: the summary, a section per card (B3), and the detail
 * views (B4) — one letter, one pair (`pair:क-ख`), one skill, all sessions.
 * Plain strings, so the app can keep the view in the URL.
 */
export type View =
  | "summary"
  | Section
  | "sessions"
  | `letter:${string}`
  | `pair:${string}`
  | `skill:${SkillId}`;

const PLAIN = ["summary", "letters", "skills", "practice", "mixups", "sessions"];

/** A view from a URL, or the summary if it names nothing the report has. */
export function parseView(v: string | null): View {
  if (!v) return "summary";
  if (PLAIN.includes(v)) return v as View;
  const at = v.indexOf(":");
  const kind = v.slice(0, at);
  const rest = v.slice(at + 1);
  if (kind === "letter" && (LETTER_SEQUENCE as readonly string[]).includes(rest)) return v as View;
  if (kind === "skill" && (SKILL_IDS as string[]).includes(rest)) return v as View;
  if (kind === "pair" && /^[^-]+-[^-]+$/.test(rest)) return v as View;
  return "summary";
}

/** Where "back" goes: a detail to its section, a section to the summary. */
export function upOf(view: View): View {
  if (view.startsWith("letter:")) return "letters";
  if (view.startsWith("pair:")) return "mixups";
  if (view.startsWith("skill:")) return "skills";
  if (view === "sessions") return "practice";
  return "summary";
}

export const pairView = (a: string, b: string): View => `pair:${a}-${b}`;

/**
 * True while the report is laid out for paper (Download). Views use it to
 * drop their tablet columns — the page is narrower than the screen the charts
 * were measured on — and to leave out what only a screen can use.
 */
export const PrintContext = createContext(false);
export const usePrinting = () => useContext(PrintContext);

/** A view's grid: one column on a phone and on paper, `wide` from tablet up. */
export function useColumns(wide: string) {
  return usePrinting() ? "flex flex-col gap-3" : `flex flex-col gap-3 ${wide}`;
}

export const PERIOD_WORD: Record<Range, string> = { week: "this week", month: "this month", all: "so far" };
export const PREVIOUS_WORD: Record<Range, string> = { week: "same days last week", month: "same days last month", all: "" };
export const pct = (v: number) => `${Math.round(v)}%`;

/** What the figures cover — under the period switch, and on paper. */
export function periodCaption(model: ReportModel, wholeHistory = false): string {
  const first = model.practice.history[0]?.date;
  const since = first
    ? `since ${parseDay(first).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" })}`
    : "so far";
  if (wholeHistory) return `The whole history, ${since}`;
  if (model.range === "week") return "This week so far · vs the same days last week";
  if (model.range === "month") return "This month so far · vs the same days last month";
  return first ? `Everything ${since}` : "Everything so far";
}
export const secsText = (v: number) => `${v.toFixed(1)}s`;
/** "9 Oct", or "9 Oct 2025" outside the current year. */
export const shortDate = (iso: string, now?: string) => {
  const d = new Date(iso);
  const thisYear = now ? new Date(now).getFullYear() : new Date().getFullYear();
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", ...(d.getFullYear() !== thisYear ? { year: "numeric" } : {}) });
};
export const sessionWhen = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });

/**
 * A white card with a prominent title. With `onOpen`, the title row is the way
 * into the card's section — a full-width, 44px-tall button with a chevron. The
 * card body stays a chart, so tapping a day or a point reads it rather than
 * leaving the page.
 */
export function Card({
  title,
  children,
  className = "",
  onOpen,
  breakable = false,
}: {
  title: string;
  children: ReactNode;
  className?: string;
  onOpen?: () => void;
  /** A long list on paper: break between its rows rather than move the whole card to a new page. */
  breakable?: boolean;
}) {
  const printing = usePrinting();
  const heading = (
    <h2 className="t-1 font-bold leading-tight" style={{ color: INK }}>
      {title}
    </h2>
  );
  return (
    <section
      className={`rounded-2xl bg-white p-4 flex flex-col gap-3 min-w-0 ${breakable ? "" : "print:break-inside-avoid"} ${className}`}
      style={{ boxShadow: `inset 0 0 0 1px ${GRID}` }}
    >
      {onOpen && !printing ? (
        <button
          onClick={onOpen}
          className="flex items-center justify-between w-full text-left -my-2"
          style={{ minHeight: "var(--tap-min)" }}
          aria-label={`${title}: open`}
        >
          {heading}
          <span aria-hidden className="t-2 leading-none" style={{ color: INK2 }}>
            ›
          </span>
        </button>
      ) : (
        heading
      )}
      {children}
    </section>
  );
}

export const Muted = ({ children }: { children: ReactNode }) => (
  <p className="t--1" style={{ color: INK2 }}>
    {children}
  </p>
);

export const Glyph = ({ children }: { children: ReactNode }) => (
  <span style={{ fontFamily: FONT_DEVANAGARI }}>{children}</span>
);

/** A big figure, its change, and what it is: the head of a section. */
export function Hero({
  value,
  label,
  delta,
  note,
}: {
  value: ReactNode;
  label: ReactNode;
  delta?: ReactNode;
  note?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline gap-2 flex-wrap">
        <span className="t-4 font-semibold leading-none" style={{ color: INK }}>
          {value}
        </span>
        <span className="t-0" style={{ color: INK }}>
          {label}
        </span>
        {delta}
      </div>
      {note && <Muted>{note}</Muted>}
    </div>
  );
}

/** "See all 12 sessions ›": a way on to a detail view from inside a card. */
export function MoreLink({ children, onClick }: { children: ReactNode; onClick?: () => void }) {
  if (!onClick || usePrinting()) return null;
  return (
    <button
      onClick={onClick}
      className="t-0 self-start inline-flex items-center gap-1 font-semibold -my-2"
      style={{ minHeight: "var(--tap-min)", color: INK }}
    >
      {children}
      <span aria-hidden className="t-1 leading-none" style={{ color: INK2 }}>
        ›
      </span>
    </button>
  );
}
