-- ═══════════════════════════════════════════════════════════════════
-- AU_ / JOURNAL — migration 08: analytics fixes
-- Idempotent. Safe to re-run. No data is destroyed.
-- ───────────────────────────────────────────────────────────────────
-- Fixes found during the analytics audit:
--   A. posts.view_count never written (always 0) although post_views
--      rows are recorded → backfill + insert trigger.
--   B. post_analytics never returned `uniques` → the admin analytics
--      table's Uniques column rendered empty.
--   C. admin_analytics / traffic_trend / follow_trend had no
--      is_admin() guard — any signed-in user could call them directly.
--      (post_analytics already had one.)
-- ═══════════════════════════════════════════════════════════════════

-- ── A1. Backfill view_count from the raw view log ──────────────────
update public.posts p
set view_count = (select count(*) from public.post_views v where v.post_id = p.id);

-- ── A2. Keep view_count in sync from now on ────────────────────────
create or replace function public.bump_view_count()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.posts set view_count = view_count + 1 where id = new.post_id;
  return null;
end $$;

drop trigger if exists post_views_count on public.post_views;
create trigger post_views_count
  after insert on public.post_views
  for each row execute function public.bump_view_count();

-- ── B. post_analytics: add uniques (distinct signed-in viewers) ────
-- Return type changes (new column appended) → create or replace alone
-- cannot alter it: drop first, then recreate (grants re-applied below).
drop function if exists public.post_analytics(integer);
create or replace function public.post_analytics(p_limit int default 50)
returns table (
  id uuid, title text, slug text, status post_status,
  author_name text, author_username text,
  views bigint, likes int, bookmarks int, comments int,
  avg_progress numeric, completion_rate numeric,
  published_at timestamptz,
  uniques bigint
)
language sql stable security definer set search_path = public as $$
  select
    p.id, p.title, p.slug, p.status,
    pr.display_name, pr.username,
    (select count(*) from public.post_views v where v.post_id = p.id),
    p.like_count, p.bookmark_count, p.comment_count,
    coalesce((select round(avg(r.progress), 1) from public.reading_history r where r.post_id = p.id), 0),
    coalesce((select round(100.0 * count(*) filter (where r.progress >= 90) / greatest(count(*), 1), 1)
              from public.reading_history r where r.post_id = p.id), 0),
    p.published_at,
    (select count(distinct v.viewer_id) from public.post_views v
      where v.post_id = p.id and v.viewer_id is not null)
  from public.posts p
  join public.profiles pr on pr.id = p.author_id
  where
    -- contributors see only their own analytics; admins see everything
    (public.is_admin() or p.author_id = auth.uid())
  order by coalesce(p.published_at, p.created_at) desc
  limit least(p_limit, 200);
$$;

grant execute on function public.post_analytics to authenticated;

-- ── C. Admin guards on the aggregate RPCs ──────────────────────────
-- Rewritten as plpgsql so the FORBIDDEN check can precede the query.

create or replace function public.admin_analytics()
returns table (
  published int, drafts int, review_queue int, authors int, users int,
  views bigint, comments int, open_reports int,
  follows_total int, follows_7d int
)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN: admin role required';
  end if;
  return query
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
end $$;
grant execute on function public.admin_analytics to authenticated;

create or replace function public.traffic_trend(p_days int default 14)
returns table (day date, views bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN: admin role required';
  end if;
  return query
  select
    d::date,
    (select count(*) from public.post_views v where v.viewed_at::date = d::date)
  from generate_series(current_date - (p_days - 1), current_date, interval '1 day') d;
end $$;
grant execute on function public.traffic_trend to authenticated;

create or replace function public.follow_trend(p_days int default 14)
returns table (day date, follows bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN: admin role required';
  end if;
  return query
  select
    d::date,
    (select count(*) from public.follows f where f.created_at::date = d::date)
  from generate_series(current_date - (p_days - 1), current_date, interval '1 day') d;
end $$;
grant execute on function public.follow_trend to authenticated;
