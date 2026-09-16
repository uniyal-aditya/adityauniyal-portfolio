-- ═══════════════════════════════════════════════════════════════════
-- AU_ / JOURNAL — cleanup receipts: remove QA test accounts
-- Run once in Supabase → SQL Editor (service context bypasses RLS).
-- ───────────────────────────────────────────────────────────────────
-- Removes everything created during automated testing:
--   • au.dashboard.sweep@gmail.com   (reader, liked/bookmarked/followed,
--                                     submitted a contributor application)
--   • au.matrix.two@gmail.com        (reader, auth matrix run)
--   • auresetproof@uberip.com        (disposable inbox, password-reset proof)
-- Cascade rules delete their profile rows, likes, bookmarks, follows,
-- reading_history, and notifications automatically.
-- The site's real content (posts, comments, series, categories) is untouched.
-- ═══════════════════════════════════════════════════════════════════

-- 1) Contributor application (user_id is ON DELETE SET NULL, so delete explicitly)
delete from public.contributor_applications
where username in ('audashboardsweep', 'aumatrixtwo', 'auresetproof')
   or user_id in (
    select id from public.profiles
    where email in (
      'au.dashboard.sweep@gmail.com',
      'au.matrix.two@gmail.com',
      'auresetproof@uberip.com'
    )
  );

-- 2) Any posts the test users may have authored (defensive — they were readers)
delete from public.posts
where author_id in (
  select id from public.profiles
  where email in (
    'au.dashboard.sweep@gmail.com',
    'au.matrix.two@gmail.com',
    'auresetproof@uberip.com'
  )
);

-- 3) The accounts themselves — cascades wipe profiles, likes, bookmarks,
--    follows, reading_history and notifications in one stroke
delete from auth.users
where email in (
  'au.dashboard.sweep@gmail.com',
  'au.matrix.two@gmail.com',
  'auresetproof@uberip.com'
);

-- ── verification receipts ──────────────────────────────────────────
-- Each query must return 0 rows after the run:
select count(*) as leftover_profiles   from public.profiles where email like 'au.%@gmail.com' or email = 'auresetproof@uberip.com';
select count(*) as leftover_apps       from public.contributor_applications where status = 'pending';
select count(*) as leftover_uploads    from storage.objects where bucket_id = 'journal-media' and owner in (
  select id from public.profiles
  where email in ('au.dashboard.sweep@gmail.com', 'au.matrix.two@gmail.com', 'auresetproof@uberip.com')
);
