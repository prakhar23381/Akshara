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

/**
 * Column counts for `squareCells`, as a class and as a number.
 *
 * Deliberately not responsive, unlike `TILE_COLUMNS`: keeping cells square
 * means deriving the grid's height from its column count, and a cell cannot be
 * square at two breakpoints at once. Tailwind also only sees class names it can
 * find as literal text, so these cannot be built by interpolation.
 */
const SQUARE_COLUMN_CLASS: Record<number, string> = {
  1: "grid-cols-1",
  2: "grid-cols-2",
  3: "grid-cols-3",
  4: "grid-cols-2",
  5: "grid-cols-3",
  6: "grid-cols-3",
  8: "grid-cols-4",
};
const SQUARE_COLUMNS: Record<number, number> = {
  1: 1,
  2: 2,
  3: 3,
  4: 2,
  5: 3,
  6: 3,
  8: 4,
};

export function OptionGrid<T>({
  items,
  render,
  shape = "tile",
  keyOf,
  className = "",
  squareCells = false,
}: {
  items: T[];
  render: (item: T, index: number) => ReactNode;
  shape?: Shape;
  keyOf?: (item: T, index: number) => string;
  className?: string;
  /**
   * Keep every cell square. The memory deck needs it: six cards in three
   * columns gave two rows that each took half the leftover height, so on a
   * phone the cards came out as tall rectangles — "buttons not proportional".
   */
  squareCells?: boolean;
}) {
  const cells = items.map((item, i) => (
    <div key={keyOf ? keyOf(item, i) : i} className="min-h-0 min-w-0 flex">
      {render(item, i)}
    </div>
  ));

  // Square cells need the grid's height to follow from its width, so the grid
  // cannot also be the flex child that absorbs the leftover space. An outer box
  // takes the space and centres the grid inside it.
  if (shape === "tile" && squareCells) {
    const cols = SQUARE_COLUMNS[items.length] ?? 3;
    const rows = Math.ceil(items.length / cols);
    return (
      <div
        className={`flex-1 min-h-0 w-full flex items-center justify-center ${className}`}
      >
        <div
          className={`grid ${SQUARE_COLUMN_CLASS[items.length] ?? "grid-cols-3"}`}
          style={{
            gap: "var(--gap-screen)",
            width: "100%",
            maxWidth: "min(48rem, 100%)",
            // Width drives height, so each cell is as tall as it is wide.
            aspectRatio: `${cols} / ${rows}`,
            // …unless that would not fit, in which case the cells get shorter
            // rather than the grid overflowing the screen.
            maxHeight: "100%",
            gridAutoRows: "minmax(0, 1fr)",
          }}
        >
          {cells}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`grid w-full flex-1 min-h-0 ${
        shape === "row" ? "grid-cols-1" : TILE_COLUMNS[items.length] ?? "grid-cols-3"
      } ${className}`}
      style={{
        gap: "var(--gap-screen)",
        // Rows share the available height rather than growing past it.
        gridAutoRows: "minmax(0, 1fr)",
        maxWidth: shape === "row" ? "var(--cta-max)" : "min(48rem, 100%)",
        placeContent: "center",
        // `justify-self` does nothing here: the parent is ChildScreen's <main>,
        // which is a flex column, and justify-self only applies to grid items.
        // With an explicit max-width and the default `align-items: stretch`,
        // that left the grid pinned to the left edge — which is why every
        // activity read as "not centred", worst on a tablet and on the
        // row-shaped spelling options at any width.
        marginInline: "auto",
      }}
    >
      {cells}
    </div>
  );
}
