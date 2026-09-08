-- ═══════════════════════════════════════════════════════════════════
-- AU_ / JOURNAL — RPC functions (callable via supabase.rpc())
-- Run after 02-rls.sql.
-- ═══════════════════════════════════════════════════════════════════

-- ── SEARCH: posts, authors, tags in one call ───────────────────────
-- Used by /blog/search. Runs with the caller's RLS context, so only
-- published posts are visible to anon.
create or replace function public.search_journal(
  q           text default '',
  p_category  text default null,
  p_type      text default null,
  p_author    text default null,     -- username
  p_sort      text default 'relevance',
  p_limit     int default 20,
  p_offset    int default 0
)
returns table (
  id uuid, title text, subtitle text, slug text, excerpt text,
  cover_image_url text, cover_image_alt text, post_type post_type,
  published_at timestamptz, reading_time int, view_count bigint,
  like_count int, comment_count int, bookmark_count int,
  author_name text, author_username text, author_avatar text,
  author_verified boolean, category_name text, category_slug text,
  rank double precision
)
language plpgsql stable as $$
declare
  pattern text := '%' || coalesce(q, '') || '%';
begin
  return query
  select
    p.id, p.title, p.subtitle, p.slug, p.excerpt,
    p.cover_image_url, p.cover_image_alt, p.post_type,
    p.published_at, p.reading_time, p.view_count::bigint,
    p.like_count, p.comment_count, p.bookmark_count,
    pr.display_name, pr.username, pr.avatar_url, pr.verified,
    c.name, c.slug,
    case
      when q is null or q = '' then
        case p_sort
          when 'newest' then extract(epoch from coalesce(p.published_at, p.created_at))
          when 'most_viewed' then p.view_count::double precision
          when 'most_liked' then p.like_count::double precision
          when 'most_bookmarked' then p.bookmark_count::double precision
          else extract(epoch from coalesce(p.published_at, p.created_at))
        end
      else
        similarity(p.title, q) * 10
        + similarity(coalesce(p.excerpt,''), q) * 5
        + coalesce((select count(*) from public.post_tags pt
            join public.tags t on t.id = pt.tag_id
            where pt.post_id = p.id and t.name ilike pattern), 0) * 2
        + (case when pr.display_name ilike pattern or pr.username ilike pattern then 5 else 0 end)
        + (case when c.name ilike pattern then 3 else 0 end)
    end
  from public.posts p
  join public.profiles pr on pr.id = p.author_id
  left join public.categories c on c.id = p.category_id
  where p.status = 'published'
    and (q is null or q = ''
         or p.title ilike pattern
         or coalesce(p.excerpt,'') ilike pattern
         or coalesce(p.subtitle,'') ilike pattern
         or pr.display_name ilike pattern
         or pr.username ilike pattern
         or c.name ilike pattern
         or exists (select 1 from public.post_tags pt join public.tags t on t.id = pt.tag_id
                    where pt.post_id = p.id and (t.name ilike pattern or t.slug ilike pattern)))
    and (p_category is null or c.slug = p_category)
    and (p_type is null or p.post_type::text = p_type)
    and (p_author is null or pr.username = p_author)
  order by
    case when p_sort = 'newest' then coalesce(p.published_at, p.created_at) end desc nulls last,
    case when p_sort = 'most_viewed' then p.view_count end desc nulls last,
    case when p_sort = 'most_liked' then p.like_count end desc nulls last,
    case when p_sort = 'most_bookmarked' then p.bookmark_count end desc nulls last,
    case when p_sort = 'relevance' or p_sort is null then
      case
        when q is null or q = '' then extract(epoch from coalesce(p.published_at, p.created_at))
        else similarity(p.title, q) * 10 + similarity(coalesce(p.excerpt,''), q) * 5
      end
    end desc nulls last,
    p.published_at desc nulls last
  limit least(p_limit, 50)
  offset greatest(p_offset, 0);
end $$;

grant execute on function public.search_journal to anon, authenticated;

-- ── TRENDING: recency-weighted engagement, not lifetime views ──────
create or replace function public.get_trending_posts(p_limit int default 6)
returns table (
  id uuid, title text, slug text, excerpt text, cover_image_url text,
  cover_image_alt text, post_type post_type, published_at timestamptz,
  reading_time int, like_count int, comment_count int, bookmark_count int,
  view_count bigint,
  author_name text, author_username text, author_avatar text,
  author_verified boolean, category_name text, category_slug text,
  trend_score double precision
)
language sql stable as $$
  select
    p.id, p.title, p.slug, p.excerpt, p.cover_image_url,
    p.cover_image_alt, p.post_type, p.published_at,
    p.reading_time, p.like_count, p.comment_count, p.bookmark_count,
    p.view_count::bigint,
    pr.display_name, pr.username, pr.avatar_url, pr.verified,
    c.name, c.slug,
    (
      coalesce(v.recent_views, 0)
      + coalesce(l.recent_likes, 0) * 4
      + coalesce(b.recent_bookmarks, 0) * 3
    ) / power(greatest(extract(epoch from (now() - coalesce(p.published_at, p.created_at))) / 86400, 0.5), 0.6)
  from public.posts p
  join public.profiles pr on pr.id = p.author_id
  left join public.categories c on c.id = p.category_id
  left join (select post_id, count(*) recent_views from public.post_views
             where viewed_at > now() - interval '7 days' group by post_id) v on v.post_id = p.id
  left join (select post_id, count(*) recent_likes from public.likes
             where created_at > now() - interval '7 days' group by post_id) l on l.post_id = p.id
  left join (select post_id, count(*) recent_bookmarks from public.bookmarks
             where created_at > now() - interval '7 days' group by post_id) b on b.post_id = p.id
  where p.status = 'published'
  order by 20 desc
  limit least(p_limit, 12);
$$;

grant execute on function public.get_trending_posts to anon, authenticated;

-- ── MODERATION: admin status transitions (audit via updated_at) ────
create or replace function public.admin_set_post_status(p_post uuid, p_status text)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN: admin role required';
  end if;
  if p_status not in ('draft','submitted','review','approved','published','rejected','archived') then
    raise exception 'INVALID_STATUS';
  end if;
  update public.posts
  set status = p_status::post_status,
      published_at = case when p_status = 'published' and published_at is null then now() else published_at end
  where id = p_post;
end $$;

grant execute on function public.admin_set_post_status to authenticated;

-- ── MODERATION: comment status (approve/hide/pin via status) ───────
create or replace function public.admin_set_comment_status(p_comment uuid, p_status text)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN: admin role required';
  end if;
  if p_status not in ('visible','pending','hidden','deleted') then
    raise exception 'INVALID_STATUS';
  end if;
  update public.comments set status = p_status::comment_status where id = p_comment;
end $$;

grant execute on function public.admin_set_comment_status to authenticated;

-- ── USERS: promote / demote / suspend (admin only) ─────────────────
create or replace function public.admin_set_user_role(p_user uuid, p_role text)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN: admin role required';
  end if;
  if p_role not in ('reader','contributor','verified_author','admin','owner') then
    raise exception 'INVALID_ROLE';
  end if;
  -- only owner may grant the owner role
  if p_role = 'owner' and public.current_role() <> 'owner' then
    raise exception 'FORBIDDEN: owner required';
  end if;
  update public.profiles set role = p_role::user_role where id = p_user;
end $$;

grant execute on function public.admin_set_user_role to authenticated;

create or replace function public.admin_set_verified(p_user uuid, p_verified boolean)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN: admin role required';
  end if;
  update public.profiles set verified = p_verified where id = p_user;
end $$;

grant execute on function public.admin_set_user_role to authenticated;

-- ── ADMIN ANALYTICS: site-wide counters (admin only) ───────────────
create or replace function public.admin_analytics()
returns table (
  published int, drafts int, review_queue int, authors int, users int,
  views bigint, comments int, open_reports int
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
    (select count(*)::int from public.reports where status = 'open');
$$;

grant execute on function public.admin_analytics to authenticated;

-- ── ADMIN: per-post analytics (admin sees all, contributor own) ─────
create or replace function public.post_analytics(p_limit int default 50)
returns table (
  id uuid, title text, slug text, status post_status,
  author_name text, author_username text,
  views bigint, likes int, bookmarks int, comments int,
  avg_progress numeric, completion_rate numeric,
  published_at timestamptz
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
    p.published_at
  from public.posts p
  join public.profiles pr on pr.id = p.author_id
  where
    -- contributors see only their own analytics; admins see everything
    (public.is_admin() or p.author_id = auth.uid())
  order by coalesce(p.published_at, p.created_at) desc
  limit least(p_limit, 200);
$$;

grant execute on function public.post_analytics to authenticated;

-- ── ADMIN: 14-day traffic trend ────────────────────────────────────
create or replace function public.traffic_trend(p_days int default 14)
returns table (day date, views bigint)
language sql stable security definer set search_path = public as $$
  select
    d::date,
    (select count(*) from public.post_views v where v.viewed_at::date = d::date)
  from generate_series(current_date - (p_days - 1), current_date, interval '1 day') d;
$$;

grant execute on function public.traffic_trend to authenticated;
