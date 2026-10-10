import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { LogOut, Plus } from "lucide-react";
import { AdultScreen, AdultButton, ADULT } from "../../components/AdultScreen";
import { useAccount } from "../../contexts/AccountContext";
import { useAuth } from "../../contexts/AuthContext";
import { useProfileSetup } from "../../contexts/ProfileSetupContext";
import { masteredCounts } from "../../lib/accounts";
import { LETTER_SEQUENCE } from "../../types/levelConfig";

/**
 * Where a parent or teacher lands: every child they look after, each with a
 * way to hand the device to that child and a way into that child's report.
 * Signing out lives here, in the adult area — it used to be a button on the
 * child's own resume screen, so a child could sign the adult out.
 */
export function AdultHomeScreen() {
  const navigate = useNavigate();
  const { uid, account, children, playAs } = useAccount();
  const { user, signOut } = useAuth();
  const { reset } = useProfileSetup();
  const [mastered, setMastered] = useState<Record<string, number>>({});

  useEffect(() => {
    let live = true;
    masteredCounts(uid, children.map((c) => c.id))
      .then((m) => live && setMastered(m))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [uid, children]);

  const teacher = account?.role === "teacher";
  const adultName =
    (user?.user_metadata?.full_name as string | undefined)?.split(" ")[0] ??
    (user?.user_metadata?.name as string | undefined)?.split(" ")[0];

  function addChild() {
    reset();
    navigate("/profile/name");
  }

  return (
    <AdultScreen
      title={teacher ? "Your pupils" : "Your children"}
      subtitle={`${adultName ? `${adultName} · ` : ""}${teacher ? "Teacher" : "Parent"} account`}
      actions={
        <button
          onClick={signOut}
          className="t--1 inline-flex items-center gap-1.5 rounded-lg border bg-white px-3 py-2 font-semibold"
          style={{ borderColor: ADULT.grid, color: ADULT.ink2 }}
        >
          <LogOut size={14} /> Sign out
        </button>
      }
    >
      {children.length === 0 ? (
        <div className="rounded-2xl border bg-white p-8 flex flex-col items-center gap-3 text-center" style={{ borderColor: ADULT.grid }}>
          <span className="t-4" aria-hidden>🌱</span>
          <p className="t-1 font-semibold" style={{ color: ADULT.ink }}>
            Add {teacher ? "the first child you teach" : "your first child"}
          </p>
          <p className="t--1 max-w-sm" style={{ color: ADULT.ink2 }}>
            Each child gets their own progress, their own report, and games that adapt to the letters they mix up.
          </p>
          <AdultButton onClick={addChild}>Add a child</AdultButton>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {children.map((c) => (
            <article key={c.id} className="rounded-2xl border bg-white p-4 flex flex-col gap-3" style={{ borderColor: ADULT.grid }}>
              <div className="flex items-center gap-3">
                <span
                  className="rounded-full flex items-center justify-center shrink-0 t-3"
                  style={{ width: 56, height: 56, background: "#f3f1ea" }}
                  aria-hidden
                >
                  {c.avatar ?? "🙂"}
                </span>
                <div className="min-w-0">
                  <p className="t-1 font-semibold truncate" style={{ color: ADULT.ink }}>{c.display_name}</p>
                  <p className="t--1" style={{ color: ADULT.ink2 }}>
                    {c.age ? `Age ${c.age} · ` : ""}
                    {mastered[c.id] ?? 0} of {LETTER_SEQUENCE.length} letters mastered
                  </p>
                </div>
              </div>
              <div className="flex gap-2 mt-auto">
                <AdultButton
                  full
                  onClick={() => {
                    playAs(c);
                    navigate("/resume", { replace: true });
                  }}
                >
                  Play as {c.display_name}
                </AdultButton>
                <AdultButton variant="secondary" onClick={() => navigate(`/report?child=${encodeURIComponent(c.id)}`)}>
                  Report
                </AdultButton>
              </div>
            </article>
          ))}
          <button
            onClick={addChild}
            className="rounded-2xl border-2 border-dashed p-4 flex flex-col items-center justify-center gap-2 min-h-[9rem] hover:bg-white transition-colors"
            style={{ borderColor: ADULT.grid, color: ADULT.ink2 }}
          >
            <Plus size={22} />
            <span className="t-0 font-semibold">Add a child</span>
          </button>
        </div>
      )}
    </AdultScreen>
  );
}
