import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { AdultScreen, AdultButton, ADULT } from "../../components/AdultScreen";
import { PinPad } from "../../components/PinPad";
import { useAccount } from "../../contexts/AccountContext";
import { useAuth } from "../../contexts/AuthContext";
import { requestReauthForPin } from "../../lib/accounts";
import { isSupabaseConfigured } from "../../lib/supabase";

const MAX_TRIES = 5;
const COOLDOWN_S = 30;

/**
 * The grown-ups lock. Replaces the "6–13 + 6–13" sum, which most children in
 * the age range this app serves can do.
 *
 * With no PIN yet — every account migration 002 carried over — the adult
 * proves who they are first, then sets one. Forgetting a PIN takes the same
 * path. A signed-in adult proves it by signing in with Google again; a guest,
 * who has no account to re-check, by a sum a young child cannot do.
 */
export function UnlockScreen() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get("next") || "/home";
  const { account, activeChild, tryPin, allowPinSetup } = useAccount();
  const { signInWithGoogle } = useAuth();

  const [attempt, setAttempt] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [coolUntil, setCoolUntil] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const guest = !isSupabaseConfigured || localStorage.getItem("akshara_offline_mode") === "true";
  const hasPin = Boolean(account?.pinHash);
  const cooling = now < coolUntil;

  useEffect(() => {
    if (!cooling) return;
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, [cooling]);

  async function onComplete(pin: string) {
    if (await tryPin(pin)) {
      navigate(next, { replace: true });
      return;
    }
    const n = wrong + 1;
    setWrong(n);
    setAttempt((a) => a + 1);
    if (n >= MAX_TRIES) {
      setCoolUntil(Date.now() + COOLDOWN_S * 1000);
      setNow(Date.now());
      setWrong(0);
      setError(`Too many tries. Wait ${COOLDOWN_S} seconds.`);
    } else {
      setError("That's not the PIN.");
    }
  }

  async function proveAdult() {
    setError(null);
    if (guest) {
      setChecking(true);
      return;
    }
    // Back from Google, AccountContext reads this flag and opens PIN setup.
    requestReauthForPin();
    const failure = await signInWithGoogle();
    if (failure) setError("Google sign-in isn't available right now.");
  }

  const backToChild = activeChild ? () => navigate("/resume", { replace: true }) : undefined;

  return (
    <AdultScreen
      narrow
      title="Grown-ups only"
      subtitle={
        hasPin
          ? "Enter the grown-up PIN."
          : "Set up a grown-up PIN first. To make sure it's a grown-up setting it, you'll confirm who you are."
      }
      onBack={backToChild}
    >
      <div className="rounded-2xl border bg-white p-6 flex flex-col gap-4" style={{ borderColor: ADULT.grid }}>
        {checking ? (
          <AdultCheck
            onPass={() => {
              allowPinSetup();
              navigate("/setup/pin", { replace: true });
            }}
            onCancel={() => setChecking(false)}
          />
        ) : hasPin ? (
          <>
            <PinPad key={attempt} onComplete={onComplete} disabled={cooling} />
            {error && (
              <p className="t--1 text-center" style={{ color: ADULT.danger }}>
                {cooling ? `Too many tries. Wait ${Math.ceil((coolUntil - now) / 1000)} seconds.` : error}
              </p>
            )}
            <button onClick={proveAdult} className="t--1 underline self-center" style={{ color: ADULT.ink2 }}>
              Forgot the PIN?
            </button>
          </>
        ) : (
          <>
            <AdultButton full onClick={proveAdult}>
              {guest ? "Confirm I'm a grown-up" : "Confirm with Google"}
            </AdultButton>
            {error && <p className="t--1 text-center" style={{ color: ADULT.danger }}>{error}</p>}
          </>
        )}
      </div>
    </AdultScreen>
  );
}

/**
 * For guests only: a two-digit by one-digit multiplication. Not a security
 * boundary — a guest's data lives on the device anyway — just past what a
 * five-to-eight-year-old can do, unlike the sum it replaces.
 */
function AdultCheck({ onPass, onCancel }: { onPass: () => void; onCancel: () => void }) {
  const [q] = useState(() => ({ a: 12 + Math.floor(Math.random() * 38), b: 3 + Math.floor(Math.random() * 7) }));
  const [value, setValue] = useState("");
  const [error, setError] = useState(false);
  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (Number(value) === q.a * q.b) onPass();
        else {
          setError(true);
          setValue("");
        }
      }}
    >
      <p className="t-0" style={{ color: ADULT.ink2 }}>To continue, work this out:</p>
      <p className="t-3 font-semibold text-center" style={{ color: ADULT.ink }}>
        {q.a} × {q.b} = ?
      </p>
      <input
        inputMode="numeric"
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value.replace(/\D/g, ""))}
        className="t-1 text-center rounded-xl border px-3 py-2"
        style={{ borderColor: ADULT.grid }}
        aria-label="Answer"
      />
      {error && <p className="t--1 text-center" style={{ color: ADULT.danger }}>Not quite. Try again.</p>}
      <div className="flex gap-2">
        <AdultButton variant="secondary" onClick={onCancel}>Cancel</AdultButton>
        <AdultButton type="submit" full>Continue</AdultButton>
      </div>
    </form>
  );
}
