import { useEffect, useState } from "react";
import { Delete } from "lucide-react";
import { ADULT } from "./AdultScreen";

/**
 * Four-digit entry with big keys. Fires `onComplete` on the fourth digit; the
 * parent remounts it (a new `key`) to clear it after a wrong PIN. Digits and
 * Backspace on a keyboard work too.
 */
export function PinPad({
  onComplete,
  disabled = false,
}: {
  onComplete: (pin: string) => void;
  disabled?: boolean;
}) {
  const [digits, setDigits] = useState("");

  const press = (d: string) => {
    if (disabled || digits.length >= 4) return;
    const next = digits + d;
    setDigits(next);
    if (next.length === 4) onComplete(next);
  };
  const back = () => !disabled && setDigits((s) => s.slice(0, -1));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (/^\d$/.test(e.key)) press(e.key);
      else if (e.key === "Backspace") back();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <div className="flex flex-col items-center" style={{ gap: "var(--gap-screen)" }}>
      <div className="flex gap-4 py-2" aria-label={`${digits.length} of 4 digits entered`}>
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className="rounded-full border-2 transition-colors"
            style={{
              width: 18,
              height: 18,
              borderColor: ADULT.ink2,
              background: i < digits.length ? ADULT.ink : "transparent",
            }}
          />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-3 w-full" style={{ maxWidth: 300 }}>
        {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"].map((k, i) =>
          k === "" ? (
            <span key={i} />
          ) : (
            <button
              key={i}
              onClick={() => (k === "⌫" ? back() : press(k))}
              disabled={disabled}
              aria-label={k === "⌫" ? "Delete last digit" : k}
              className="rounded-2xl border bg-white t-2 font-semibold flex items-center justify-center active:scale-95 transition-transform disabled:opacity-40"
              style={{ borderColor: ADULT.grid, color: ADULT.ink, height: 64 }}
            >
              {k === "⌫" ? <Delete size={22} /> : k}
            </button>
          ),
        )}
      </div>
    </div>
  );
}
