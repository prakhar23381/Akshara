import type { ReactNode } from "react";

type Shape = "tile" | "row";

/**
 * The one answer-options layout.
 *
 * Replaces four separate implementations that each overflowed differently:
 *   GameScreen        `grid-cols-4` with `p-8` cards
 *   WordFillBlank     `flex-wrap` with fixed `w-20 h-20 sm:w-24 sm:h-24`
 *   WordSpelling      four full-width stacked buttons
 *   MemoryGame        `grid-cols-3`
 *
 * Two rules make it fit on any screen:
 *
 *  1. Column count is chosen from the option count, not from `auto-fit`.
 *     `auto-fit` is what produced the "three in one row and one in the next"
 *     split — four 96px tiles plus gaps exceed a 375px phone, so the fourth
 *     wrapped alone.
 *  2. The grid fills its parent and its rows are `minmax(0, 1fr)`, so tiles
 *     divide the space that is actually available instead of asserting a fixed
 *     pixel size and overflowing when there is not enough.
 */
const TILE_COLUMNS: Record<number, string> = {
  1: "grid-cols-1",
  2: "grid-cols-2",
  3: "grid-cols-3",
  4: "grid-cols-2 sm:grid-cols-4",
  5: "grid-cols-3",
  6: "grid-cols-3",
  8: "grid-cols-4",
};

export function OptionGrid<T>({
  items,
  render,
  shape = "tile",
  keyOf,
  className = "",
}: {
  items: T[];
  render: (item: T, index: number) => ReactNode;
  shape?: Shape;
  keyOf?: (item: T, index: number) => string;
  className?: string;
}) {
  const cols =
    shape === "row"
      ? "grid-cols-1"
      : TILE_COLUMNS[items.length] ?? "grid-cols-3";

  return (
    <div
      className={`grid w-full flex-1 min-h-0 ${cols} ${className}`}
      style={{
        gap: "var(--gap-screen)",
        // Rows share the available height rather than growing past it.
        gridAutoRows: "minmax(0, 1fr)",
        maxWidth: shape === "row" ? "var(--cta-max)" : "min(48rem, 100%)",
        placeContent: "center",
        justifySelf: "center",
      }}
    >
      {items.map((item, i) => (
        <div key={keyOf ? keyOf(item, i) : i} className="min-h-0 min-w-0 flex">
          {render(item, i)}
        </div>
      ))}
    </div>
  );
}
