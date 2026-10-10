import { useEffect, type ReactNode } from "react";
import { Navigate, useLocation } from "react-router";
import { useAccount } from "../contexts/AccountContext";
import { AdultButton, ADULT } from "./AdultScreen";

export function AccountLoading() {
  return (
    <div className="h-[100dvh] flex items-center justify-center" style={{ background: ADULT.page }}>
      <div className="flex gap-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="w-3 h-3 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
        ))}
      </div>
    </div>
  );
}

function AccountError() {
  const { error, refresh } = useAccount();
  return (
    <div className="h-[100dvh] flex flex-col items-center justify-center gap-3 p-6 text-center" style={{ background: ADULT.page }}>
      <p className="t-1 font-semibold" style={{ color: ADULT.ink }}>Couldn't load your account</p>
      <p className="t--1 max-w-sm" style={{ color: ADULT.ink2 }}>{error}</p>
      <AdultButton onClick={refresh}>Try again</AdultButton>
    </div>
  );
}

/** Account loaded (or failed visibly), before any screen that needs it. */
export function RequireAccount({ children }: { children: ReactNode }) {
  const { ready, error } = useAccount();
  if (!ready) return <AccountLoading />;
  if (error) return <AccountError />;
  return <>{children}</>;
}

/**
 * Adult screens: a role, a PIN, and the adult area unlocked in this tab.
 * Otherwise to the lock, remembering where the adult was going.
 */
export function RequireAdult({ children }: { children: ReactNode }) {
  const { ready, error, account, adultOpen } = useAccount();
  const loc = useLocation();
  if (!ready) return <AccountLoading />;
  if (error) return <AccountError />;
  if (!account?.role) return <Navigate to="/setup/role" replace />;
  if (!adultOpen) {
    return <Navigate to={`/unlock?next=${encodeURIComponent(loc.pathname + loc.search)}`} replace />;
  }
  return <>{children}</>;
}

/**
 * Child screens: a child must be active on this device. Opening one closes the
 * adult area — whichever way the device got here, it is now in a child's hands.
 */
export function RequireChild({ children }: { children: ReactNode }) {
  const { ready, error, activeChild, adultOpen, lockAdult } = useAccount();
  useEffect(() => {
    if (ready && activeChild && adultOpen) lockAdult();
  }, [ready, activeChild, adultOpen, lockAdult]);
  if (!ready) return <AccountLoading />;
  if (error) return <AccountError />;
  if (!activeChild) return <Navigate to="/" replace />;
  return <>{children}</>;
}
