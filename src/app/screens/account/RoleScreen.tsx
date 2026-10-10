import { useState } from "react";
import { Navigate, useNavigate } from "react-router";
import { AdultScreen, ADULT } from "../../components/AdultScreen";
import { useAccount } from "../../contexts/AccountContext";
import type { Role } from "../../lib/accounts";

/**
 * First-time setup, step 1. Replaces the old Child / Parent / Teacher screen,
 * whose Parent and Teacher buttons ran identical code: the role now belongs to
 * the account, and decides what the adult home offers.
 */
export function RoleScreen() {
  const navigate = useNavigate();
  const { account, chooseRole } = useAccount();
  const [busy, setBusy] = useState<Role | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (account?.role) return <Navigate to="/" replace />;

  async function pick(role: Role) {
    setBusy(role);
    setError(null);
    try {
      await chooseRole(role);
      navigate("/setup/pin", { replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save that. Try again.");
      setBusy(null);
    }
  }

  const options: { role: Role; emoji: string; title: string; text: string }[] = [
    { role: "parent", emoji: "👨‍👩‍👧", title: "I'm a parent", text: "Set up your own children and follow their progress." },
    { role: "teacher", emoji: "👩‍🏫", title: "I'm a teacher", text: "Set up the children you teach, and put them in classes." },
  ];

  return (
    <AdultScreen narrow title="Welcome to Akshara" subtitle="Who is setting it up? You can add children next.">
      <div className="flex flex-col gap-3">
        {options.map((o) => (
          <button
            key={o.role}
            onClick={() => pick(o.role)}
            disabled={busy !== null}
            className="flex items-center gap-4 rounded-2xl border bg-white p-5 text-left hover:shadow-md transition-shadow disabled:opacity-60"
            style={{ borderColor: ADULT.grid }}
          >
            <span className="t-4 leading-none" aria-hidden>{o.emoji}</span>
            <span className="min-w-0">
              <span className="t-1 font-semibold block" style={{ color: ADULT.ink }}>
                {busy === o.role ? "Saving…" : o.title}
              </span>
              <span className="t--1 block mt-0.5" style={{ color: ADULT.ink2 }}>{o.text}</span>
            </span>
          </button>
        ))}
        {error && <p className="t--1" style={{ color: ADULT.danger }}>{error}</p>}
      </div>
    </AdultScreen>
  );
}
