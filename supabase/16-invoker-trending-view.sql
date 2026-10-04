-- 16: make trending_posts a SECURITY INVOKER view (run in the Supabase SQL editor)
-- Idempotent: safe to re-run. Clears the security advisor's only ERROR-level
-- finding (0010 security_definer_view): the view was created by 01-schema.sql
-- without `security_invoker`, so it enforced the postgres owner's permissions
-- and RLS instead of the querying user's.
--
-- Why this is safe here:
--   * The app never reads this view. Trending on the site goes through the
--     get_trending_posts RPC (03-rpc.sql), which has always been SECURITY
--     INVOKER — this change makes the view match the RPC's semantics.
--   * Drafts still cannot leak: the view filters `status = 'published'` and
--     posts_public_read already limits non-admins to published rows.
--   * Raw engagement rows still cannot leak: the view only exposes per-post
--     aggregates, and the underlying tables keep their own policies
--     (post_views: admin-only select; bookmarks: owner-only select).
--
-- Behavioral note (same as the RPC): under invoker RLS, recent_views is 0
-- for non-admin callers and recent_bookmarks only reflects the caller's own
-- rows. The trend_score is therefore effectively recency-decayed likes for
-- public callers — true whether this view or the RPC is used.

alter view public.trending_posts set (security_invoker = true);

-- Confirm after running (should show security_invoker=true):
--   select reloptions from pg_class where oid = 'public.trending_posts'::regclass;
