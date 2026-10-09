-- 17: fire the posts content guard only when `content` changes
-- (run in the Supabase SQL editor). Idempotent: safe to re-run.
--
-- 14-guard-verified.sql created posts_content_guard as BEFORE INSERT OR UPDATE
-- (any column). The view-count trigger (08-analytics-fixes.sql) runs
-- `update public.posts set view_count = view_count + 1` on every view, so the
-- guard re-parsed the whole article each time — and any legacy post whose
-- markdown alt text happens to contain a quote would have made those counter
-- updates raise, breaking view counting for that post.
--
-- Narrowing to UPDATE OF content keeps the protection on every write that can
-- change the article body (insert, or an update that sets content) and leaves
-- counter / metadata / status updates alone.
--
-- guard_posts_content() itself is unchanged (defined in 14, re-created with a
-- pinned search_path in 15).

drop trigger if exists posts_content_guard on public.posts;
create trigger posts_content_guard
  before insert or update of content on public.posts
  for each row execute function public.guard_posts_content();

-- Confirm after running (tgtype / definition should say "UPDATE OF content"):
--   select pg_get_triggerdef(oid) from pg_trigger where tgname = 'posts_content_guard';
