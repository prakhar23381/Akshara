import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "./AuthContext";
import {
  beginSetup,
  consumeReauthForPin,
  createChild,
  defaultChild,
  endSetup,
  getActiveChildId,
  isUnlocked,
  listChildren,
  loadAccount,
  pinMatches,
  setActiveChildId,
  setPin,
  setRole,
  setUnlocked,
  type AdultAccount,
  type Child,
  type Role,
} from "../lib/accounts";

/**
 * Who is signed in, which children they look after, and which child is
 * playing on this device.
 *
 * Every child-facing screen reads `activeChild` for the child's id, name and
 * avatar. Before W5b each of them read the signed-in account instead, because
 * the account was the child — nine call sites, all moved here.
 */
interface AccountValue {
  ready: boolean;
  error: string | null;
  uid: string;
  account: AdultAccount | null;
  children: Child[];
  activeChild: Child | null;
  /** The adult area is open in this tab (PIN entered, and a PIN exists). */
  adultOpen: boolean;
  /** Back from the Google round trip that proves an adult before a new PIN. */
  pinReset: boolean;
  refresh(): Promise<void>;
  chooseRole(role: Role): Promise<void>;
  savePin(pin: string): Promise<void>;
  tryPin(pin: string): Promise<boolean>;
  /** A guest passed the adult check; they may now set a PIN. */
  allowPinSetup(): void;
  addChild(input: { name: string; age: number | null; avatar: string | null }): Promise<Child>;
  /**
   * Hand the device to a child: makes them active. The adult area closes when
   * a child screen opens (RequireChild), not here — closing it here made the
   * adult home's own guard redirect to the lock before the navigation to the
   * child landed. (Found by clicking through: "Play as" opened the lock.)
   */
  playAs(child: Child): void;
  lockAdult(): void;
}

const Ctx = createContext<AccountValue | undefined>(undefined);

export function AccountProvider({ children: kids }: { children: ReactNode }) {
  const { user } = useAuth();
  const uid = user?.id ?? "offline";

  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [account, setAccount] = useState<AdultAccount | null>(null);
  const [children, setChildren] = useState<Child[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [unlocked, setUnlockedState] = useState(false);
  const [pinReset, setPinReset] = useState(false);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const [acct, list] = await Promise.all([loadAccount(uid), listChildren(uid)]);
      setAccount(acct);
      setChildren(list);

      // The device's active child, if it is still one of this adult's.
      let active = getActiveChildId(uid);
      if (active && !list.some((c) => c.id === active)) active = null;
      if (!active) {
        const fallback = defaultChild(uid, list);
        if (fallback) {
          active = fallback.id;
          setActiveChildId(uid, active);
        }
      }
      setActiveId(active);
      setUnlockedState(isUnlocked(uid));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setReady(true);
    }
  }, [uid]);

  useEffect(() => {
    setReady(false);
    // Read once, on the load that follows the Google round trip.
    if (consumeReauthForPin()) {
      beginSetup(uid);
      setUnlocked(uid, true);
      setPinReset(true);
    }
    refresh();
  }, [uid, refresh]);

  const chooseRole = useCallback(
    async (role: Role) => {
      await setRole(uid, role);
      // First-time setup: the adult who just signed in may set a PIN directly.
      beginSetup(uid);
      setAccount((a) => (a ? { ...a, role } : { id: uid, role, pinHash: null }));
    },
    [uid],
  );

  const savePin = useCallback(
    async (pin: string) => {
      const hash = await setPin(uid, pin);
      endSetup(uid);
      setPinReset(false);
      setUnlocked(uid, true);
      setUnlockedState(true);
      setAccount((a) => (a ? { ...a, pinHash: hash } : a));
    },
    [uid],
  );

  const tryPin = useCallback(
    async (pin: string) => {
      if (!account || !(await pinMatches(account, pin))) return false;
      setUnlocked(uid, true);
      setUnlockedState(true);
      return true;
    },
    [account, uid],
  );

  const allowPinSetup = useCallback(() => {
    beginSetup(uid);
    setUnlocked(uid, true);
    setPinReset(true);
  }, [uid]);

  const addChild = useCallback(
    async (input: { name: string; age: number | null; avatar: string | null }) => {
      if (!account?.role) throw new Error("Choose parent or teacher first.");
      const child = await createChild(uid, account.role, input);
      setChildren((list) => [...list, child]);
      return child;
    },
    [account, uid],
  );

  const playAs = useCallback(
    (child: Child) => {
      setActiveChildId(uid, child.id);
      setActiveId(child.id);
    },
    [uid],
  );

  const lockAdult = useCallback(() => {
    setUnlocked(uid, false);
    setUnlockedState(false);
  }, [uid]);

  const value = useMemo<AccountValue>(
    () => ({
      ready,
      error,
      uid,
      account,
      children,
      activeChild: children.find((c) => c.id === activeId) ?? null,
      adultOpen: unlocked && Boolean(account?.pinHash),
      pinReset,
      refresh,
      chooseRole,
      savePin,
      tryPin,
      allowPinSetup,
      addChild,
      playAs,
      lockAdult,
    }),
    [ready, error, uid, account, children, activeId, unlocked, pinReset, refresh,
     chooseRole, savePin, tryPin, allowPinSetup, addChild, playAs, lockAdult],
  );

  return <Ctx.Provider value={value}>{kids}</Ctx.Provider>;
}

export function useAccount(): AccountValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAccount must be used within AccountProvider");
  return ctx;
}
