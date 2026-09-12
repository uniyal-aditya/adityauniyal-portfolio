-- ═══════════════════════════════════════════════════════════════════
-- 06 — NOTIFICATIONS (in-app bell)
-- A row is created for every follower of an author when that author
-- publishes a post. Readers see them via the nav bell.
-- Run once in Supabase → SQL Editor. Idempotent.
-- ═══════════════════════════════════════════════════════════════════

create table if not exists public.notifications (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  actor_id   uuid references public.profiles(id) on delete cascade,
  post_id    uuid references public.posts(id) on delete cascade,
  kind       text not null default 'new_post',
  created_at timestamptz not null default now(),
  read_at    timestamptz
);

create index if not exists notifications_user_idx
  on public.notifications (user_id, created_at desc);
create index if not exists notifications_unread_idx
  on public.notifications (user_id) where read_at is null;

alter table public.notifications enable row level security;

drop policy if exists notifications_own_read on public.notifications;
create policy notifications_own_read on public.notifications
  for select using (auth.uid() = user_id);

drop policy if exists notifications_own_update on public.notifications;
create policy notifications_own_update on public.notifications
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- rows are only created by the trigger (security definer) — no client insert

-- ── trigger: notify followers when a post becomes published ────────
create or replace function public.notify_followers_on_publish()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  -- only when transitioning INTO published
  if new.status = 'published' and coalesce(old.status, '') is distinct from 'published' then
    insert into public.notifications (user_id, actor_id, post_id, kind)
    select f.follower_id, new.author_id, new.id, 'new_post'
    from public.follows f
    where f.following_id = new.author_id
      and f.follower_id <> new.author_id;  -- never notify yourself
  end if;
  return new;
end;
$$;

drop trigger if exists posts_notify_followers on public.posts;
create trigger posts_notify_followers
  after insert or update of status on public.posts
  for each row execute function public.notify_followers_on_publish();

-- ── RPCs ───────────────────────────────────────────────────────────

-- unread count for the signed-in reader
create or replace function public.my_unread_notifications()
returns int
language sql stable security definer set search_path = public as $$
  select count(*)::int from public.notifications
  where user_id = auth.uid() and read_at is null;
$$;
grant execute on function public.my_unread_notifications to authenticated;

-- latest notifications with actor + post info for the dropdown
create or replace function public.my_notifications(p_limit int default 20)
returns table (
  id bigint, kind text, created_at timestamptz, read_at timestamptz,
  actor_name text, actor_username text, actor_avatar text, actor_verified boolean,
  post_title text, post_slug text
)
language sql stable security definer set search_path = public as $$
  select
    n.id, n.kind, n.created_at, n.read_at,
    a.display_name, a.username, a.avatar_url, a.verified,
    p.title, p.slug
  from public.notifications n
  left join public.profiles a on a.id = n.actor_id
  left join public.posts p on p.id = n.post_id
  where n.user_id = auth.uid()
  order by n.created_at desc
  limit least(p_limit, 50);
$$;
grant execute on function public.my_notifications to authenticated;

-- mark one notification read
create or replace function public.mark_notification_read(p_id bigint)
returns void
language sql security definer set search_path = public as $$
  update public.notifications set read_at = now()
  where id = p_id and user_id = auth.uid() and read_at is null;
$$;
grant execute on function public.mark_notification_read to authenticated;

-- mark everything read
create or replace function public.mark_all_notifications_read()
returns void
language sql security definer set search_path = public as $$
  update public.notifications set read_at = now()
  where user_id = auth.uid() and read_at is null;
$$;
grant execute on function public.mark_all_notifications_read to authenticated;
