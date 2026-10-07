import type { ReactNode } from "react";

/**
 * Fixed-viewport screen shell.
 *
 * Every screen fills exactly the visible viewport and never scrolls, so a child
 * can always reach the action button without knowing to swipe. Two details make
 * that hold up in practice:
 *
 *   • 100dvh rather than 100vh — on mobile, 100vh is the viewport with browser
 *     chrome *hidden*, so a 100vh layout has its bottom cut off until the user
 *     scrolls, which is exactly what we are trying to avoid.
 *   • min-h-0 on the body — a flex child defaults to min-height:auto and so
 *     refuses to shrink below its content, which is what pushes content off a
 *     fixed-height flex column. This is the single most common cause of
 *     "it overflows on small screens".
 *
 * Printing opts out: a report is allowed to run to several pages.
 */
export function Screen({
  children,
  className = "",
  background = "bg-[#F7F6F2]",
}: {
  children: ReactNode;
  className?: string;
  background?: string;
}) {
  return (
    <div
      className={`h-[100dvh] w-full flex flex-col overflow-hidden ${background} print:h-auto print:overflow-visible print:bg-white ${className}`}
    >
      {children}
    </div>
  );
}

/**
 * The flexible region between header and footer. Shrinks rather than overflows.
 * `center` is right for most child-facing screens; dense screens pass false and
 * lay out their own grid.
 */
export function ScreenBody({
  children,
  className = "",
  center = true,
}: {
  children: ReactNode;
  className?: string;
  center?: boolean;
}) {
  return (
    <div
      className={`flex-1 min-h-0 flex flex-col overflow-hidden ${
        center ? "items-center justify-center" : ""
      } ${className} print:overflow-visible`}
      style={{
        gap: "var(--gap-screen)",
        padding: "var(--pad-screen)",
      }}
    >
      {children}
    </div>
  );
}
