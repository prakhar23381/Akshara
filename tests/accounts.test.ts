/**
 * Adults own children (W5b). These run the guest backend, which keeps the same
 * shapes on the device; the signed-in backend is migration 002, tested against
 * real Postgres in backend/migrations/tests/test_002.cjs.
 */
const session = new Map<string, string>();
(globalThis as any).sessionStorage = {
  getItem: (k: string) => (session.has(k) ? session.get(k)! : null),
  setItem: (k: string, v: string) => session.set(k, String(v)),
  removeItem: (k: string) => session.delete(k),
};

import {
  GUEST_ID, archiveChild, beginSetup, consumeReauthForPin, createChild, defaultChild,
  endSetup, getActiveChildId, hashPin, homeRoute, inSetup, listChildren, loadAccount,
  masteredCounts, migrateLegacyGuest, pinMatches, requestReauthForPin, setPin, setRole,
} from "../src/app/lib/accounts";
import { fetchProgressReport } from "../src/app/api/client";

let pass = 0;
let fail = 0;
const ok = (name: string, cond: boolean, extra = "") => {
  if (cond) { pass++; console.log("  ✓", name); }
  else { fail++; console.log("  ✗", name, extra); }
};

async function main() {
  localStorage.setItem("akshara_offline_mode", "true");

  console.log("-- where a device opens --");
  const R = (o: Partial<Parameters<typeof homeRoute>[0]>) =>
    homeRoute({ role: null, hasPin: false, unlocked: false, hasActiveChild: false, inSetup: false, ...o });
  ok("no role → choose parent or teacher", R({}) === "/setup/role");
  ok("first-time setup, no PIN → set the PIN", R({ role: "parent", inSetup: true }) === "/setup/pin");
  ok("an existing account with no PIN does NOT go straight to setting one",
    R({ role: "parent", hasActiveChild: true }) === "/resume");
  ok("…and without a child it is asked to prove it is the adult first", R({ role: "parent" }) === "/unlock");
  ok("unlocked with a PIN → the adult home", R({ role: "teacher", hasPin: true, unlocked: true, hasActiveChild: true }) === "/home");
  ok("locked, a child playing → back to that child, never the adult area",
    R({ role: "parent", hasPin: true, hasActiveChild: true }) === "/resume");
  ok("locked, no child → the grown-ups lock", R({ role: "parent", hasPin: true }) === "/unlock");

  console.log("\n-- the adult --");
  const A = "adult-a";
  ok("a new guest has no role and no PIN", (await loadAccount(A)).role === null && (await loadAccount(A)).pinHash === null);
  await setRole(A, "teacher");
  ok("the role is kept", (await loadAccount(A)).role === "teacher");
  await setPin(A, "4821");
  const acct = await loadAccount(A);
  ok("the right PIN opens", await pinMatches(acct, "4821"));
  ok("a wrong PIN does not", !(await pinMatches(acct, "4822")));
  ok("only four digits count as a PIN", !(await pinMatches(acct, "48210")));
  let threw = false;
  try { await setPin(A, "12a4"); } catch { threw = true; }
  ok("a PIN that is not four digits is refused", threw);
  ok("the same PIN on two accounts hashes differently", (await hashPin("x", "1234")) !== (await hashPin("y", "1234")));
  ok("the PIN itself is never stored", !JSON.stringify(localStorage.getItem("akshara_db_user_profiles")).includes("4821"));

  console.log("\n-- setup and proving you are the adult --");
  ok("not in setup by default", !inSetup(A));
  beginSetup(A);
  ok("choosing a role begins setup", inSetup(A));
  endSetup(A);
  ok("saving the PIN ends it", !inSetup(A));
  requestReauthForPin();
  ok("a Google round trip for a PIN is recognised once", consumeReauthForPin());
  ok("…and only once", !consumeReauthForPin());

  console.log("\n-- children --");
  const kid1 = await createChild(A, "teacher", { name: " Meera ", age: 6, avatar: "🐼" });
  await createChild(A, "teacher", { name: "Ravi", age: 7, avatar: "🦊" });
  let kids = await listChildren(A);
  ok("two children, in the order they were added", kids.map((k) => k.display_name).join() === "Meera,Ravi", JSON.stringify(kids));
  ok("names are trimmed", kids[0].display_name === "Meera");
  await createChild("adult-b", "parent", { name: "Someone else's", age: 5, avatar: null });
  ok("another adult's children are not listed", (await listChildren(A)).length === 2);
  threw = false;
  try { await createChild(A, "teacher", { name: "  ", age: 5, avatar: null }); } catch { threw = true; }
  ok("a child needs a name", threw);
  await archiveChild(A, kid1.id);
  kids = await listChildren(A);
  ok("archiving hides a child", kids.length === 1 && kids[0].display_name === "Ravi");
  ok("…without deleting them", (JSON.parse(localStorage.getItem("akshara_db_children")!) as any[]).some((c) => c.id === kid1.id));

  localStorage.setItem("akshara_db_letter_progress", JSON.stringify([
    { user_id: kids[0].id, letter: "क", mastered: true },
    { user_id: kids[0].id, letter: "ख", mastered: true },
    { user_id: kids[0].id, letter: "ग", mastered: false },
    { user_id: "someone-else", letter: "क", mastered: true },
  ]));
  const counts = await masteredCounts(A, [kids[0].id]);
  ok("letters mastered are counted per child", counts[kids[0].id] === 2, JSON.stringify(counts));

  console.log("\n-- a guest who played before accounts existed --");
  localStorage.setItem("akshara_db_user_profiles", JSON.stringify([
    { id: GUEST_ID, display_name: "Aarav", age: 7, avatar: "🦁", profile_complete: true },
  ]));
  localStorage.setItem("akshara_db_learning_sessions", JSON.stringify([
    { id: "s1", session_id: "s1", user_id: GUEST_ID, letter: "क", schema_version: 2, status: "completed",
      started_at: "2026-10-01T10:00:00Z", activities: [], level_config: { input_mode: "tap" } },
  ]));
  migrateLegacyGuest(GUEST_ID);
  migrateLegacyGuest(GUEST_ID);
  const g = await listChildren(GUEST_ID);
  ok("their child keeps the guest's id, so every old session already belongs to it",
    g.length === 1 && g[0].id === GUEST_ID, JSON.stringify(g));
  ok("…and the name from the old profile", g[0].display_name === "Aarav");
  ok("migrating twice makes one child, not two", g.length === 1);
  ok("the guest becomes a parent", (await loadAccount(GUEST_ID)).role === "parent");
  ok("the device stays in child mode for that child", getActiveChildId(GUEST_ID) === GUEST_ID);
  ok("defaultChild finds the account's own child", defaultChild(GUEST_ID, g)?.id === GUEST_ID);

  const fresh = "guest-who-never-played";
  localStorage.setItem("akshara_db_user_profiles", JSON.stringify([
    ...JSON.parse(localStorage.getItem("akshara_db_user_profiles")!),
    { id: fresh, display_name: "Guest Explorer", profile_complete: true },
  ]));
  ok("a guest with no sessions gets no invented 'Guest Explorer' child", (await listChildren(fresh)).length === 0);

  console.log("\n-- the report names the child, not the account --");
  const named = await fetchProgressReport(kids[0].id);
  ok("the report takes the child's own name", named.display_name === "Ravi", named.display_name);
  const legacy = await fetchProgressReport(GUEST_ID);
  ok("…including a migrated guest's child", legacy.display_name === "Aarav", legacy.display_name);

  console.log(`\nRESULT ${pass} passed, ${fail} failed`);
  if (fail) process.exit(1);
}

main().catch((e) => { console.log("  ✗ accounts test threw", e); process.exit(1); });
