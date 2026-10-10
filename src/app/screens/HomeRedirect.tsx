import { Navigate } from "react-router";
import { useAccount } from "../contexts/AccountContext";
import { AccountLoading, RequireAccount } from "../components/AccountGuards";
import { homeRoute, inSetup } from "../lib/accounts";

/**
 * "/" — decides the first screen once, from the account (`homeRoute` in
 * lib/accounts.ts holds the rule and its reasons).
 *
 * This used to read `profile_complete` off the account's own profile row,
 * because the account was the child.
 */
export function HomeRedirect() {
  return (
    <RequireAccount>
      <Decide />
    </RequireAccount>
  );
}

function Decide() {
  const a = useAccount();
  if (!a.ready) return <AccountLoading />;
  if (a.pinReset) return <Navigate to="/setup/pin" replace />;
  return (
    <Navigate
      replace
      to={homeRoute({
        role: a.account?.role ?? null,
        hasPin: Boolean(a.account?.pinHash),
        unlocked: a.adultOpen,
        hasActiveChild: Boolean(a.activeChild),
        inSetup: inSetup(a.uid),
      })}
    />
  );
}
