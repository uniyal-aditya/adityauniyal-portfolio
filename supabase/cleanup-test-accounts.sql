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

-- ═══════════════════════════════════════════════════════════════════
-- v2 ADDENDUM — two additional QA accounts found during the post-cleanup
-- probe (both created during automated bug-probe sessions):
--   • moddycorner   — posted the deleted "Test Comment", liked post #2,
--                     follows the owner (all cascade away with the user)
--   • bugprobe-check — zero footprint (sign-up flow probe only)
-- Deleting the auth.users rows cascades their profiles/likes/follows;
-- the bump_like_count trigger self-corrects the post's like_count.
-- Safe to re-run: if they're already gone, every statement is a no-op.
-- ═══════════════════════════════════════════════════════════════════

delete from auth.users
where id in (
  select id from public.profiles
  where username in ('moddycorner', 'bugprobe-check')
    and role = 'reader'   -- defensive: never touch staff accounts
);

-- ── v2 verification receipts (each must return 0) ──────────────────
select count(*) as v2_leftover_profiles from public.profiles where username in ('moddycorner', 'bugprobe-check');
select count(*) as v2_orphan_follows    from public.follows where following_id not in (select id from public.profiles) or follower_id not in (select id from public.profiles);
select count(*) as v2_orphan_likes      from public.likes   where user_id       not in (select id from public.profiles) or post_id not in (select id from public.posts);
