import type { CSSProperties, ReactNode } from "react";
import { Btn3D, Screen, Tile, type TileState } from "../ui";
import { C, contrast, ROLES, TODAY_PAIRS } from "../tokens";

/** docs/11 §3.9: the pressable kit, and every colour pair checked against WCAG AA. */
export function ButtonsStation({ variant }: { variant: string }) {
  return variant === "colours" ? <Colours /> : <Kit />;
}

const h2: CSSProperties = { margin: "8px 0 0", fontSize: 13, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em" };
const row: CSSProperties = { display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-end" };

function Kit() {
  const tiles: TileState[] = ["idle", "selected", "correct", "wrong", "faded"];
  return (
    <Screen>
      <h2 style={h2}>Before → after</h2>
      <div style={row}>
        <button
          style={{
            background: "#4A90E2", color: "#fff", border: 0, borderRadius: 24, height: 56, padding: "0 28px",
            fontFamily: "var(--font-ui)", fontWeight: 500, fontSize: 18,
          }}
        >
          Start
        </button>
        <span style={{ fontSize: 20, color: C.muted, paddingBottom: 14 }}>→</span>
        <Btn3D>चलो खेलें</Btn3D>
      </div>

      <h2 style={h2}>Buttons — press and hold</h2>
      <div style={row}>
        <Btn3D>Continue</Btn3D>
        <Btn3D outline>🔊 फिर से</Btn3D>
        <Btn3D disabled>Continue</Btn3D>
      </div>
      <Btn3D full>चलो खेलें</Btn3D>

      <h2 style={h2}>Answer tiles</h2>
      <div style={row}>
        {tiles.map((t) => (
          <figure key={t} style={{ margin: 0, display: "grid", justifyItems: "center", gap: 6 }}>
            <Tile state={t} size={84}>
              ग
            </Tile>
            <figcaption style={{ fontSize: 12, color: C.muted }}>{t}</figcaption>
          </figure>
        ))}
      </div>
      <p style={{ margin: 0, fontSize: 13, color: C.muted }}>
        A wrong answer is an outline and a small shake — never a red fill (§3.8 guardrail).
      </p>
    </Screen>
  );
}

function Ratio({ fg, bg, need = 4.5 }: { fg: string; bg: string; need?: number }) {
  const r = contrast(fg, bg);
  const ok = r >= need;
  return (
    <span style={{ fontVariantNumeric: "tabular-nums", fontSize: 13, color: ok ? ROLES.correct.lip : "#A3341F", fontWeight: 700 }}>
      {ok ? "✓" : "✗"} {r.toFixed(1)} : 1
    </span>
  );
}

function Line({ swatch, name, job, check }: { swatch: ReactNode; name: string; job: string; check: ReactNode }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "92px 1fr auto", gap: 12, alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${C.line}` }}>
      {swatch}
      <div>
        <div style={{ fontWeight: 700, fontSize: 15 }}>{name}</div>
        <div style={{ fontSize: 12, color: C.muted }}>{job}</div>
      </div>
      {check}
    </div>
  );
}

function Colours() {
  return (
    <Screen>
      <h2 style={h2}>Proposed roles (text on fill, AA needs 4.5 : 1)</h2>
      <div>
        {Object.values(ROLES).map((r) =>
          r.id === "hint" ? (
            <Line
              key={r.id}
              swatch={<div style={{ height: 44, borderRadius: 12, border: `4px solid ${r.fill}`, background: C.card }} />}
              name={r.name}
              job={`${r.job} · outline vs page, AA needs 3 : 1`}
              check={<Ratio fg={r.fill} bg={C.page} need={3} />}
            />
          ) : (
            <Line
              key={r.id}
              swatch={
                <div style={{ height: 44, borderRadius: 12, background: r.fill, color: r.text, boxShadow: `0 4px 0 ${r.lip}`, display: "grid", placeItems: "center", fontWeight: 800 }}>
                  Aa क
                </div>
              }
              name={r.name}
              job={r.job}
              check={<Ratio fg={r.text} bg={r.fill} />}
            />
          ),
        )}
      </div>
      <h2 style={h2}>Today, for comparison</h2>
      <div>
        {TODAY_PAIRS.map((p) => (
          <Line
            key={p.name}
            swatch={<div style={{ height: 44, borderRadius: 12, background: p.bg, color: p.fg, display: "grid", placeItems: "center", fontWeight: 500 }}>Aa क</div>}
            name={p.name}
            job={`${p.fg} on ${p.bg}`}
            check={<Ratio fg={p.fg} bg={p.bg} need={p.need} />}
          />
        ))}
      </div>
      <p style={{ margin: 0, fontSize: 13, color: C.muted }}>
        The page stays off-white {C.page} (design_guidelines §5.2). Not Duolingo green (D1).
      </p>
    </Screen>
  );
}
