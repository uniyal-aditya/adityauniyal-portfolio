-- ═══════════════════════════════════════════════════════════════════
-- 13 · POST METADATA BACKFILL
-- Run once in Supabase → SQL Editor. Idempotent (safe to re-run).
-- ───────────────────────────────────────────────────────────────────
-- Fixes the four gaps found in the metadata audit:
--   1. reading_time  → recomputed for published posts using the site's
--      own formula (plain-text words / 200, min 1) so the flagship's
--      "6 min" becomes the honest ~3.
--   2. seo_title / seo_description → filled ONLY where still null,
--      so hand-written values are never overwritten on re-run.
--   3. tags → seeds a curated tag set and applies 3 tags per post,
--      but only to posts that currently have no tags at all.
--   4. project_links → links each post to the portfolio project
--      (same convention the editor's auto-fill uses), only when the
--      post has no project link yet.
-- ───────────────────────────────────────────────────────────────────

-- 1 · Recompute reading_time from content (words/200, min 1) ────────
with words as (
  select id,
    array_length(
      regexp_split_to_array(
        trim(
          regexp_replace(
            regexp_replace(content, '<[^>]+>', ' ', 'g'),   -- strip html tags if any
            '[#*`>|_~\[\]()=-]', ' ', 'g'                    -- strip markdown punctuation
          )
        ),
        '\s+'
      ),
      1
    ) as n
  from public.posts
  where status = 'published'
)
update public.posts p
set reading_time = greatest(1, coalesce(round(w.n::numeric / 200)::int, 1))
from words w
where p.id = w.id;

-- 2 · SEO fields — only where still empty ───────────────────────────
update public.posts
set seo_title       = 'Why I rebuilt my portfolio as a living journal — Aditya Uniyal',
    seo_description = 'How a static portfolio became a living journal: React, Supabase and honest analytics — and what I would do differently.'
where slug = 'why-i-rebuilt-my-portfolio-as-a-living-journal'
  and seo_title is null;

update public.posts
set seo_title       = 'Shipping the notification bell — AU_ / JOURNAL build log',
    seo_description = 'Build log: in-app follower notifications powered by a single Postgres trigger — no cron, no email, no polling.'
where slug = 'shipping-the-notification-bell'
  and seo_title is null;

-- 3 · Tags ──────────────────────────────────────────────────────────
insert into public.tags (name, slug) values
  ('React',          'react'),
  ('TypeScript',     'typescript'),
  ('Portfolio',      'portfolio'),
  ('Supabase',       'supabase'),
  ('PostgreSQL',     'postgresql'),
  ('Triggers',       'triggers'),
  ('Tiptap',         'tiptap'),
  ('Design Systems', 'design-systems')
on conflict do nothing;

-- Apply 3 tags per post — but only to posts that have no tags yet,
-- so the owner's future editorial choices are never overridden.
insert into public.post_tags (post_id, tag_id)
select p.id, t.id
from public.posts p
join public.tags t
  on (p.slug, t.slug) in (
    ('why-i-rebuilt-my-portfolio-as-a-living-journal', 'react'),
    ('why-i-rebuilt-my-portfolio-as-a-living-journal', 'typescript'),
    ('why-i-rebuilt-my-portfolio-as-a-living-journal', 'portfolio'),
    ('shipping-the-notification-bell',                 'supabase'),
    ('shipping-the-notification-bell',                 'postgresql'),
    ('shipping-the-notification-bell',                 'triggers'),
    ('introducing-au-journal',                         'supabase'),
    ('introducing-au-journal',                         'tiptap'),
    ('introducing-au-journal',                         'design-systems')
  )
where p.status = 'published'
  and not exists (select 1 from public.post_tags pt where pt.post_id = p.id)
on conflict do nothing;

-- 4 · Related project — the portfolio itself ────────────────────────
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
-- Expected: reading_time 3 / 1 / 1 · tags 3 each · project_links 1 each
-- · seo_title filled on the two earlier posts.
select p.slug,
       p.reading_time,
       (select count(*) from public.post_tags pt    where pt.post_id = p.id) as tags,
       (select count(*) from public.project_links pl where pl.post_id = p.id) as project_links,
       coalesce(p.seo_title, '—') as seo_title
from public.posts p
where p.status = 'published'
order by p.published_at;
