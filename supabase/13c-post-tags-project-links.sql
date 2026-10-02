-- ═══════════════════════════════════════════════════════════════════
-- 13c · POST_TAGS + PROJECT_LINKS — FINISH THE FINISH
-- Run in Supabase → SQL Editor (whole file). Idempotent.
-- ───────────────────────────────────────────────────────────────────
-- Context: 13b's fixed re-run (2026-10-02) landed reading_time 3/1/1,
-- the SEO fills and all 8 tags, but the run stopped before the last two
-- statements — post_tags and project_links were still 0 rows when
-- probed via the public anon key. This file contains ONLY those two
-- statements plus the verify query, so any error points at exactly one
-- thing. Safe to re-run any number of times.
-- ═══════════════════════════════════════════════════════════════════

-- 1 · 3 tags per post — only for posts that have no tags yet, so the
--     owner's future editorial choices are never overridden.
insert into public.post_tags (post_id, tag_id)
select p.id, t.id
from (values
  ('why-i-rebuilt-my-portfolio-as-a-living-journal', 'react'),
  ('why-i-rebuilt-my-portfolio-as-a-living-journal', 'typescript'),
  ('why-i-rebuilt-my-portfolio-as-a-living-journal', 'portfolio'),
  ('shipping-the-notification-bell',                 'supabase'),
  ('shipping-the-notification-bell',                 'postgresql'),
  ('shipping-the-notification-bell',                 'triggers'),
  ('introducing-au-journal',                         'supabase'),
  ('introducing-au-journal',                         'tiptap'),
  ('introducing-au-journal',                         'design-systems')
) as m(post_slug, tag_slug)
join public.posts p on p.slug = m.post_slug and p.status = 'published'
join public.tags t on t.slug = m.tag_slug
where not exists (select 1 from public.post_tags pt where pt.post_id = p.id)
on conflict do nothing;

-- 2 · Related project — the portfolio itself, one row per post, only
--     where the post has no project link yet.
insert into public.project_links (post_id, project_name, project_url, portfolio_project_id)
select p.id,
       'Adityauniyal Portfolio',
       'https://github.com/uniyal-aditya/adityauniyal-portfolio',
       'adityauniyal-portfolio'
from public.posts p
where p.status = 'published'
  and p.slug in (
    'why-i-rebuilt-my-portfolio-as-a-living-journal',
    'shipping-the-notification-bell',
    'introducing-au-journal'
  )
  and not exists (select 1 from public.project_links pl where pl.post_id = p.id);

-- ── Verify ─────────────────────────────────────────────────────────
-- Expected (see 13b header):
--   why-i-rebuilt…   reading_time 1 · tags 3 · project_links 1 · seo_title filled
--   shipping-the…    reading_time 1 · tags 3 · project_links 1 · seo_title filled
--   introducing-au…  reading_time 3 · tags 3 · project_links 1 · seo_title filled
select p.slug,
       p.reading_time,
       (select count(*) from public.post_tags pt     where pt.post_id = p.id) as tags,
       (select count(*) from public.project_links pl where pl.post_id = p.id) as project_links,
       coalesce(p.seo_title, '—') as seo_title
from public.posts p
where p.status = 'published'
order by p.published_at;
