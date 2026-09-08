-- ═══════════════════════════════════════════════════════════════════
-- AU_ / JOURNAL — Supabase schema (PostgreSQL 15+)
-- Run this whole file once in Supabase → SQL Editor.
-- It is idempotent: safe to re-run.
-- ───────────────────────────────────────────────────────────────────
-- Roles:           reader | contributor | verified_author | admin | owner
-- Post statuses:   draft | submitted | review | approved | published | rejected | archived
-- Post types:      article | tutorial | guide | build_log | note | case_study | project_journal
-- Comment status:  visible | pending | hidden | deleted
-- ═══════════════════════════════════════════════════════════════════

-- ── 0. EXTENSIONS ──────────────────────────────────────────────────
create extension if not exists pgcrypto;
create extension if not exists pg_trgm;

-- ── 1. ENUMS ───────────────────────────────────────────────────────
do $$ begin
  create type user_role as enum ('reader','contributor','verified_author','admin','owner');
exception when duplicate_object then null; end $$;

do $$ begin
  create type post_status as enum ('draft','submitted','review','approved','published','rejected','archived');
exception when duplicate_object then null; end $$;

do $$ begin
  create type post_type as enum ('article','tutorial','guide','build_log','note','case_study','project_journal');
exception when duplicate_object then null; end $$;

do $$ begin
  create type comment_status as enum ('visible','pending','hidden','deleted');
exception when duplicate_object then null; end $$;

do $$ begin
  create type report_status as enum ('open','resolved','dismissed');
exception when duplicate_object then null; end $$;

-- ── 2. CORE TABLES ─────────────────────────────────────────────────

-- profiles: one row per auth user. Row is auto-created by trigger on signup.
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  username     text unique not null,
  display_name text,
  email        text,
  avatar_url   text,
  bio          text,
  website      text,
  github_url   text,
  linkedin_url text,
  role         user_role not null default 'reader',
  verified     boolean not null default false,
  created_at   timestamptz not null default now()
);

-- categories: editorial topics (Engineering, AI, Web …)
create table if not exists public.categories (
  id          bigint generated always as identity primary key,
  name        text not null,
  slug        text unique not null,
  description text,
  created_at  timestamptz not null default now()
);

-- tags: free-form labels
create table if not exists public.tags (
  id   bigint generated always as identity primary key,
  name text unique not null,
  slug text unique not null
);

-- series: ordered multi-part stories
create table if not exists public.series (
  id             bigint generated always as identity primary key,
  title          text not null,
  slug           text unique not null,
  description    text,
  cover_image_url text,
  created_at     timestamptz not null default now()
);

-- posts
create table if not exists public.posts (
  id              uuid primary key default gen_random_uuid(),
  author_id       uuid not null references public.profiles(id) on delete cascade,
  title           text not null,
  subtitle        text,
  slug            text unique not null,
  excerpt         text,
  content         text not null,          -- structured Markdown (never raw HTML)
  cover_image_url text,
  cover_image_alt text,
  status          post_status not null default 'draft',
  post_type       post_type not null default 'article',
  featured        boolean not null default false,
  seo_title       text,
  seo_description text,
  category_id     bigint references public.categories(id) on delete set null,
  series_id       bigint references public.series(id) on delete set null,
  related_project text,
  published_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  reading_time    integer not null default 1,
  view_count      integer not null default 0,
  like_count      integer not null default 0,
  comment_count   integer not null default 0,
  bookmark_count  integer not null default 0
);

create table if not exists public.post_tags (
  post_id uuid not null references public.posts(id) on delete cascade,
  tag_id  bigint not null references public.tags(id) on delete cascade,
  primary key (post_id, tag_id)
);

create table if not exists public.series_posts (
  series_id bigint not null references public.series(id) on delete cascade,
  post_id   uuid not null references public.posts(id) on delete cascade,
  position  integer not null default 1,
  primary key (series_id, post_id)
);

create table if not exists public.comments (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references public.posts(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  parent_id  uuid references public.comments(id) on delete cascade,
  body       text not null,
  status     comment_status not null default 'visible',
  created_at timestamptz not null default now()
);

create table if not exists public.likes (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  post_id    uuid not null references public.posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);

create table if not exists public.bookmarks (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  post_id    uuid not null references public.posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);

create table if not exists public.follows (
  follower_id  uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);

-- media library (Supabase Storage objects)
create table if not exists public.media (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null references public.profiles(id) on delete cascade,
  storage_path text not null,
  public_url   text not null,
  alt_text     text,
  caption      text,
  credit       text,
  created_at   timestamptz not null default now()
);

create table if not exists public.project_links (
  post_id             uuid not null references public.posts(id) on delete cascade,
  project_name        text not null,
  project_url         text,
  portfolio_project_id text
);

create table if not exists public.reports (
  id         uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  post_id    uuid references public.posts(id) on delete cascade,
  comment_id uuid references public.comments(id) on delete cascade,
  reason     text not null,
  details    text,
  status     report_status not null default 'open',
  created_at timestamptz not null default now()
);

create table if not exists public.newsletter_subscribers (
  id         bigint generated always as identity primary key,
  email      text unique not null,
  created_at timestamptz not null default now(),
  confirmed  boolean not null default false
);

create table if not exists public.post_views (
  id         bigint generated always as identity,
  post_id    uuid not null references public.posts(id) on delete cascade,
  viewed_at  timestamptz not null default now(),
  viewer_id  uuid references public.profiles(id) on delete set null,
  primary key (id)
);
create index if not exists post_views_post_idx on public.post_views (post_id, viewed_at desc);

create table if not exists public.reading_history (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  post_id    uuid not null references public.posts(id) on delete cascade,
  progress   numeric(5,2) not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, post_id)
);

-- ── 3. INDEXES ─────────────────────────────────────────────────────
create index if not exists posts_published_idx    on public.posts (published_at desc);
create index if not exists posts_author_idx       on public.posts (author_id);
create index if not exists posts_status_idx       on public.posts (status);
create index if not exists posts_category_idx     on public.posts (category_id);
create index if not exists posts_series_idx       on public.posts (series_id);
create index if not exists posts_featured_idx     on public.posts (featured) where status = 'published';
create index if not exists comments_post_idx      on public.comments (post_id, status);
create index if not exists comments_parent_idx    on public.comments (parent_id);
create index if not exists follows_following_idx  on public.follows (following_id);
create index if not exists media_owner_idx        on public.media (owner_id);
create index if not exists reports_open_idx       on public.reports (status) where status = 'open';
create index if not exists posts_title_trgm_idx   on public.posts using gin (title gin_trgm_ops);
create index if not exists posts_excerpt_trgm_idx on public.posts using gin (coalesce(excerpt,'') gin_trgm_ops);
create index if not exists tags_slug_idx          on public.tags (slug);
create index if not exists categories_slug_idx    on public.categories (slug);

-- ── 4. HELPERS ─────────────────────────────────────────────────────

-- Role of a user, read through the RLS-protected profiles table.
create or replace function public.current_role()
returns user_role language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select role in ('admin','owner') from public.profiles where id = auth.uid()), false);
$$;

create or replace function public.is_author_or_above() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select role in ('contributor','verified_author','admin','owner') from public.profiles where id = auth.uid()), false);
$$;

create or replace function public.can_publish_direct() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select role in ('verified_author','admin','owner') from public.profiles where id = auth.uid()), false);
$$;

-- Unique-slug generator: appends -2, -3 … when a collision occurs.
create or replace function public.ensure_unique_slug(base text, tbl regclass)
returns text language plpgsql as $$
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

-- ── 5. TRIGGERS ────────────────────────────────────────────────────

-- Auto-create a profile when a user signs up.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  base text;
  uname text;
  n integer := 1;
begin
  base := lower(regexp_replace(split_part(new.email, '@', 1), '[^a-z0-9_-]', '', 'g'));
  if base is null or base = '' then base := 'writer'; end if;
  uname := base;
  while exists (select 1 from public.profiles where username = uname) loop
    n := n + 1;
    uname := base || n;
  end loop;
  insert into public.profiles (id, username, email, display_name)
  values (new.id, uname, new.email, split_part(new.email, '@', 1))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- keep updated_at fresh
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists posts_touch_updated on public.posts;
create trigger posts_touch_updated before update on public.posts
  for each row execute function public.touch_updated_at();

-- comment_count / like_count / bookmark_count denormalized counters
create or replace function public.bump_comment_count() returns trigger language plpgsql security definer as $$
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

drop trigger if exists comments_count on public.comments;
create trigger comments_count after insert or update or delete on public.comments
  for each row execute function public.bump_comment_count();

create or replace function public.bump_like_count() returns trigger language plpgsql security definer as $$
begin
  if tg_op = 'INSERT' then
    update public.posts set like_count = like_count + 1 where id = new.post_id;
  elsif tg_op = 'DELETE' then
    update public.posts set like_count = greatest(like_count - 1, 0) where id = old.post_id;
  end if;
  return null;
end $$;

drop trigger if exists likes_count on public.likes;
create trigger likes_count after insert or delete on public.likes
  for each row execute function public.bump_like_count();

create or replace function public.bump_bookmark_count() returns trigger language plpgsql security definer as $$
begin
  if tg_op = 'INSERT' then
    update public.posts set bookmark_count = bookmark_count + 1 where id = new.post_id;
  elsif tg_op = 'DELETE' then
    update public.posts set bookmark_count = greatest(bookmark_count - 1, 0) where id = old.post_id;
  end if;
  return null;
end $$;

drop trigger if exists bookmarks_count on public.bookmarks;
create trigger bookmarks_count after insert or delete on public.bookmarks
  for each row execute function public.bump_bookmark_count();

-- ── 6. VIEWS ───────────────────────────────────────────────────────

-- Trending = recency-weighted engagement (NOT lifetime views).
-- score = (views in last 7d * 1) + (likes in last 7d * 4) + (bookmarks last 7d * 3),
-- decayed by post age.
create or replace view public.trending_posts as
select
  p.*,
  coalesce(v.recent_views, 0) as recent_views,
  coalesce(l.recent_likes, 0) as recent_likes,
  coalesce(b.recent_bookmarks, 0) as recent_bookmarks,
  (
    coalesce(v.recent_views, 0)
    + coalesce(l.recent_likes, 0) * 4
    + coalesce(b.recent_bookmarks, 0) * 3
  ) / power(greatest(extract(epoch from (now() - coalesce(p.published_at, p.created_at))) / 86400, 0.5), 0.6) as trend_score
from public.posts p
left join (
  select post_id, count(*) as recent_views
  from public.post_views where viewed_at > now() - interval '7 days' group by post_id
) v on v.post_id = p.id
left join (
  select post_id, count(*) as recent_likes
  from public.likes where created_at > now() - interval '7 days' group by post_id
) l on l.post_id = p.id
left join (
  select post_id, count(*) as recent_bookmarks
  from public.bookmarks where created_at > now() - interval '7 days' group by post_id
) b on b.post_id = p.id
where p.status = 'published';

grant select on public.trending_posts to anon, authenticated;

-- ── 7. SEED CATEGORIES (dynamic topic nav source) ──────────────────
insert into public.categories (name, slug, description) values
  ('Engineering',  'engineering',  'Systems, architecture and the craft of building software.'),
  ('AI',           'ai',           'Models, agents, tooling and everything machine intelligence.'),
  ('Web',          'web',          'Browsers, front-end patterns and the modern web platform.'),
  ('Programming',  'programming',  'Language deep-dives, patterns and code craftsmanship.'),
  ('Systems',      'systems',      'Backends, infrastructure, performance and scale.'),
  ('Career',       'career',       'Growing as an engineer — jobs, interviews, mindset.'),
  ('College',      'college',      'Notes from studying CS — balancing classes and building.'),
  ('Gaming',       'gaming',       'Games, game tech and competitive play.'),
  ('Design',       'design',       'Interface, typography and product design.'),
  ('Productivity', 'productivity', 'Tools, workflows and doing more with less.')
on conflict (slug) do nothing;

-- Default Aditya profile slot: the OWNER must be linked to a real
-- Supabase Auth user. After signing up with the admin email, run:
--   update public.profiles set role='owner', verified=true, username='adityauniyal'
--   where id = (select id from auth.users where email = 'YOUR_ADMIN_EMAIL');
