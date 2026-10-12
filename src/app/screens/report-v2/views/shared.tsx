import type { ReactNode } from "react";
import type { Range } from "../model";
import { FONT_DEVANAGARI, GRID, INK, INK2 } from "../charts/theme";

/** The report's views: the summary, then one section per card (B3). */
export type View = "summary" | "letters" | "skills" | "practice" | "mixups";

export const PERIOD_WORD: Record<Range, string> = { week: "this week", month: "this month", all: "so far" };
export const PREVIOUS_WORD: Record<Range, string> = { week: "same days last week", month: "same days last month", all: "" };
export const pct = (v: number) => `${Math.round(v)}%`;

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
}: {
  title: string;
  children: ReactNode;
  className?: string;
  onOpen?: () => void;
}) {
  const heading = (
    <h2 className="t-1 font-bold leading-tight" style={{ color: INK }}>
      {title}
    </h2>
  );
  return (
    <section
      className={`rounded-2xl bg-white p-4 flex flex-col gap-3 min-w-0 ${className}`}
      style={{ boxShadow: `inset 0 0 0 1px ${GRID}` }}
    >
      {onOpen ? (
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
