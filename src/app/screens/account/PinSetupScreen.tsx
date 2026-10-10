import { useRef, useState } from "react";
import { Navigate, useNavigate } from "react-router";
import { AdultScreen, ADULT } from "../../components/AdultScreen";
import { PinPad } from "../../components/PinPad";
import { useAccount } from "../../contexts/AccountContext";
import { inSetup } from "../../lib/accounts";

/**
 * Choose the grown-up PIN, twice. Reachable only during first-time setup or
 * after proving to be the adult (see `inSetup` in lib/accounts.ts) — anyone
 * else holding the device could otherwise set it.
 */
export function PinSetupScreen() {
  const navigate = useNavigate();
  const { uid, account, savePin, pinReset } = useAccount();
  const [first, setFirst] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  // Saving the PIN ends setup, which closes the guard below — and this screen
  // re-renders before navigate("/home") lands, so without this the guard would
  // win and send the adult who just set their PIN to the lock. (Found by
  // clicking through the flow: matching PINs landed on /unlock.)
  const finishing = useRef(false);

  if (!account?.role) return <Navigate to="/setup/role" replace />;
  if (!finishing.current && !inSetup(uid) && !pinReset) return <Navigate to="/unlock" replace />;

  async function onComplete(pin: string) {
    if (first === null) {
      setFirst(pin);
      setError(null);
      setAttempt((n) => n + 1);
      return;
    }
    if (pin !== first) {
      setFirst(null);
      setError("Those didn't match. Choose the PIN again.");
      setAttempt((n) => n + 1);
      return;
    }
    setSaving(true);
    finishing.current = true;
    try {
      await savePin(pin);
      navigate("/home", { replace: true });
    } catch (e) {
      finishing.current = false;
      setError(e instanceof Error ? e.message : "Could not save the PIN.");
      setFirst(null);
      setSaving(false);
      setAttempt((n) => n + 1);
    }
  }

  return (
    <AdultScreen
      narrow
      title={first === null ? "Choose a grown-up PIN" : "Enter it once more"}
      subtitle="Four digits. It keeps children out of the grown-up area — reports, adding children, signing out."
    >
      <div className="rounded-2xl border bg-white p-6" style={{ borderColor: ADULT.grid }}>
        <PinPad key={attempt} onComplete={onComplete} disabled={saving} />
        {error && <p className="t--1 text-center mt-3" style={{ color: ADULT.danger }}>{error}</p>}
      </div>
    </AdultScreen>
  );
}
