-- Akshara — checks to run AFTER 002_accounts.sql, in the Supabase SQL editor.
-- Read-only: nothing here changes data. Every query states what it should return.

-- 1. The six new tables exist.                       Expect: 6
SELECT count(*) AS new_tables
  FROM pg_tables
 WHERE schemaname = 'public'
   AND tablename IN ('children', 'child_guardians', 'classes',
                     'class_members', 'class_join_codes', 'child_share_codes');

-- 2. Every existing account became a parent of a child with its own id.
--                                                    Expect: 0
SELECT count(*) AS profiles_without_their_child
  FROM public.user_profiles p
 WHERE NOT EXISTS (SELECT 1 FROM public.children c WHERE c.id = p.id)
   AND NOT EXISTS (SELECT 1 FROM public.child_guardians g WHERE g.adult_id = p.id);

--                                                    Expect: 0
SELECT count(*) AS profiles_without_a_role
  FROM public.user_profiles WHERE role IS NULL;

-- 3. Every session and progress row belongs to a child.   Expect: 0, 0
SELECT
  (SELECT count(*) FROM public.learning_sessions s
    WHERE NOT EXISTS (SELECT 1 FROM public.children c WHERE c.id = s.user_id)) AS sessions_without_child,
  (SELECT count(*) FROM public.letter_progress s
    WHERE NOT EXISTS (SELECT 1 FROM public.children c WHERE c.id = s.user_id)) AS progress_without_child;

-- 4. The foreign keys moved to children.             Expect: 2 rows, both → children
SELECT rel.relname AS table_name, conf.relname AS references_table, con.conname
  FROM pg_constraint con
  JOIN pg_class rel  ON rel.oid  = con.conrelid
  JOIN pg_class conf ON conf.oid = con.confrelid
 WHERE con.contype = 'f'
   AND rel.relname IN ('learning_sessions', 'letter_progress')
   AND conf.relname IN ('user_profiles', 'children');

-- 5. Row-level security is on for every new table.   Expect: 6 rows, all true
SELECT relname, relrowsecurity
  FROM pg_class
 WHERE relname IN ('children', 'child_guardians', 'classes',
                   'class_members', 'class_join_codes', 'child_share_codes');

-- 6. The guardian policies sit beside the old ones (both kept until 003).
--                                                    Expect: users_own_sessions,
--                                                    sessions_guardians,
--                                                    users_own_progress,
--                                                    progress_guardians
SELECT tablename, policyname
  FROM pg_policies
 WHERE tablename IN ('learning_sessions', 'letter_progress')
 ORDER BY tablename, policyname;

-- 7. The functions exist, and the ones that change data are closed to anon.
--                                                    Expect: 14 rows. anon_can_execute
--                                                    is true for exactly five, all of
--                                                    which only answer questions about
--                                                    the caller: guards_explicitly,
--                                                    is_class_teacher, is_guardian,
--                                                    is_parent_of, my_role.
--                                                    false for the other nine.
SELECT p.proname,
       has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_can_execute
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
 WHERE n.nspname = 'public'
   AND p.proname IN ('guards_explicitly', 'is_parent_of', 'is_class_teacher', 'is_guardian',
                     'my_role', 'random_code', 'create_child', 'create_class',
                     'rotate_class_code', 'join_class', 'create_child_share_code',
                     'redeem_child_share_code', 'list_guardians', 'legacy_profile_child')
 ORDER BY p.proname;

-- 8. The temporary trigger for the deployed client is in place.   Expect: 1
SELECT count(*) AS legacy_trigger
  FROM pg_trigger
 WHERE tgname = 'trg_legacy_profile_child' AND NOT tgisinternal;
