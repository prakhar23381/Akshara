-- Akshara — migration 002: adults own children; classes; share codes; adult PIN
--
-- Run AFTER 000_init.sql and 001_session_model.sql, in the Supabase SQL editor.
-- Safe to run more than once. Runs in one transaction: if any statement fails,
-- nothing is applied.
--
-- Why this exists
-- ---------------
-- One Google account was one child. `user_profiles.id` is the auth user's id
-- and holds the child's name, age and avatar, and every policy is
-- `auth.uid() = user_id`. So a parent with two children needed two Google
-- accounts, a teacher had to sign in as each child in turn, and the Parent and
-- Teacher buttons in the app were the same code.
--
-- The new model: adults sign in; children are rows adults own.
--
--   user_profiles     now the ADULT: gains `role` (parent | teacher) and
--                     `pin_hash` (the lock on the adult area).
--   children          a child. No login, no email.
--   child_guardians   which adults may see and record for which child.
--   classes           a teacher's named class.
--   class_members     which children are in which class. Being a class's
--                     teacher grants access to its children — derived, not
--                     copied, so removing a child from a class removes it.
--   class_join_codes  the code a parent enters to put their child in a class.
--                     Its own table so a parent who can see the class name
--                     cannot read the code and pass it on.
--   child_share_codes single-use, 7-day codes that make another adult a
--                     guardian of an existing child.
--
-- How existing data carries over — without rewriting a single row
-- ----------------------------------------------------------------
-- `learning_sessions.user_id` and `letter_progress.user_id` keep their name
-- and become "the child this row is about". Their foreign key moves from
-- `user_profiles` to `children`. Every existing account becomes a parent with
-- ONE child whose id IS the account's id, plus a guardian link to itself.
--
-- So for every existing row `user_id` already names the right child; the
-- unique key on letter_progress (user_id, letter) stays correct per child; and
-- the client that is deployed today — which writes `user_id = auth.uid()` —
-- keeps passing every check. A temporary trigger keeps new sign-ups on that
-- old client working too, until the new client ships. Migration 003 removes
-- the trigger and the old policies once it has.
--
-- Note for the client: on a migrated account, `user_profiles.display_name`,
-- `age` and `avatar` describe the CHILD (they were copied into `children`).
-- The new client must not write those three columns; the trigger below mirrors
-- them into the child row, which is right only for the old client.

BEGIN;

-- ── 1. The adult profile ──────────────────────────────────────────────────────
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS role TEXT CHECK (role IN ('parent', 'teacher')),
  -- SHA-256 of the account id and the 4-digit PIN, computed on the client.
  -- Ten thousand possible PINs: this keeps a child at the device out of the
  -- adult area. It is not protection against someone holding the database,
  -- and row-level security already limits it to its owner.
  ADD COLUMN IF NOT EXISTS pin_hash TEXT;

-- ── 2. Children and their guardians ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.children (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name TEXT NOT NULL,
  age          INT,
  avatar       TEXT,
  created_by   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Soft delete. A child's history is the record a parent or specialist
  -- relies on, so removing a child hides it rather than destroying it.
  archived_at  TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.child_guardians (
  child_id UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  adult_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role     TEXT NOT NULL CHECK (role IN ('parent', 'teacher')),
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (child_id, adult_id)
);
CREATE INDEX IF NOT EXISTS idx_guardians_adult ON public.child_guardians (adult_id);

-- ── 3. Classes ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.classes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_classes_teacher ON public.classes (teacher_id);

CREATE TABLE IF NOT EXISTS public.class_members (
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  added_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (class_id, child_id)
);
CREATE INDEX IF NOT EXISTS idx_members_child ON public.class_members (child_id);

CREATE TABLE IF NOT EXISTS public.class_join_codes (
  class_id   UUID PRIMARY KEY REFERENCES public.classes(id) ON DELETE CASCADE,
  code       TEXT NOT NULL UNIQUE,
  rotated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.child_share_codes (
  code        TEXT PRIMARY KEY,
  child_id    UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  created_by  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '7 days',
  redeemed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  redeemed_at TIMESTAMPTZ
);

-- ── 4. Who recorded a session ────────────────────────────────────────────────
-- `user_id` is the child; this is the adult signed in when it was recorded, so
-- a teacher can tell a school session from a home one. Filled by the default;
-- the client never sends it.
ALTER TABLE public.learning_sessions
  ADD COLUMN IF NOT EXISTS recorded_by UUID DEFAULT auth.uid()
    REFERENCES auth.users(id) ON DELETE SET NULL;

-- ── 5. Backfill: every existing account becomes a parent of one child ────────
-- The child takes the account's own id, so nothing that points at it changes.
--
-- Only profiles with no role. On the first run that is every profile, since
-- the column was added above. On a re-run, an adult created by the new client
-- already has a role and owns children by their own ids — turning their
-- profile into a child as well would invent a phantom child for every parent
-- and teacher. (Found by testing a re-run, which did exactly that.)
INSERT INTO public.children (id, display_name, age, avatar, created_by, created_at)
SELECT p.id,
       COALESCE(NULLIF(TRIM(p.display_name), ''), 'Child'),
       p.age,
       p.avatar,
       p.id,
       COALESCE(p.created_at, NOW())
  FROM public.user_profiles p
 WHERE p.role IS NULL
ON CONFLICT (id) DO NOTHING;

-- Belt and braces: any session or progress row whose user_id has no profile
-- (possible only if the old foreign key was ever missing) still gets a child,
-- so re-pointing the foreign key below cannot fail on it.
INSERT INTO public.children (id, display_name, created_by)
SELECT DISTINCT orphan.user_id,
       'Child',
       CASE WHEN EXISTS (SELECT 1 FROM auth.users u WHERE u.id = orphan.user_id)
            THEN orphan.user_id END
  FROM (SELECT user_id FROM public.learning_sessions
        UNION
        SELECT user_id FROM public.letter_progress) AS orphan
 WHERE orphan.user_id IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM public.children c WHERE c.id = orphan.user_id)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.child_guardians (child_id, adult_id, role)
SELECT c.id, c.id, 'parent'
  FROM public.children c
 WHERE c.created_by = c.id
ON CONFLICT (child_id, adult_id) DO NOTHING;

UPDATE public.user_profiles p
   SET role = 'parent'
 WHERE p.role IS NULL
   AND EXISTS (SELECT 1 FROM public.child_guardians g
                WHERE g.child_id = p.id AND g.adult_id = p.id);

UPDATE public.learning_sessions
   SET recorded_by = user_id
 WHERE recorded_by IS NULL
   AND EXISTS (SELECT 1 FROM auth.users u WHERE u.id = learning_sessions.user_id);

-- ── 6. Sessions and progress now belong to a child ───────────────────────────
-- Drop whatever foreign key points user_id at user_profiles — looked up rather
-- than named, because the live constraint names were generated, not chosen.
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT con.conname, rel.relname
      FROM pg_constraint con
      JOIN pg_class rel ON rel.oid = con.conrelid
      JOIN pg_namespace ns ON ns.oid = rel.relnamespace
     WHERE ns.nspname = 'public'
       AND con.contype = 'f'
       AND rel.relname IN ('learning_sessions', 'letter_progress')
       AND con.confrelid = 'public.user_profiles'::regclass
  LOOP
    EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT %I', r.relname, r.conname);
  END LOOP;
END $$;

ALTER TABLE public.learning_sessions DROP CONSTRAINT IF EXISTS learning_sessions_child_fkey;
ALTER TABLE public.learning_sessions
  ADD CONSTRAINT learning_sessions_child_fkey
  FOREIGN KEY (user_id) REFERENCES public.children(id) ON DELETE CASCADE;

ALTER TABLE public.letter_progress DROP CONSTRAINT IF EXISTS letter_progress_child_fkey;
ALTER TABLE public.letter_progress
  ADD CONSTRAINT letter_progress_child_fkey
  FOREIGN KEY (user_id) REFERENCES public.children(id) ON DELETE CASCADE;

-- ── 7. Access helpers ────────────────────────────────────────────────────────
-- SECURITY DEFINER so they read the membership tables without going through
-- those tables' own policies. Without that, a policy on child_guardians that
-- asks "is this adult a guardian?" would query child_guardians, whose policy
-- asks again — Postgres rejects it as infinite recursion.
-- They only ever answer questions about the caller, so anyone may call them.

-- An explicit guardian: a parent, or an adult who redeemed a share code or
-- created the child.
CREATE OR REPLACE FUNCTION public.guards_explicitly(p_child UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.child_guardians g
     WHERE g.child_id = p_child AND g.adult_id = auth.uid()
  );
$$;

-- A parent of this child (not merely a teacher with access).
CREATE OR REPLACE FUNCTION public.is_parent_of(p_child UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.child_guardians g
     WHERE g.child_id = p_child AND g.adult_id = auth.uid() AND g.role = 'parent'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_class_teacher(p_class UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.classes c
     WHERE c.id = p_class AND c.teacher_id = auth.uid()
  );
$$;

-- May this adult see and record for this child? Explicit guardians, and the
-- teacher of any active class the child is in.
CREATE OR REPLACE FUNCTION public.is_guardian(p_child UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.guards_explicitly(p_child)
      OR EXISTS (
        SELECT 1
          FROM public.class_members m
          JOIN public.classes c ON c.id = m.class_id
         WHERE m.child_id = p_child
           AND c.teacher_id = auth.uid()
           AND c.archived_at IS NULL
      );
$$;

-- Codes: 31 symbols with the look-alikes removed (no 0/O, 1/I/L), so a code
-- read off a screen or a note home is typed correctly. Entropy comes from
-- gen_random_uuid, which uses the system CSPRNG; md5 spreads it evenly.
CREATE OR REPLACE FUNCTION public.random_code(p_len INT)
RETURNS TEXT LANGUAGE plpgsql VOLATILE SET search_path = public AS $$
DECLARE
  alphabet CONSTANT TEXT := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  bytes BYTEA := decode(md5(gen_random_uuid()::text), 'hex');
  out TEXT := '';
BEGIN
  IF p_len < 1 OR p_len > 16 THEN
    RAISE EXCEPTION 'code length must be 1..16';
  END IF;
  FOR i IN 0 .. p_len - 1 LOOP
    out := out || substr(alphabet, (get_byte(bytes, i) % 31) + 1, 1);
  END LOOP;
  RETURN out;
END $$;

-- ── 8. Policies ──────────────────────────────────────────────────────────────
ALTER TABLE public.children          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.child_guardians   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_members     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_join_codes  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.child_share_codes ENABLE ROW LEVEL SECURITY;

-- children: guardians read; only explicit guardians edit (a class teacher may
-- not rename a parent's child). Created only through create_child(), so the
-- guardian link is made in the same step. No delete: archive instead.
DROP POLICY IF EXISTS children_read ON public.children;
CREATE POLICY children_read ON public.children
  FOR SELECT USING (public.is_guardian(id));
DROP POLICY IF EXISTS children_edit ON public.children;
CREATE POLICY children_edit ON public.children
  FOR UPDATE USING (public.guards_explicitly(id))
  WITH CHECK (public.guards_explicitly(id));

-- child_guardians: see your own links and your children's other guardians, so
-- a parent can see which teachers have access. Leave a child yourself, or as a
-- parent remove a non-parent. Links are only created by the functions below.
DROP POLICY IF EXISTS guardians_read ON public.child_guardians;
CREATE POLICY guardians_read ON public.child_guardians
  FOR SELECT USING (adult_id = auth.uid() OR public.is_guardian(child_id));
DROP POLICY IF EXISTS guardians_remove ON public.child_guardians;
CREATE POLICY guardians_remove ON public.child_guardians
  FOR DELETE USING (
    adult_id = auth.uid()
    OR (role <> 'parent' AND public.is_parent_of(child_id))
  );

-- classes: the teacher manages them; a guardian of a member child can see the
-- class (its name), not its code. Created through create_class().
DROP POLICY IF EXISTS classes_read ON public.classes;
CREATE POLICY classes_read ON public.classes
  FOR SELECT USING (
    teacher_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.class_members m
                WHERE m.class_id = classes.id
                  AND public.guards_explicitly(m.child_id))
  );
DROP POLICY IF EXISTS classes_manage ON public.classes;
CREATE POLICY classes_manage ON public.classes
  FOR UPDATE USING (teacher_id = auth.uid()) WITH CHECK (teacher_id = auth.uid());
DROP POLICY IF EXISTS classes_delete ON public.classes;
CREATE POLICY classes_delete ON public.classes
  FOR DELETE USING (teacher_id = auth.uid());

-- class_members: the teacher and the child's own guardians see it. A teacher
-- may add a child they explicitly guard (one they created); a parent adds
-- their child through join_class(). Either side can take a child out.
DROP POLICY IF EXISTS members_read ON public.class_members;
CREATE POLICY members_read ON public.class_members
  FOR SELECT USING (public.is_class_teacher(class_id) OR public.guards_explicitly(child_id));
DROP POLICY IF EXISTS members_add ON public.class_members;
CREATE POLICY members_add ON public.class_members
  FOR INSERT WITH CHECK (public.is_class_teacher(class_id) AND public.guards_explicitly(child_id));
DROP POLICY IF EXISTS members_remove ON public.class_members;
CREATE POLICY members_remove ON public.class_members
  FOR DELETE USING (public.is_class_teacher(class_id) OR public.guards_explicitly(child_id));

-- class_join_codes: the teacher only. Changed through rotate_class_code().
DROP POLICY IF EXISTS join_codes_read ON public.class_join_codes;
CREATE POLICY join_codes_read ON public.class_join_codes
  FOR SELECT USING (public.is_class_teacher(class_id));

-- child_share_codes: whoever made a code can list and revoke it. Redeemed
-- only through redeem_child_share_code(), which is the one place it is read.
DROP POLICY IF EXISTS share_codes_read ON public.child_share_codes;
CREATE POLICY share_codes_read ON public.child_share_codes
  FOR SELECT USING (created_by = auth.uid());
DROP POLICY IF EXISTS share_codes_revoke ON public.child_share_codes;
CREATE POLICY share_codes_revoke ON public.child_share_codes
  FOR DELETE USING (created_by = auth.uid());

-- Sessions and progress: any guardian, including a class teacher recording on
-- a classroom tablet. Added alongside the old `auth.uid() = user_id` policies,
-- which stay until 003 so the deployed client keeps working; policies of the
-- same command are OR'd, so this only widens access to genuine guardians.
DROP POLICY IF EXISTS sessions_guardians ON public.learning_sessions;
CREATE POLICY sessions_guardians ON public.learning_sessions
  FOR ALL USING (public.is_guardian(user_id)) WITH CHECK (public.is_guardian(user_id));
DROP POLICY IF EXISTS progress_guardians ON public.letter_progress;
CREATE POLICY progress_guardians ON public.letter_progress
  FOR ALL USING (public.is_guardian(user_id)) WITH CHECK (public.is_guardian(user_id));

-- ── 9. Operations ────────────────────────────────────────────────────────────
-- Everything that creates a link or a code goes through one of these, so the
-- checks live in one place and two-step writes (a child and its guardian link)
-- cannot be half-done.

CREATE OR REPLACE FUNCTION public.my_role()
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM public.user_profiles WHERE id = auth.uid();
$$;

-- A new child, guarded by the caller in the caller's role. A teacher may put
-- the child straight into one of their classes.
CREATE OR REPLACE FUNCTION public.create_child(
  p_name TEXT, p_age INT, p_avatar TEXT, p_class UUID DEFAULT NULL)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_role TEXT := public.my_role();
  v_id   UUID;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'sign in first'; END IF;
  IF v_role IS NULL THEN RAISE EXCEPTION 'choose parent or teacher first'; END IF;
  IF COALESCE(TRIM(p_name), '') = '' THEN RAISE EXCEPTION 'a child needs a name'; END IF;
  IF p_class IS NOT NULL AND NOT public.is_class_teacher(p_class) THEN
    RAISE EXCEPTION 'not your class';
  END IF;

  INSERT INTO public.children (display_name, age, avatar, created_by)
  VALUES (TRIM(p_name), p_age, p_avatar, auth.uid())
  RETURNING id INTO v_id;

  INSERT INTO public.child_guardians (child_id, adult_id, role)
  VALUES (v_id, auth.uid(), v_role);

  IF p_class IS NOT NULL THEN
    INSERT INTO public.class_members (class_id, child_id, added_by)
    VALUES (p_class, v_id, auth.uid());
  END IF;
  RETURN v_id;
END $$;

-- A class and its join code. Teachers only.
CREATE OR REPLACE FUNCTION public.create_class(p_name TEXT)
RETURNS TABLE (class_id UUID, join_code TEXT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_id   UUID;
  v_code TEXT;
BEGIN
  IF public.my_role() IS DISTINCT FROM 'teacher' THEN
    RAISE EXCEPTION 'only a teacher can create a class';
  END IF;
  IF COALESCE(TRIM(p_name), '') = '' THEN RAISE EXCEPTION 'a class needs a name'; END IF;

  INSERT INTO public.classes (teacher_id, name) VALUES (auth.uid(), TRIM(p_name))
  RETURNING id INTO v_id;

  FOR attempt IN 1 .. 8 LOOP
    v_code := public.random_code(6);
    BEGIN
      INSERT INTO public.class_join_codes (class_id, code) VALUES (v_id, v_code);
      class_id := v_id; join_code := v_code;
      RETURN NEXT;
      RETURN;
    EXCEPTION WHEN unique_violation THEN
      NULL;  -- collision with another class's code: draw again
    END;
  END LOOP;
  RAISE EXCEPTION 'could not generate a unique class code';
END $$;

-- A new code for a class; the old one stops working. Teacher only.
CREATE OR REPLACE FUNCTION public.rotate_class_code(p_class UUID)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_code TEXT;
BEGIN
  IF NOT public.is_class_teacher(p_class) THEN RAISE EXCEPTION 'not your class'; END IF;
  FOR attempt IN 1 .. 8 LOOP
    v_code := public.random_code(6);
    BEGIN
      INSERT INTO public.class_join_codes (class_id, code) VALUES (p_class, v_code)
      ON CONFLICT (class_id) DO UPDATE SET code = EXCLUDED.code, rotated_at = NOW();
      RETURN v_code;
    EXCEPTION WHEN unique_violation THEN
      NULL;  -- collision: draw again
    END;
  END LOOP;
  RAISE EXCEPTION 'could not generate a unique class code';
END $$;

-- A parent puts their own child into a class by its code. That alone gives the
-- teacher access, through is_guardian(); taking the child out again removes it.
CREATE OR REPLACE FUNCTION public.join_class(p_code TEXT, p_child UUID)
RETURNS TABLE (class_id UUID, class_name TEXT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_class UUID;
  v_name  TEXT;
BEGIN
  IF NOT public.guards_explicitly(p_child) THEN RAISE EXCEPTION 'not your child'; END IF;

  SELECT c.id, c.name INTO v_class, v_name
    FROM public.class_join_codes j
    JOIN public.classes c ON c.id = j.class_id
   WHERE j.code = UPPER(TRIM(p_code)) AND c.archived_at IS NULL;
  IF v_class IS NULL THEN RAISE EXCEPTION 'no class with that code'; END IF;

  INSERT INTO public.class_members (class_id, child_id, added_by)
  VALUES (v_class, p_child, auth.uid())
  ON CONFLICT DO NOTHING;

  class_id := v_class; class_name := v_name;
  RETURN NEXT;
END $$;

-- A code that lets one other adult become a guardian of this child — a parent
-- claiming a child a teacher set up, or a second parent. Eight characters,
-- single use, seven days.
CREATE OR REPLACE FUNCTION public.create_child_share_code(p_child UUID)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_code TEXT;
BEGIN
  IF NOT public.guards_explicitly(p_child) THEN RAISE EXCEPTION 'not your child'; END IF;
  FOR attempt IN 1 .. 8 LOOP
    v_code := public.random_code(8);
    BEGIN
      INSERT INTO public.child_share_codes (code, child_id, created_by)
      VALUES (v_code, p_child, auth.uid());
      RETURN v_code;
    EXCEPTION WHEN unique_violation THEN
      NULL;  -- collision: draw again
    END;
  END LOOP;
  RAISE EXCEPTION 'could not generate a unique share code';
END $$;

-- Redeem a share code: the caller becomes a guardian, in their own role.
CREATE OR REPLACE FUNCTION public.redeem_child_share_code(p_code TEXT)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_role  TEXT := public.my_role();
  v_child UUID;
BEGIN
  IF v_role IS NULL THEN RAISE EXCEPTION 'choose parent or teacher first'; END IF;

  -- Claim the code and read it in one statement, so two adults redeeming the
  -- same code at once cannot both succeed.
  UPDATE public.child_share_codes
     SET redeemed_by = auth.uid(), redeemed_at = NOW()
   WHERE code = UPPER(TRIM(p_code))
     AND redeemed_at IS NULL
     AND expires_at > NOW()
  RETURNING child_id INTO v_child;
  IF v_child IS NULL THEN RAISE EXCEPTION 'that code is invalid, used or expired'; END IF;

  INSERT INTO public.child_guardians (child_id, adult_id, role)
  VALUES (v_child, auth.uid(), v_role)
  ON CONFLICT (child_id, adult_id) DO NOTHING;
  RETURN v_child;
END $$;

-- Who can see this child, with display names from their Google profile — so a
-- parent can see which teachers have access, and remove one.
CREATE OR REPLACE FUNCTION public.list_guardians(p_child UUID)
RETURNS TABLE (adult_id UUID, role TEXT, name TEXT, via_class TEXT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT g.adult_id, g.role,
         COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name',
                  INITCAP(g.role)),
         NULL::TEXT
    FROM public.child_guardians g
    JOIN auth.users u ON u.id = g.adult_id
   WHERE g.child_id = p_child AND public.is_guardian(p_child)
  UNION ALL
  SELECT c.teacher_id, 'teacher',
         COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', 'Teacher'),
         c.name
    FROM public.class_members m
    JOIN public.classes c ON c.id = m.class_id AND c.archived_at IS NULL
    JOIN auth.users u ON u.id = c.teacher_id
   WHERE m.child_id = p_child AND public.is_guardian(p_child);
$$;

-- Signed-in users only, for everything that changes data or issues codes.
REVOKE ALL ON FUNCTION public.random_code(INT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_child(TEXT, INT, TEXT, UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.create_class(TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.rotate_class_code(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.join_class(TEXT, UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.create_child_share_code(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.redeem_child_share_code(TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.list_guardians(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_child(TEXT, INT, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_class(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rotate_class_code(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_class(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_child_share_code(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_child_share_code(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_guardians(UUID) TO authenticated;

-- ── 10. TEMPORARY: keep the deployed client working ──────────────────────────
-- The client in production today knows nothing of `children`: a new sign-up
-- creates a user_profiles row (with no role) and then records sessions with
-- user_id = its own id. Without a matching child row, the new foreign key
-- would reject every one of them.
--
-- So a profile created without a role gets a child with its own id and a
-- guardian link — exactly the 1:1 shape the old client assumes — and becomes a
-- parent. The new client always sets `role`, so it never triggers this. And
-- the old client editing name/age/avatar on that profile is editing the child,
-- so those edits are mirrored into it.
--
-- REMOVE IN 003, once no deployed client predates this migration.
CREATE OR REPLACE FUNCTION public.legacy_profile_child()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.role IS NULL THEN
    INSERT INTO public.children (id, display_name, age, avatar, created_by)
    VALUES (NEW.id, COALESCE(NULLIF(TRIM(NEW.display_name), ''), 'Child'),
            NEW.age, NEW.avatar, NEW.id)
    ON CONFLICT (id) DO NOTHING;
    INSERT INTO public.child_guardians (child_id, adult_id, role)
    VALUES (NEW.id, NEW.id, 'parent')
    ON CONFLICT (child_id, adult_id) DO NOTHING;
    NEW.role := 'parent';
  ELSIF TG_OP = 'UPDATE' AND (
        NEW.display_name IS DISTINCT FROM OLD.display_name
     OR NEW.age          IS DISTINCT FROM OLD.age
     OR NEW.avatar       IS DISTINCT FROM OLD.avatar) THEN
    UPDATE public.children
       SET display_name = COALESCE(NULLIF(TRIM(NEW.display_name), ''), display_name),
           age          = NEW.age,
           avatar       = NEW.avatar
     WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_legacy_profile_child ON public.user_profiles;
CREATE TRIGGER trg_legacy_profile_child
  BEFORE INSERT OR UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.legacy_profile_child();
-- Nobody calls it directly; a trigger fires without the caller needing EXECUTE.
REVOKE ALL ON FUNCTION public.legacy_profile_child() FROM PUBLIC, anon, authenticated;

COMMIT;
