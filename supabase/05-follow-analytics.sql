-- ═══════════════════════════════════════════════════════════════════
-- 05 — FOLLOW ANALYTICS (incremental upgrade)
-- Adds follow counters to admin_analytics + a 14-day follow trend RPC.
-- Run once in Supabase → SQL Editor. Idempotent.
-- ═══════════════════════════════════════════════════════════════════

-- return type changed → drop the old signature first
drop function if exists public.admin_analytics();
create function public.admin_analytics()
returns table (
  published int, drafts int, review_queue int, authors int, users int,
  views bigint, comments int, open_reports int,
  follows_total int, follows_7d int
)
language sql stable security definer set search_path = public as $$
  select
    (select count(*)::int from public.posts where status = 'published'),
    (select count(*)::int from public.posts where status in ('draft','rejected')),
    (select count(*)::int from public.posts where status in ('submitted','review','approved')),
    (select count(distinct author_id)::int from public.posts),
    (select count(*)::int from public.profiles),
    (select count(*)::bigint from public.post_views),
    (select count(*)::int from public.comments where status = 'visible'),
    (select count(*)::int from public.reports where status = 'open'),
    (select count(*)::int from public.follows),
    (select count(*)::int from public.follows where created_at >= now() - interval '7 days');
$$;

grant execute on function public.admin_analytics to authenticated;

-- 14-day trend of new follows per day
create or replace function public.follow_trend(p_days int default 14)
returns table (day date, follows bigint)
language sql stable security definer set search_path = public as $$
  select
    d::date,
    (select count(*) from public.follows f where f.created_at::date = d::date)
  from generate_series(current_date - (p_days - 1), current_date, interval '1 day') d;
$$;

grant execute on function public.follow_trend to authenticated;
