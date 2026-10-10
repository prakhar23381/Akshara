// Exercise migration 002 against real Postgres, before it goes near the live
// database.
//
// PGlite is Postgres compiled to WebAssembly: real PL/pgSQL, triggers, roles
// and row-level security, in-process. Supabase's `auth` schema, `auth.uid()`
// and its `anon` / `authenticated` roles are stubbed the way Supabase defines
// them, then 000 and 001 are applied, live-shaped data is seeded, and 002 is
// applied and exercised as each kind of user. It also re-runs 002 and tests the
// rollback both ways.
//
// PGlite is deliberately not a project dependency. Install it anywhere:
//
//   mkdir -p /tmp/pglite && (cd /tmp/pglite && npm i --ignore-scripts @electric-sql/pglite@0.5.8)
//   node backend/migrations/tests/test_002.cjs /tmp/pglite backend/migrations
//
// Written 2026-10-10. Its first run caught two bugs: re-running 002 invented a
// child for every parent and teacher, and the rollback could not drop the new
// tables in any order.
const path = require("node:path");
const fs = require("node:fs");
const { PGlite } = require(path.join(process.argv[2], "node_modules/@electric-sql/pglite"));
const MIG = process.argv[3];
const sql = (f) => fs.readFileSync(path.join(MIG, f), "utf8");

let pass = 0, fail = 0;
const ok = (name, cond, extra = "") => {
  if (cond) { pass++; console.log("  ✓", name); }
  else { fail++; console.log("  ✗", name, extra); }
};

const U = {
  A: "aaaaaaaa-0000-4000-8000-000000000001", // legacy parent, onboarded before 002
  B: "bbbbbbbb-0000-4000-8000-000000000002", // legacy account, never finished onboarding
  C: "cccccccc-0000-4000-8000-000000000003", // signs up AFTER 002 on the OLD client
  T: "dddddddd-0000-4000-8000-000000000004", // teacher, new client
  P: "eeeeeeee-0000-4000-8000-000000000005", // second parent, new client
};

const SUPABASE_STUB = `
  CREATE SCHEMA auth;
  CREATE TABLE auth.users (id UUID PRIMARY KEY, email TEXT, raw_user_meta_data JSONB DEFAULT '{}'::jsonb);
  CREATE FUNCTION auth.uid() RETURNS UUID LANGUAGE sql STABLE AS $$
    SELECT COALESCE(NULLIF(current_setting('request.jwt.claim.sub', true), ''),
                    (NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'))::uuid
  $$;
  CREATE ROLE anon NOLOGIN;
  CREATE ROLE authenticated NOLOGIN;
  GRANT USAGE ON SCHEMA public, auth TO anon, authenticated;
  ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated;
  ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated;
`;

async function fresh() {
  const db = new PGlite();
  await db.exec(SUPABASE_STUB);
  await db.exec(sql("000_init.sql"));
  await db.exec(sql("001_session_model.sql"));
  // Live-shaped data, as it exists before 002.
  await db.exec(`
    INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES
      ('${U.A}', 'a@x', '{"full_name":"Asha Parent"}'),
      ('${U.B}', 'b@x', '{}'),
      ('${U.C}', 'c@x', '{}'),
      ('${U.T}', 't@x', '{"full_name":"Ms Tara"}'),
      ('${U.P}', 'p@x', '{"full_name":"Pavan Parent"}');
    INSERT INTO user_profiles (id, display_name, age, avatar, profile_complete) VALUES
      ('${U.A}', 'Aarav', 7, '🐻', true),
      ('${U.B}', NULL, NULL, NULL, false);
    INSERT INTO learning_sessions (user_id, letter, cognitive_state, schema_version, session_id, started_at)
      VALUES ('${U.A}', 'क', 'feature_neglect', 2, gen_random_uuid(), NOW() - INTERVAL '2 days'),
             ('${U.A}', 'ख', 'gross_shape_blindness', 1, NULL, NOW() - INTERVAL '1 day');
    INSERT INTO letter_progress (user_id, letter, letter_index, mastered)
      VALUES ('${U.A}', 'क', 0, false);
  `);
  return db;
}

// Run `fn` as a signed-in user (or anon), the way PostgREST does.
async function as(db, uid, fn) {
  return db.transaction(async (tx) => {
    await tx.exec(`SET LOCAL ROLE ${uid ? "authenticated" : "anon"}`);
    if (uid) await tx.query(`SELECT set_config('request.jwt.claim.sub', $1, true)`, [uid]);
    return fn(tx);
  });
}
const q1 = async (tx, text, params = []) => (await tx.query(text, params)).rows;
async function rejects(db, uid, fn) {
  try { await as(db, uid, fn); return null; }
  catch (e) { return e.message; }
}

(async () => {
  const db = await fresh();

  console.log("-- applying 002 --");
  let applyErr = null;
  try { await db.exec(sql("002_accounts.sql")); } catch (e) { applyErr = e.message; }
  ok("002 applies cleanly to live-shaped data", applyErr === null, applyErr ?? "");
  if (applyErr) { console.log(`\nRESULT ${pass} passed, ${fail} failed`); process.exit(1); }

  console.log("\n-- backfill --");
  const kids = (await db.query(`SELECT id, display_name, created_by FROM children ORDER BY display_name`)).rows;
  ok("an onboarded account gets a child with its own id and its name",
    kids.some((k) => k.id === U.A && k.display_name === "Aarav"), JSON.stringify(kids));
  ok("an account that never onboarded still gets a placeholder child",
    kids.some((k) => k.id === U.B && k.display_name === "Child"));
  const g = (await db.query(`SELECT * FROM child_guardians WHERE child_id = $1`, [U.A])).rows;
  ok("the account is that child's parent", g.length === 1 && g[0].adult_id === U.A && g[0].role === "parent");
  ok("the account's role becomes parent",
    (await db.query(`SELECT role FROM user_profiles WHERE id = $1`, [U.A])).rows[0].role === "parent");
  const fk = (await db.query(`
    SELECT rel.relname, conf.relname AS target FROM pg_constraint con
      JOIN pg_class rel ON rel.oid = con.conrelid JOIN pg_class conf ON conf.oid = con.confrelid
     WHERE con.contype = 'f' AND rel.relname IN ('learning_sessions','letter_progress')
       AND conf.relname IN ('user_profiles','children')`)).rows;
  ok("sessions and progress now point at children, not user_profiles",
    fk.length === 2 && fk.every((r) => r.target === "children"), JSON.stringify(fk));
  ok("existing sessions record who recorded them",
    (await db.query(`SELECT count(*)::int n FROM learning_sessions WHERE recorded_by = $1`, [U.A])).rows[0].n === 2);
  ok("no existing session row was rewritten",
    (await db.query(`SELECT count(*)::int n FROM learning_sessions WHERE user_id = $1`, [U.A])).rows[0].n === 2);

  console.log("\n-- the client deployed today keeps working --");
  ok("legacy account reads its own sessions",
    (await as(db, U.A, (tx) => q1(tx, `SELECT id FROM learning_sessions`))).length === 2);
  let e = await rejects(db, U.A, (tx) => tx.query(
    `INSERT INTO learning_sessions (user_id, letter, cognitive_state, schema_version, session_id)
     VALUES ($1, 'ग', 'feature_neglect', 2, gen_random_uuid())`, [U.A]));
  ok("legacy account records a session with user_id = itself", e === null, e ?? "");
  e = await rejects(db, U.A, (tx) => tx.query(
    `INSERT INTO letter_progress (user_id, letter, letter_index, mastered) VALUES ($1, 'क', 0, true)
     ON CONFLICT (user_id, letter) DO UPDATE SET mastered = EXCLUDED.mastered`, [U.A]));
  ok("legacy progress upsert on (user_id, letter) still works", e === null, e ?? "");

  e = await rejects(db, U.C, (tx) => tx.query(
    `INSERT INTO user_profiles (id, display_name, age, avatar, profile_complete)
     VALUES ($1, 'Chhaya', 6, '🐸', true)`, [U.C]));
  ok("a NEW sign-up on the old client can create its profile", e === null, e ?? "");
  ok("…and the trigger gives it the 1:1 child the old client assumes",
    (await db.query(`SELECT display_name FROM children WHERE id = $1`, [U.C])).rows[0]?.display_name === "Chhaya");
  e = await rejects(db, U.C, (tx) => tx.query(
    `INSERT INTO learning_sessions (user_id, letter, cognitive_state) VALUES ($1, 'क', 'insufficient_data')`, [U.C]));
  ok("…so its sessions are accepted", e === null, e ?? "");
  await as(db, U.C, (tx) => tx.query(`UPDATE user_profiles SET display_name = 'Chhaya R' WHERE id = $1`, [U.C]));
  ok("old-client edits to the profile reach the child row",
    (await db.query(`SELECT display_name FROM children WHERE id = $1`, [U.C])).rows[0].display_name === "Chhaya R");

  console.log("\n-- a teacher on the new client --");
  await as(db, U.T, (tx) => tx.query(`INSERT INTO user_profiles (id, role) VALUES ($1, 'teacher')`, [U.T]));
  ok("setting a role does not create a phantom child",
    (await db.query(`SELECT count(*)::int n FROM children WHERE id = $1`, [U.T])).rows[0].n === 0);
  const cls = (await as(db, U.T, (tx) => q1(tx, `SELECT * FROM create_class('Class 1A')`)))[0];
  ok("create_class returns a 6-character code from the unambiguous alphabet",
    /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/.test(cls.join_code), cls.join_code);
  const ravi = (await as(db, U.T, (tx) => q1(tx, `SELECT create_child('Ravi', 6, '🐼', $1) AS id`, [cls.class_id])))[0].id;
  ok("a teacher can create a child straight into a class",
    (await db.query(`SELECT count(*)::int n FROM class_members WHERE child_id = $1`, [ravi])).rows[0].n === 1);
  e = await rejects(db, U.T, (tx) => tx.query(
    `INSERT INTO learning_sessions (user_id, letter, cognitive_state) VALUES ($1, 'क', 'insufficient_data')`, [ravi]));
  ok("a teacher records a session for a class child (classroom tablet)", e === null, e ?? "");
  ok("…marked as recorded by the teacher",
    (await db.query(`SELECT recorded_by FROM learning_sessions WHERE user_id = $1`, [ravi])).rows[0].recorded_by === U.T);
  ok("the teacher cannot yet see a parent's child",
    (await as(db, U.T, (tx) => q1(tx, `SELECT id FROM learning_sessions WHERE user_id = $1`, [U.A]))).length === 0);

  console.log("\n-- a parent joins the class with its code --");
  ok("a parent cannot read class codes",
    (await as(db, U.A, (tx) => q1(tx, `SELECT * FROM class_join_codes`))).length === 0);
  const joined = (await as(db, U.A, (tx) =>
    q1(tx, `SELECT * FROM join_class($1, $2)`, ["  " + cls.join_code.toLowerCase() + " ", U.A])))[0];
  ok("join_class accepts the code typed in lower case with spaces", joined?.class_name === "Class 1A");
  ok("the teacher now sees that child's sessions",
    (await as(db, U.T, (tx) => q1(tx, `SELECT id FROM learning_sessions WHERE user_id = $1`, [U.A]))).length === 3);
  ok("…and the child",
    (await as(db, U.T, (tx) => q1(tx, `SELECT id FROM children WHERE id = $1`, [U.A]))).length === 1);
  const renamed = await as(db, U.T, (tx) => tx.query(`UPDATE children SET display_name = 'X' WHERE id = $1`, [U.A]));
  ok("but a class teacher cannot rename a parent's child", renamed.affectedRows === 0, String(renamed.affectedRows));
  ok("the parent sees the class name",
    (await as(db, U.A, (tx) => q1(tx, `SELECT name FROM classes`))).map((r) => r.name).join() === "Class 1A");
  ok("the parent cannot see the teacher's other child",
    (await as(db, U.A, (tx) => q1(tx, `SELECT id FROM children WHERE id = $1`, [ravi]))).length === 0);
  ok("…or that child's sessions",
    (await as(db, U.A, (tx) => q1(tx, `SELECT id FROM learning_sessions WHERE user_id = $1`, [ravi]))).length === 0);
  const gl = await as(db, U.A, (tx) => q1(tx, `SELECT * FROM list_guardians($1)`, [U.A]));
  ok("list_guardians shows the parent and the class teacher by name",
    gl.some((r) => r.name === "Asha Parent") && gl.some((r) => r.name === "Ms Tara" && r.via_class === "Class 1A"),
    JSON.stringify(gl));
  e = await rejects(db, U.T, (tx) => tx.query(`SELECT * FROM join_class($1, $2)`, [cls.join_code, U.A]));
  ok("a class teacher cannot enrol a child they do not explicitly guard", /not your child/.test(e ?? ""), e ?? "");

  console.log("\n-- leaving the class removes access --");
  await as(db, U.A, (tx) => tx.query(`DELETE FROM class_members WHERE child_id = $1`, [U.A]));
  ok("the teacher no longer sees the child's sessions",
    (await as(db, U.T, (tx) => q1(tx, `SELECT id FROM learning_sessions WHERE user_id = $1`, [U.A]))).length === 0);

  console.log("\n-- share codes --");
  await as(db, U.P, (tx) => tx.query(`INSERT INTO user_profiles (id, role) VALUES ($1, 'parent')`, [U.P]));
  const code = (await as(db, U.A, (tx) => q1(tx, `SELECT create_child_share_code($1) AS c`, [U.A])))[0].c;
  ok("a share code is 8 characters", /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{8}$/.test(code), code);
  const got = (await as(db, U.P, (tx) => q1(tx, `SELECT redeem_child_share_code($1) AS id`, [code.toLowerCase()])))[0].id;
  ok("a second parent redeems it and becomes a guardian", got === U.A);
  ok("…and sees the child's sessions",
    (await as(db, U.P, (tx) => q1(tx, `SELECT id FROM learning_sessions WHERE user_id = $1`, [U.A]))).length === 3);
  e = await rejects(db, U.T, (tx) => tx.query(`SELECT redeem_child_share_code($1)`, [code]));
  ok("a code works once", /invalid, used or expired/.test(e ?? ""), e ?? "");
  await db.query(`INSERT INTO child_share_codes (code, child_id, created_by, expires_at)
                  VALUES ('EXPIRED2', $1, $2, NOW() - INTERVAL '1 minute')`, [U.A, U.A]);
  e = await rejects(db, U.T, (tx) => tx.query(`SELECT redeem_child_share_code('EXPIRED2')`));
  ok("an expired code is refused", /invalid, used or expired/.test(e ?? ""), e ?? "");
  e = await rejects(db, U.P, (tx) => tx.query(`SELECT create_child_share_code($1)`, [ravi]));
  ok("you cannot share a child you do not guard", /not your child/.test(e ?? ""), e ?? "");
  const teacherCode = (await as(db, U.A, (tx) => q1(tx, `SELECT create_child_share_code($1) AS c`, [U.A])))[0].c;
  await as(db, U.T, (tx) => tx.query(`SELECT redeem_child_share_code($1)`, [teacherCode]));
  ok("a teacher redeeming a code becomes a teacher-guardian",
    (await db.query(`SELECT role FROM child_guardians WHERE child_id = $1 AND adult_id = $2`, [U.A, U.T])).rows[0]?.role === "teacher");
  const removedTeacher = await as(db, U.A, (tx) => tx.query(
    `DELETE FROM child_guardians WHERE child_id = $1 AND adult_id = $2`, [U.A, U.T]));
  ok("a parent can remove a teacher's access", removedTeacher.affectedRows === 1);
  const removedParent = await as(db, U.A, (tx) => tx.query(
    `DELETE FROM child_guardians WHERE child_id = $1 AND adult_id = $2`, [U.A, U.P]));
  ok("but cannot remove another parent", removedParent.affectedRows === 0);

  console.log("\n-- what nobody may do directly --");
  e = await rejects(db, U.A, (tx) => tx.query(`INSERT INTO children (display_name) VALUES ('sneaky')`));
  ok("insert a child without create_child()", e !== null, "");
  e = await rejects(db, U.A, (tx) => tx.query(
    `INSERT INTO child_guardians (child_id, adult_id, role) VALUES ($1, $2, 'parent')`, [ravi, U.A]));
  ok("make yourself a guardian of someone else's child", e !== null, "");
  e = await rejects(db, U.A, (tx) => tx.query(
    `INSERT INTO learning_sessions (user_id, letter, cognitive_state) VALUES ($1, 'क', 'x')`, [ravi]));
  ok("record a session for a child you do not guard", e !== null, "");
  e = await rejects(db, U.A, (tx) => tx.query(`SELECT * FROM create_class('mine')`));
  ok("a parent cannot create a class", /only a teacher/.test(e ?? ""), e ?? "");
  e = await rejects(db, null, (tx) => tx.query(`SELECT create_child('anon', 5, '🐻')`));
  ok("anonymous callers cannot create children", /permission denied/.test(e ?? ""), e ?? "");
  e = await rejects(db, U.A, (tx) => tx.query(`SELECT random_code(6)`));
  ok("the code generator is not callable directly", /permission denied/.test(e ?? ""), e ?? "");
  ok("no policy recursion when reading guardians",
    (await rejects(db, U.A, (tx) => tx.query(`SELECT * FROM child_guardians`))) === null);

  console.log("\n-- re-running 002 --");
  const before = (await db.query(`SELECT (SELECT count(*) FROM children)::int c, (SELECT count(*) FROM child_guardians)::int g`)).rows[0];
  let rerun = null;
  try { await db.exec(sql("002_accounts.sql")); } catch (x) { rerun = x.message; await db.exec("ROLLBACK"); }
  ok("002 is safe to run twice", rerun === null, rerun ?? "");
  const after = (await db.query(`SELECT (SELECT count(*) FROM children)::int c, (SELECT count(*) FROM child_guardians)::int g`)).rows[0];
  ok("…and duplicates nothing", before.c === after.c && before.g === after.g, `${JSON.stringify(before)} → ${JSON.stringify(after)}`);

  console.log("\n-- rollback --");
  let rb = null;
  // A failed script leaves its transaction aborted on this connection; the
  // SQL editor discards the connection, a long-lived one must roll back.
  try { await db.exec(sql("002_rollback.sql")); } catch (x) { rb = x.message; await db.exec("ROLLBACK"); }
  ok("rollback refuses once new-model children have sessions", /Refusing to roll back/.test(rb ?? ""), rb ?? "");
  ok("…and changed nothing",
    (await db.query(`SELECT count(*)::int n FROM children`)).rows[0].n === after.c);

  const clean = await fresh();
  await clean.exec(sql("002_accounts.sql"));
  let rb2 = null;
  try { await clean.exec(sql("002_rollback.sql")); } catch (x) { rb2 = x.message; await clean.exec("ROLLBACK"); }
  ok("rollback succeeds before the new client has recorded anything", rb2 === null, rb2 ?? "");
  const fk2 = (await clean.query(`
    SELECT conf.relname AS target FROM pg_constraint con
      JOIN pg_class rel ON rel.oid = con.conrelid JOIN pg_class conf ON conf.oid = con.confrelid
     WHERE con.contype = 'f' AND rel.relname = 'learning_sessions'`)).rows;
  ok("…restoring the foreign key to user_profiles", fk2.length === 1 && fk2[0].target === "user_profiles", JSON.stringify(fk2));
  ok("…and keeping every session", (await clean.query(`SELECT count(*)::int n FROM learning_sessions`)).rows[0].n === 2);
  ok("…with no new tables left behind",
    (await clean.query(`SELECT count(*)::int n FROM pg_tables WHERE schemaname='public' AND tablename IN ('children','classes')`)).rows[0].n === 0);

  console.log(`\nRESULT ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((err) => { console.error("harness error:", err); process.exit(1); });
