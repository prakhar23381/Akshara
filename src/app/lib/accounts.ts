import { v4 as uuidv4 } from "uuid";
import { supabase } from "./supabase";
import { readsDatabase } from "./learnerProfile";

/**
 * Adults and the children they look after (W5b).
 *
 * Until migration 002 one Google account WAS one child: the child's name sat on
 * the account's own profile row and every session was keyed by the account's
 * id. Now an adult signs in once and owns any number of children, and every
 * child-facing screen works for whichever child is active on the device.
 *
 * Two backends behind one interface:
 *  - **Signed in**: migration 002's tables and operations. Children are read
 *    straight from `children` (row-level security returns exactly the ones
 *    this adult may see); they are created through `create_child()`, which
 *    makes the guardian link in the same transaction.
 *  - **Guest**: the same shapes in this device's storage. A guest has no
 *    database identity at all, so nothing here is mirrored.
 *
 * The adult's own profile row (`user_profiles`) holds only `role` and
 * `pin_hash` from now on. Its legacy `display_name` / `age` / `avatar`
 * columns describe a migrated account's first child, and migration 002's
 * temporary trigger mirrors any write to them into that child — so this module
 * must never write them.
 */

export type Role = "parent" | "teacher";

export interface Child {
  id: string;
  display_name: string;
  age: number | null;
  avatar: string | null;
  created_at?: string;
}

export interface AdultAccount {
  id: string;
  role: Role | null;
  pinHash: string | null;
}

export const GUEST_ID = "guest-user-id";

const K = {
  profiles: "akshara_db_user_profiles",
  children: "akshara_db_children",
  guardians: "akshara_db_child_guardians",
  sessions: "akshara_db_learning_sessions",
  progress: "akshara_db_letter_progress",
  activeChild: (uid: string) => `akshara_active_child:${uid}`,
  unlocked: (uid: string) => `akshara_adult_unlocked:${uid}`,
};

const isGuest = (uid: string) => !readsDatabase(uid);

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full or blocked: the in-memory state still works this visit */
  }
}

// ── The adult ────────────────────────────────────────────────────────────────

export async function loadAccount(uid: string): Promise<AdultAccount> {
  if (isGuest(uid)) {
    migrateLegacyGuest(uid);
    const p = read<any[]>(K.profiles, []).find((r) => r.id === uid);
    return { id: uid, role: (p?.role as Role) ?? null, pinHash: p?.pin_hash ?? null };
  }
  const { data, error } = await supabase
    .from("user_profiles")
    .select("role, pin_hash")
    .eq("id", uid)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return { id: uid, role: (data?.role as Role) ?? null, pinHash: data?.pin_hash ?? null };
}

function patchLocalProfile(uid: string, patch: Record<string, unknown>): void {
  const rows = read<any[]>(K.profiles, []);
  const i = rows.findIndex((r) => r.id === uid);
  if (i >= 0) rows[i] = { ...rows[i], ...patch };
  else rows.push({ id: uid, created_at: new Date().toISOString(), ...patch });
  write(K.profiles, rows);
}

export async function setRole(uid: string, role: Role): Promise<void> {
  if (isGuest(uid)) return patchLocalProfile(uid, { role });
  // Upsert with only these columns: on an existing row PostgREST updates just
  // `role`, never the legacy child columns.
  const { error } = await supabase
    .from("user_profiles")
    .upsert({ id: uid, role }, { onConflict: "id" });
  if (error) throw new Error(error.message);
}

/**
 * SHA-256 of the account id and the PIN. Salting with the id means the same PIN
 * on two accounts does not hash alike. With 10,000 possible PINs this keeps a
 * child at the device out of the adult area; it is not protection against
 * someone holding the database, and it does not pretend to be.
 */
export async function hashPin(uid: string, pin: string): Promise<string> {
  const bytes = new TextEncoder().encode(`akshara-pin:${uid}:${pin}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export const isValidPin = (pin: string) => /^\d{4}$/.test(pin);

export async function setPin(uid: string, pin: string): Promise<string> {
  if (!isValidPin(pin)) throw new Error("A PIN is four digits.");
  const hash = await hashPin(uid, pin);
  if (isGuest(uid)) {
    patchLocalProfile(uid, { pin_hash: hash });
  } else {
    const { error } = await supabase.from("user_profiles").update({ pin_hash: hash }).eq("id", uid);
    if (error) throw new Error(error.message);
  }
  return hash;
}

export async function pinMatches(account: AdultAccount, pin: string): Promise<boolean> {
  if (!account.pinHash || !isValidPin(pin)) return false;
  return (await hashPin(account.id, pin)) === account.pinHash;
}

// ── Children ─────────────────────────────────────────────────────────────────

export async function listChildren(uid: string): Promise<Child[]> {
  if (isGuest(uid)) {
    migrateLegacyGuest(uid);
    const mine = new Set(
      read<any[]>(K.guardians, []).filter((g) => g.adult_id === uid).map((g) => g.child_id),
    );
    return read<any[]>(K.children, [])
      .filter((c) => mine.has(c.id) && !c.archived_at)
      .map(toChild);
  }
  // Row-level security returns exactly the children this adult may see:
  // their own, and (for a teacher, from W5c) the children in their classes.
  const { data, error } = await supabase
    .from("children")
    .select("id, display_name, age, avatar, created_at")
    .is("archived_at", null)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map(toChild);
}

const toChild = (c: any): Child => ({
  id: c.id,
  display_name: c.display_name,
  age: c.age ?? null,
  avatar: c.avatar ?? null,
  created_at: c.created_at,
});

export async function createChild(
  uid: string,
  role: Role,
  input: { name: string; age: number | null; avatar: string | null },
): Promise<Child> {
  const name = input.name.trim();
  if (!name) throw new Error("A child needs a name.");
  if (isGuest(uid)) {
    const child = {
      id: uuidv4(),
      display_name: name,
      age: input.age,
      avatar: input.avatar,
      created_by: uid,
      created_at: new Date().toISOString(),
      archived_at: null,
    };
    write(K.children, [...read<any[]>(K.children, []), child]);
    write(K.guardians, [
      ...read<any[]>(K.guardians, []),
      { child_id: child.id, adult_id: uid, role, added_at: child.created_at },
    ]);
    return toChild(child);
  }
  const { data, error } = await supabase.rpc("create_child", {
    p_name: name,
    p_age: input.age,
    p_avatar: input.avatar,
  });
  if (error) throw new Error(error.message);
  return { id: data as string, display_name: name, age: input.age, avatar: input.avatar };
}

/** Hide a child. Their history stays: it is the record a parent relies on. */
export async function archiveChild(uid: string, childId: string): Promise<void> {
  const when = new Date().toISOString();
  if (isGuest(uid)) {
    write(
      K.children,
      read<any[]>(K.children, []).map((c) => (c.id === childId ? { ...c, archived_at: when } : c)),
    );
    return;
  }
  const { error } = await supabase.from("children").update({ archived_at: when }).eq("id", childId);
  if (error) throw new Error(error.message);
}

/** Letters mastered per child, for the cards on the adult home. */
export async function masteredCounts(uid: string, childIds: string[]): Promise<Record<string, number>> {
  const out: Record<string, number> = Object.fromEntries(childIds.map((id) => [id, 0]));
  if (childIds.length === 0) return out;
  let rows: any[] = [];
  if (isGuest(uid)) {
    rows = read<any[]>(K.progress, []);
  } else {
    const { data } = await supabase
      .from("letter_progress")
      .select("user_id, mastered")
      .in("user_id", childIds);
    rows = data ?? [];
  }
  rows.forEach((r) => {
    if (r.mastered && r.user_id in out) out[r.user_id] += 1;
  });
  return out;
}

// ── Which child is playing on this device, and whether the adult area is open ─

export function getActiveChildId(uid: string): string | null {
  try {
    return localStorage.getItem(K.activeChild(uid));
  } catch {
    return null;
  }
}
export function setActiveChildId(uid: string, childId: string | null): void {
  try {
    if (childId) localStorage.setItem(K.activeChild(uid), childId);
    else localStorage.removeItem(K.activeChild(uid));
  } catch {
    /* private mode: child mode still works, it just won't survive a reload */
  }
}

/**
 * The adult area stays open for this tab once the PIN is entered, and closes
 * the moment a child is set playing. sessionStorage, not localStorage, so a
 * closed tab — or a new one a child opens — starts locked.
 */
export function isUnlocked(uid: string): boolean {
  try {
    return sessionStorage.getItem(K.unlocked(uid)) === "1";
  } catch {
    return false;
  }
}
export function setUnlocked(uid: string, on: boolean): void {
  try {
    if (on) sessionStorage.setItem(K.unlocked(uid), "1");
    else sessionStorage.removeItem(K.unlocked(uid));
  } catch {
    /* storage blocked: the adult will be asked for the PIN again */
  }
}

// ── First-time setup, and proving you are the adult ─────────────────────────

/**
 * Setting a PIN without one is only safe during first-time setup, straight
 * after the adult has signed in and chosen a role in this tab. Everyone else
 * without a PIN is an *existing* account — migration 002 turned every account
 * into a parent with no PIN — and the person holding that device is as likely
 * to be the child as the adult. So outside setup, setting a PIN first requires
 * proving you are the adult: signing in with Google again, or for a guest
 * (who has no account to re-check) a harder sum. Forgetting a PIN takes the
 * same path.
 */
const SETUP = (uid: string) => `akshara_setup:${uid}`;
const REAUTH = "akshara_reauth_for_pin";

function flag(key: string, on?: boolean): boolean {
  try {
    if (on === true) sessionStorage.setItem(key, "1");
    if (on === false) sessionStorage.removeItem(key);
    return sessionStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}
export const inSetup = (uid: string) => flag(SETUP(uid));
export const beginSetup = (uid: string) => void flag(SETUP(uid), true);
export const endSetup = (uid: string) => void flag(SETUP(uid), false);
/** Set before the Google round trip; read once on return. */
export const requestReauthForPin = () => void flag(REAUTH, true);
export function consumeReauthForPin(): boolean {
  const was = flag(REAUTH);
  flag(REAUTH, false);
  return was;
}

// ── Where to go on load ──────────────────────────────────────────────────────

/**
 * The first screen for a signed-in adult, decided in one place.
 *
 *  - no role yet                    → choose parent or teacher
 *  - in first-time setup, no PIN    → set the PIN
 *  - adult area unlocked            → the adult home
 *  - a child is active              → that child's resume screen: a device left
 *                                     with a child playing reopens for the
 *                                     child, never into the adult area
 *  - otherwise                      → the grown-ups screen, which asks for the
 *                                     PIN — or, with none set yet, for proof
 *                                     of being the adult before setting one
 */
export function homeRoute(s: {
  role: Role | null;
  hasPin: boolean;
  unlocked: boolean;
  hasActiveChild: boolean;
  inSetup: boolean;
}): string {
  if (!s.role) return "/setup/role";
  if (!s.hasPin && s.inSetup) return "/setup/pin";
  if (s.unlocked && s.hasPin) return "/home";
  if (s.hasActiveChild) return "/resume";
  return "/unlock";
}

/**
 * The child a device should be playing as when none is chosen yet.
 *
 * A migrated account's first child has the account's own id: before W5b the
 * account *was* the child, so its device was, in effect, always in child mode
 * for it. Keeping that means a child who opens the app after this release
 * lands exactly where they did before, not on a grown-ups screen.
 */
export function defaultChild(uid: string, children: Child[]): Child | null {
  return children.find((c) => c.id === uid) ?? null;
}

// ── Guests who used the app before accounts existed ─────────────────────────

/**
 * A guest who played before W5b has sessions under the guest's own id and a
 * profile row holding the child's name. Give them a child with that same id —
 * exactly what migration 002 did for signed-in accounts — so every existing
 * session already belongs to it and nothing has to be rewritten.
 *
 * Only when there is history to keep: a guest who merely tapped "Start" once
 * has a seeded "Guest Explorer" profile and no sessions, and inventing a child
 * called "Guest Explorer" for them would be wrong. Idempotent.
 */
export function migrateLegacyGuest(uid: string): void {
  const children = read<any[]>(K.children, []);
  if (children.some((c) => c.id === uid)) return;
  const played = read<any[]>(K.sessions, []).some((s) => s.user_id === uid);
  if (!played) return;

  const profile = read<any[]>(K.profiles, []).find((p) => p.id === uid) ?? {};
  const when = profile.created_at ?? new Date().toISOString();
  write(K.children, [
    ...children,
    {
      id: uid,
      display_name: profile.display_name?.trim() || "Child",
      age: profile.age ?? null,
      avatar: profile.avatar ?? null,
      created_by: uid,
      created_at: when,
      archived_at: null,
    },
  ]);
  write(K.guardians, [
    ...read<any[]>(K.guardians, []),
    { child_id: uid, adult_id: uid, role: "parent", added_at: when },
  ]);
  if (!profile.role) patchLocalProfile(uid, { role: "parent" });
  // The device was in "child mode" for this child all along.
  if (!getActiveChildId(uid)) setActiveChildId(uid, uid);
}
