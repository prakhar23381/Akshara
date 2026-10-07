/**
 * Per-question position indicator.
 *
 * One component, always directly under the header, so a child sees the same
 * marker in the same place in every activity. Previously each activity drew its
 * own, in a different position, and some drew none at all.
 */
export function StepDots({ total, current }: { total: number; current: number }) {
  return (
    <div className="shrink-0 flex justify-center gap-2 select-none" aria-hidden>
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className={`rounded-full transition-all ${
            i < current
              ? "bg-emerald-500"
              : i === current
                ? "bg-[#4A90E2] scale-125"
                : "bg-gray-300"
          }`}
          style={{ width: "0.6rem", height: "0.6rem" }}
        />
      ))}
    </div>
  );
}
