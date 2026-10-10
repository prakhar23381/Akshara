-- Akshara — rollback of migration 002.
--
-- Only valid BEFORE the new client has recorded anything. Once a parent or
-- teacher has added a child under the new model, that child's sessions point
-- at a `children` row with no matching user_profiles row; putting the old
-- foreign key back would have to delete them. This script checks for that and
-- refuses rather than lose a child's history.
--
-- One transaction: it either rolls back completely or not at all.

BEGIN;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.learning_sessions s
              WHERE NOT EXISTS (SELECT 1 FROM public.user_profiles p WHERE p.id = s.user_id))
  OR EXISTS (SELECT 1 FROM public.letter_progress s
              WHERE NOT EXISTS (SELECT 1 FROM public.user_profiles p WHERE p.id = s.user_id))
  THEN
    RAISE EXCEPTION
      'Refusing to roll back 002: sessions or progress exist for children created '
      'under the new model, and the old foreign key would have to delete them.';
  END IF;
END $$;

DROP TRIGGER IF EXISTS trg_legacy_profile_child ON public.user_profiles;

DROP POLICY IF EXISTS sessions_guardians ON public.learning_sessions;
DROP POLICY IF EXISTS progress_guardians ON public.letter_progress;

ALTER TABLE public.learning_sessions DROP CONSTRAINT IF EXISTS learning_sessions_child_fkey;
ALTER TABLE public.letter_progress   DROP CONSTRAINT IF EXISTS letter_progress_child_fkey;
ALTER TABLE public.learning_sessions DROP CONSTRAINT IF EXISTS learning_sessions_user_id_fkey;
ALTER TABLE public.letter_progress   DROP CONSTRAINT IF EXISTS letter_progress_user_id_fkey;
ALTER TABLE public.learning_sessions
  ADD CONSTRAINT learning_sessions_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.user_profiles(id) ON DELETE CASCADE;
ALTER TABLE public.letter_progress
  ADD CONSTRAINT letter_progress_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.user_profiles(id) ON DELETE CASCADE;

ALTER TABLE public.learning_sessions DROP COLUMN IF EXISTS recorded_by;

-- CASCADE because the new tables depend on each other — `classes` has a
-- policy that reads `class_members`, which has a foreign key to `classes` — so
-- no drop order works without it. It is safe: every link from the original
-- tables into these (the foreign keys and the guardian policies above) is
-- already gone, so the cascade can only reach objects 002 created.
DROP TABLE IF EXISTS
  public.child_share_codes,
  public.class_join_codes,
  public.class_members,
  public.classes,
  public.child_guardians,
  public.children
  CASCADE;

DROP FUNCTION IF EXISTS public.legacy_profile_child();
DROP FUNCTION IF EXISTS public.list_guardians(UUID);
DROP FUNCTION IF EXISTS public.redeem_child_share_code(TEXT);
DROP FUNCTION IF EXISTS public.create_child_share_code(UUID);
DROP FUNCTION IF EXISTS public.join_class(TEXT, UUID);
DROP FUNCTION IF EXISTS public.rotate_class_code(UUID);
DROP FUNCTION IF EXISTS public.create_class(TEXT);
DROP FUNCTION IF EXISTS public.create_child(TEXT, INT, TEXT, UUID);
DROP FUNCTION IF EXISTS public.my_role();
DROP FUNCTION IF EXISTS public.random_code(INT);
DROP FUNCTION IF EXISTS public.is_guardian(UUID);
DROP FUNCTION IF EXISTS public.is_class_teacher(UUID);
DROP FUNCTION IF EXISTS public.is_parent_of(UUID);
DROP FUNCTION IF EXISTS public.guards_explicitly(UUID);

ALTER TABLE public.user_profiles DROP COLUMN IF EXISTS pin_hash;
ALTER TABLE public.user_profiles DROP COLUMN IF EXISTS role;

COMMIT;
