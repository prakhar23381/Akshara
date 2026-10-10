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

-- ── Summary: every check above, in ONE result ────────────────────────────────
-- The Supabase SQL editor shows only the LAST statement's result when a script
-- runs, so running this whole file shows just this table. Every row should
-- read ✓. (Added after the first live run showed only check 8.)
WITH checks (n, check_name, expected, actual) AS (
  SELECT 1, 'new tables exist', '6',
         (SELECT count(*) FROM pg_tables WHERE schemaname = 'public'
            AND tablename IN ('children','child_guardians','classes','class_members',
                              'class_join_codes','child_share_codes'))::text
  UNION ALL
  SELECT 2, 'accounts without their child', '0',
         (SELECT count(*) FROM public.user_profiles p
           WHERE NOT EXISTS (SELECT 1 FROM public.children c WHERE c.id = p.id)
             AND NOT EXISTS (SELECT 1 FROM public.child_guardians g WHERE g.adult_id = p.id))::text
  UNION ALL
  SELECT 2, 'accounts without a role', '0',
         (SELECT count(*) FROM public.user_profiles WHERE role IS NULL)::text
  UNION ALL
  SELECT 3, 'sessions without a child', '0',
         (SELECT count(*) FROM public.learning_sessions s
           WHERE NOT EXISTS (SELECT 1 FROM public.children c WHERE c.id = s.user_id))::text
  UNION ALL
  SELECT 3, 'progress rows without a child', '0',
         (SELECT count(*) FROM public.letter_progress s
           WHERE NOT EXISTS (SELECT 1 FROM public.children c WHERE c.id = s.user_id))::text
  UNION ALL
  SELECT 4, 'foreign keys now pointing at children', '2',
         (SELECT count(*) FROM pg_constraint con
            JOIN pg_class rel ON rel.oid = con.conrelid JOIN pg_class conf ON conf.oid = con.confrelid
           WHERE con.contype = 'f' AND rel.relname IN ('learning_sessions','letter_progress')
             AND conf.relname = 'children')::text
  UNION ALL
  SELECT 4, 'foreign keys still pointing at user_profiles', '0',
         (SELECT count(*) FROM pg_constraint con
            JOIN pg_class rel ON rel.oid = con.conrelid JOIN pg_class conf ON conf.oid = con.confrelid
           WHERE con.contype = 'f' AND rel.relname IN ('learning_sessions','letter_progress')
             AND conf.relname = 'user_profiles')::text
  UNION ALL
  SELECT 5, 'new tables with row-level security on', '6',
         (SELECT count(*) FROM pg_class
           WHERE relrowsecurity
             AND relname IN ('children','child_guardians','classes','class_members',
                             'class_join_codes','child_share_codes'))::text
  UNION ALL
  SELECT 6, 'guardian policies on sessions + progress', '2',
         (SELECT count(*) FROM pg_policies
           WHERE policyname IN ('sessions_guardians','progress_guardians'))::text
  UNION ALL
  SELECT 6, 'old policies kept until 003', '2',
         (SELECT count(*) FROM pg_policies
           WHERE policyname IN ('users_own_sessions','users_own_progress'))::text
  UNION ALL
  SELECT 7, 'functions present', '14',
         (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
           WHERE n.nspname = 'public'
             AND p.proname IN ('guards_explicitly','is_parent_of','is_class_teacher','is_guardian',
                               'my_role','random_code','create_child','create_class',
                               'rotate_class_code','join_class','create_child_share_code',
                               'redeem_child_share_code','list_guardians','legacy_profile_child'))::text
  UNION ALL
  SELECT 7, 'functions anon can call (read-only helpers only)', '5',
         (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
           WHERE n.nspname = 'public'
             AND has_function_privilege('anon', p.oid, 'EXECUTE')
             AND p.proname IN ('guards_explicitly','is_parent_of','is_class_teacher','is_guardian',
                               'my_role','random_code','create_child','create_class',
                               'rotate_class_code','join_class','create_child_share_code',
                               'redeem_child_share_code','list_guardians','legacy_profile_child'))::text
  UNION ALL
  SELECT 8, 'temporary trigger for the deployed client', '1',
         (SELECT count(*) FROM pg_trigger
           WHERE tgname = 'trg_legacy_profile_child' AND NOT tgisinternal)::text
)
SELECT n AS "#", check_name, expected, actual,
       CASE WHEN expected = actual THEN '✓' ELSE '✗ look at this' END AS result
  FROM checks
 ORDER BY n, check_name;
