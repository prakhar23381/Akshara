import { Mitthu, POSES, type Pose } from "../Mitthu";
import { Bubble, Screen } from "../ui";
import { C } from "../tokens";

/** docs/11 §3.1: one companion, a pose for each moment. `all` is the sheet for the experts. */
export function MitthuStation({ variant }: { variant: string }) {
  const one = POSES.find((p) => p.id === variant);
  if (one) {
    return (
      <Screen style={{ display: "grid" }}>
        <p style={{ margin: 0, fontSize: 13, color: C.muted, textAlign: "center" }}>{one.moment}</p>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20 }}>
          {one.line && <Bubble text={one.line} tail="bottom" />}
          <Mitthu pose={one.id} size={220} />
        </div>
      </Screen>
    );
  }
  return (
    <Screen>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 12 }}>
        {POSES.map((p) => (
          <figure
            key={p.id}
            style={{ margin: 0, background: C.card, border: `2px solid ${C.line}`, borderRadius: 16, padding: 12, display: "grid", justifyItems: "center", gap: 6 }}
          >
            <Mitthu pose={p.id as Pose} size={110} />
            <figcaption style={{ textAlign: "center", fontSize: 13 }}>
              <strong>{p.label}</strong>
              <div style={{ color: C.muted }}>{p.moment}</div>
              {p.line && <div style={{ fontFamily: "var(--font-devanagari)", fontSize: 15, marginTop: 2 }}>{p.line}</div>}
            </figcaption>
          </figure>
        ))}
      </div>
    </Screen>
  );
}
