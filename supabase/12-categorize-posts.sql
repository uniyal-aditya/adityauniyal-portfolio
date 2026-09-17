-- ═══════════════════════════════════════════════════════════════════
-- 12 · CATEGORIZE EXISTING POSTS
-- One-off data fix: the two early posts were published before
-- categories were being set. Idempotent — safe to re-run.
-- Run in Supabase → SQL Editor (runs as postgres, bypasses RLS).
-- ───────────────────────────────────────────────────────────────────

-- Build log about shipping the notification bell → Engineering
update public.posts
set category_id = (select id from public.categories where slug = 'engineering')
where slug = 'shipping-the-notification-bell'
  and category_id is null;

-- Reflective article about rebuilding the portfolio → Web
update public.posts
set category_id = (select id from public.categories where slug = 'web')
where slug = 'why-i-rebuilt-my-portfolio-as-a-living-journal'
  and category_id is null;

-- Verify: every published post should now show a category
select p.slug, p.post_type, c.name as category
from public.posts p
left join public.categories c on c.id = p.category_id
where p.status = 'published'
order by p.published_at;
