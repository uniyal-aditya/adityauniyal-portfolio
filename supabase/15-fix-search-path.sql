-- 15: pin function search_path + lock admin RPCs away from anon
-- (run in the Supabase SQL editor)
-- Idempotent: safe to re-run. Addresses two classes of findings from the
-- Supabase security advisor:
--   0011 function_search_path_mutable  (8 functions)
--   0028 anon_security_definer_function_executable (admin_* RPCs)
-- Function bodies are identical to the canonical definitions in
-- 01-schema.sql / 03-rpc.sql / 14-guard-verified.sql apart from
-- `set search_path = ''` + fully-qualified references. The one body
-- change is search_journal: `similarity` becomes `public.similarity`
-- (pg_trgm is installed in the public schema in this project).
-- This supersedes those definitions, the same way 05/08 superseded
-- parts of 03 — do not "fix" by re-running the older files.

-- ── 1. Functions re-created with a fixed (empty) search_path ───────
-- pg_catalog is still implicitly searched with an empty path, so
-- now()/jsonb/regex operators resolve normally; every user object in
-- these bodies is already schema-qualified.

-- Unique-slug generator: appends -2, -3 … when a collision occurs.
create or replace function public.ensure_unique_slug(base text, tbl regclass)
returns text language plpgsql set search_path = '' as $$
declare
  candidate text;
  n integer := 1;
begin
  candidate := base;
  while exists (select 1 from public.posts where slug = candidate) loop
    n := n + 1;
    candidate := base || '-' || n;
  end loop;
  return candidate;
end $$;

-- keep updated_at fresh
create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end $$;

-- comment_count / like_count / bookmark_count denormalized counters
create or replace function public.bump_comment_count() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' and new.status = 'visible' then
    update public.posts set comment_count = comment_count + 1 where id = new.post_id;
  elsif tg_op = 'UPDATE' then
    if old.status = 'visible' and new.status <> 'visible' then
      update public.posts set comment_count = greatest(comment_count - 1, 0) where id = new.post_id;
    elsif old.status <> 'visible' and new.status = 'visible' then
      update public.posts set comment_count = comment_count + 1 where id = new.post_id;
    end if;
  elsif tg_op = 'DELETE' and old.status = 'visible' then
    update public.posts set comment_count = greatest(comment_count - 1, 0) where id = old.post_id;
  end if;
  return null;
end $$;

create or replace function public.bump_like_count() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    update public.posts set like_count = like_count + 1 where id = new.post_id;
  elsif tg_op = 'DELETE' then
    update public.posts set like_count = greatest(like_count - 1, 0) where id = old.post_id;
  end if;
  return null;
end $$;

create or replace function public.bump_bookmark_count() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    update public.posts set bookmark_count = bookmark_count + 1 where id = new.post_id;
  elsif tg_op = 'DELETE' then
    update public.posts set bookmark_count = greatest(bookmark_count - 1, 0) where id = old.post_id;
  end if;
  return null;
end $$;

-- ── SEARCH: posts, authors, tags in one call (canonical version) ───
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
language plpgsql stable set search_path = '' as $$
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
        public.similarity(p.title, q) * 10
        + public.similarity(coalesce(p.excerpt,''), q) * 5
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
        else public.similarity(p.title, q) * 10 + public.similarity(coalesce(p.excerpt,''), q) * 5
      end
    end desc nulls last,
    p.published_at desc nulls last
  limit least(p_limit, 50)
  offset greatest(p_offset, 0);
end $$;

grant execute on function public.search_journal to anon, authenticated;

-- ── TRENDING: recency-weighted engagement (canonical version) ──────
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
language sql stable set search_path = '' as $$
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

-- ── POSTS content guard (from 14, now with a pinned search_path) ───
create or replace function public.guard_posts_content() returns trigger
language plpgsql set search_path = '' as $$
begin
  -- Tiptap JSON: accept only when it parses as an object with type "doc".
  begin
    if jsonb_typeof(new.content::jsonb) = 'object'
       and (new.content::jsonb ->> 'type') = 'doc' then
      return new;
    end if;
  exception when invalid_text_representation then
    null;  -- not JSON → legacy markdown path below
  end;

  -- Legacy markdown: reject " or ' inside markdown image alt text.
  if new.content ~ '!\[[^]]*["''][^]]*\]\(' then
    raise exception 'posts.content: quotes are not allowed inside markdown image alt text';
  end if;

  return new;
end $$;

-- ── 2. Admin RPCs: not callable by signed-out callers ──────────────
-- EXECUTE is granted to PUBLIC by default, so revoking only from anon
-- would change nothing — the PUBLIC grant still covers anon. Revoke
-- from PUBLIC (and anon explicitly), then re-grant to authenticated +
-- service_role. Every admin_* RPC also self-checks is_admin(), so this
-- is defense-in-depth: signed-out callers now get "permission denied"
-- instead of reaching the function body at all.
-- (Signature list mirrors the live DB — advisor finding 0028.)

revoke execute on function public.admin_analytics()                          from public, anon;
revoke execute on function public.admin_set_application_status(p_application uuid, p_status text) from public, anon;
revoke execute on function public.admin_set_comment_status(p_comment uuid, p_status text)         from public, anon;
revoke execute on function public.admin_set_post_status(p_post uuid, p_status text)               from public, anon;
revoke execute on function public.admin_set_user_role(p_user uuid, p_role text)                   from public, anon;
revoke execute on function public.admin_set_verified(p_user uuid, p_verified boolean)             from public, anon;
revoke execute on function public.admin_toggle_pin_comment(p_comment uuid, p_pinned boolean)      from public, anon;

grant execute on function public.admin_analytics()                          to authenticated, service_role;
grant execute on function public.admin_set_application_status(p_application uuid, p_status text) to authenticated, service_role;
grant execute on function public.admin_set_comment_status(p_comment uuid, p_status text)         to authenticated, service_role;
grant execute on function public.admin_set_post_status(p_post uuid, p_status text)               to authenticated, service_role;
grant execute on function public.admin_set_user_role(p_user uuid, p_role text)                   to authenticated, service_role;
grant execute on function public.admin_set_verified(p_user uuid, p_verified boolean)             to authenticated, service_role;
grant execute on function public.admin_toggle_pin_comment(p_comment uuid, p_pinned boolean)      to authenticated, service_role;
