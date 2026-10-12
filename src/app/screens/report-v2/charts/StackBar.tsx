import { useState } from "react";
import { INK, INK2, SURFACE } from "./theme";
import { Readout } from "./DayStrip";

export interface Segment {
  label: string;
  value: number;
  color: string;
}

/**
 * Parts of a whole in one bar — right first time · app helped · wrong, or
 * finished · stopped early. A 2px surface gap between segments, no borders;
 * the key under it carries each part's count and share, so a segment too
 * narrow for a label is never the only place its number lives.
 */
export function StackBar({ segments, label }: { segments: Segment[]; label: string }) {
  const [active, setActive] = useState<number | null>(null);
  const total = segments.reduce((s, x) => s + x.value, 0);
  if (total === 0) return null;
  const share = (v: number) => Math.round((v / total) * 100);
  const shown = segments.filter((s) => s.value > 0);

  return (
    <div className="flex flex-col gap-2">
      <div
        role="img"
        aria-label={`${label}: ${segments.map((s) => `${s.value} ${s.label}`).join(", ")}`}
        className="flex w-full overflow-hidden rounded"
        style={{ height: 18, gap: 2, background: SURFACE }}
        onPointerLeave={() => setActive(null)}
      >
        {shown.map((s) => {
          const i = segments.indexOf(s);
          return (
            <span
              key={s.label}
              style={{
                width: `${(s.value / total) * 100}%`,
                minWidth: 3,
                background: s.color,
                opacity: active === null || active === i ? 1 : 0.6,
              }}
              onPointerEnter={() => setActive(i)}
              onPointerDown={() => setActive(i)}
            />
          );
        })}
      </div>
      <ul className="t--1 flex flex-wrap gap-x-4 gap-y-1" style={{ color: INK2 }}>
        {segments.map((s) => (
          <li key={s.label} className="inline-flex items-center gap-1.5">
            <span aria-hidden className="inline-block" style={{ width: 12, height: 12, borderRadius: 3, background: s.color }} />
            <span className="font-semibold tabular-nums" style={{ color: INK }}>
              {s.value}
            </span>
            {s.label}
          </li>
        ))}
      </ul>
      <Readout
        text={active !== null ? `${segments[active].label}: ${segments[active].value} of ${total} (${share(segments[active].value)}%)` : null}
      />
    </div>
  );
}
