import type { ReactNode } from "react";

/**
 * The layout every child-facing screen uses.
 *
 * Three fixed slots, so a child always finds the same thing in the same place
 * and nothing can push the action button off the bottom:
 *
 *   header — fixed height, optional (progress / exit)
 *   body   — flex-1 min-h-0, takes whatever is left, never scrolls
 *   footer — fixed height, the single primary action
 *
 * Before this, all 17 child screens hand-rolled their own arrangement, which is
 * why the progress indicator, the heading and the call to action sat in a
 * different place on every screen.
 *
 * `min-h-0` on the body is load-bearing: a flex child defaults to
 * `min-height:auto` and so refuses to shrink below its content, which is what
 * pushed content past the bottom of the viewport.
 */
export function ChildScreen({
  header,
  footer,
  children,
  className = "",
  background = "bg-[#F7F6F2]",
  centerBody = true,
}: {
  header?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
  background?: string;
  centerBody?: boolean;
}) {
  return (
    <div
      className={`h-[100dvh] w-full flex flex-col overflow-hidden ${background} ${className}`}
    >
      {header && <div className="shrink-0">{header}</div>}

      <main
        className={`flex-1 min-h-0 flex flex-col overflow-hidden ${
          centerBody ? "items-center justify-center" : ""
        }`}
        style={{
          gap: "var(--gap-screen)",
          paddingInline: "var(--pad-screen)",
          paddingBlock: header ? 0 : "var(--pad-screen)",
        }}
      >
        {children}
      </main>

      {footer && (
        <div
          className="shrink-0 flex flex-col items-center justify-center"
          style={{
            gap: "calc(var(--gap-screen) / 2)",
            padding: "var(--pad-screen)",
            paddingTop: "calc(var(--pad-screen) / 2)",
          }}
        >
          {footer}
        </div>
      )}
    </div>
  );
}
