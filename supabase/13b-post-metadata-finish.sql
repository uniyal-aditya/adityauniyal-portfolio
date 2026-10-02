-- ═══════════════════════════════════════════════════════════════════
-- 13b · POST METADATA BACKFILL — FINISH
-- Run once in Supabase → SQL Editor (whole file). Idempotent.
-- ───────────────────────────────────────────────────────────────────
-- Why this exists: migration 13 was run as a "minimal snippet" that
-- executed none of its write statements. Probed live 2026-10-02 via the
-- public anon key + list_tables: posts had reading_time 1/2/6, tags /
-- post_tags / project_links were 0 rows, and seo_title was still NULL
-- on the two earlier posts. Everything below is migration 13's logic.
-- ───────────────────────────────────────────────────────────────────
-- FIX 2026-10-02: the Tiptap word-count subquery used string_agg(w, ' ')
-- but regexp_matches(…, 'g') returns a text[] per match, so w is an ARRAY
-- and Postgres raised 42883 (function string_agg(text[], unknown) does
-- not exist). The SQL Editor runs the file as ONE transaction, so that
-- single error rolled back the whole script — which is exactly why
-- migration 13 itself landed nothing. Corrected to w[1] (capture group 1)
-- here and in supabase/13-post-metadata.sql. Safe to run whether 13
-- partially or fully applied.
-- ───────────────────────────────────────────────────────────────────
-- Verified expected results (word counts computed from the stored
-- Tiptap documents with the exact docToText() formula, pinned by
-- src/lib/migration13-agreement.test.ts):
--   why-i-rebuilt-my-portfolio-as-a-living-journal   81 words → 1 min
--   shipping-the-notification-bell                  122 words → 1 min
--   introducing-au-journal (flagship)               669 words → 3 min
--   tags: 8 rows · post_tags: 9 rows (3 per post) · project_links: 3
-- ═══════════════════════════════════════════════════════════════════

-- 1 · Recompute reading_time from content (words/200, min 1) ────────
with words as (
  select id,
    -- Content is stored as a Tiptap JSON string. Count only the values of
    -- "text": fields (the words docToText()/editor.getText() would see) —
    -- NOT raw JSON punctuation, which inflates the estimate ~60%.
    case
      when content like '{%' then (
        -- regexp_matches yields one text[] per match: w[1] is capture group 1
        -- (the string inside "text": "…"). string_agg(w, ' ') with the raw
        -- array is a 42883 error that used to roll back this whole file.
        select array_length(regexp_split_to_array(trim(string_agg(w[1], ' ')), '\s+'), 1)
        from regexp_matches(content, '"text":\s*"((?:[^"\\]|\\.)*)"', 'g') as m(w)
      )
      else array_length(  -- legacy markdown/html content: strip syntax then count
        regexp_split_to_array(
          trim(regexp_replace(regexp_replace(content, '<[^>]+>', ' ', 'g'), '[#*`>|_~\[\]()=-]', ' ', 'g')),
          '\s+'
        ), 1)
    end as n
  from public.posts
  where status = 'published'
)
update public.posts p
set reading_time = greatest(1, coalesce(round(w.n::numeric / 200)::int, 1))
from words w
where p.id = w.id
  and w.n is not null;

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
-- Expected (computed from the live documents, see header):
--   why-i-rebuilt…   reading_time 1 · tags 3 · project_links 1 · seo_title filled
--   shipping-the…    reading_time 1 · tags 3 · project_links 1 · seo_title filled
--   introducing-au…  reading_time 3 · tags 3 · project_links 1 · seo_title = hand-written value
select p.slug,
       p.reading_time,
       (select count(*) from public.post_tags pt     where pt.post_id = p.id) as tags,
       (select count(*) from public.project_links pl where pl.post_id = p.id) as project_links,
       coalesce(p.seo_title, '—') as seo_title
from public.posts p
where p.status = 'published'
order by p.published_at;
