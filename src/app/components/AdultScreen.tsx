import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";

/** The adult palette: the report's neutral ink, one accent. */
export const ADULT = {
  ink: "#0b0b0b",
  ink2: "#52514e",
  muted: "#898781",
  grid: "#e1e0d9",
  accent: "#4A90E2",
  page: "#F7F6F2",
  danger: "#d03b3b",
};

/**
 * Frame for adult screens. Unlike the child screens these scroll: an adult
 * reading a list of children or a report is not hunting for one big button,
 * and forcing a single viewport is what made the old report look empty.
 */
export function AdultScreen({
  title,
  subtitle,
  onBack,
  actions,
  narrow = false,
  children,
}: {
  title: string;
  subtitle?: ReactNode;
  onBack?: () => void;
  actions?: ReactNode;
  narrow?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="h-[100dvh] overflow-y-auto" style={{ background: ADULT.page }}>
      <div
        className={`mx-auto w-full ${narrow ? "max-w-md" : "max-w-5xl"} flex flex-col`}
        style={{ padding: "var(--pad-screen)", gap: "var(--gap-screen)" }}
      >
        <header className="flex items-center gap-2">
          {onBack && (
            <button
              onClick={onBack}
              aria-label="Go back"
              className="rounded-lg p-2 -ml-2 hover:bg-white"
              style={{ color: ADULT.ink2 }}
            >
              <ArrowLeft size={20} />
            </button>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="t-2 font-semibold leading-tight" style={{ color: ADULT.ink }}>
              {title}
            </h1>
            {subtitle && (
              <p className="t--1 leading-snug mt-0.5" style={{ color: ADULT.ink2 }}>
                {subtitle}
              </p>
            )}
          </div>
          {actions}
        </header>
        {children}
      </div>
    </div>
  );
}

export function AdultButton({
  children,
  onClick,
  variant = "primary",
  disabled,
  type = "button",
  full,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "ghost";
  disabled?: boolean;
  type?: "button" | "submit";
  full?: boolean;
}) {
  const style =
    variant === "primary"
      ? { background: ADULT.accent, color: "#fff", borderColor: ADULT.accent }
      : variant === "secondary"
        ? { background: "#fff", color: ADULT.ink, borderColor: ADULT.grid }
        : { background: "transparent", color: ADULT.ink2, borderColor: "transparent" };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`t-0 font-semibold rounded-xl border px-4 transition-opacity disabled:opacity-50 ${full ? "w-full" : ""}`}
      style={{ ...style, minHeight: "var(--tap-min)" }}
    >
      {children}
    </button>
  );
}
