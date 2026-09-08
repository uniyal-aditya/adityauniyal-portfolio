-- ═══════════════════════════════════════════════════════════════════
-- AU_ / JOURNAL — Row Level Security
-- Run after 01-schema.sql. Mandatory: no client can bypass RLS.
-- ───────────────────────────────────────────────────────────────────
-- Readers:        read published posts + visible comments,
--                 manage own likes/bookmarks/follows/reading history
-- Contributors:   own drafts CRUD, submit, own media, own profile
-- Verified:       contributor powers + direct publish
-- Admin:          manage everything editorial + moderation
-- Owner:          full control
-- ═══════════════════════════════════════════════════════════════════

alter table public.profiles              enable row level security;
alter table public.posts                 enable row level security;
alter table public.categories            enable row level security;
alter table public.tags                  enable row level security;
alter table public.post_tags             enable row level security;
alter table public.comments              enable row level security;
alter table public.likes                 enable row level security;
alter table public.bookmarks             enable row level security;
alter table public.follows               enable row level security;
alter table public.media                 enable row level security;
alter table public.series                enable row level security;
alter table public.series_posts          enable row level security;
alter table public.project_links         enable row level security;
alter table public.reports               enable row level security;
alter table public.newsletter_subscribers enable row level security;
alter table public.post_views            enable row level security;
alter table public.reading_history       enable row level security;

-- ── helper: policy re-creation ─────────────────────────────────────
-- (drop-if-exists keeps this file idempotent)

-- PROFILES ──────────────────────────────────────────────────────────
drop policy if exists profiles_public_read on public.profiles;
create policy profiles_public_read on public.profiles
  for select using (true);

drop policy if exists profiles_self_update on public.profiles;
create policy profiles_self_update on public.profiles
  for update using (auth.uid() = id)
  with check (
    auth.uid() = id
    -- prevent self-escalation: non-admins can never change their role
    and (role = public.current_role() or public.is_admin())
  );

drop policy if exists profiles_admin_update on public.profiles;
create policy profiles_admin_update on public.profiles
  for update using (public.is_admin());

-- POSTS ─────────────────────────────────────────────────────────────
drop policy if exists posts_public_read on public.posts;
create policy posts_public_read on public.posts
  for select using (status = 'published');

drop policy if exists posts_author_read on public.posts;
create policy posts_author_read on public.posts
  for select using (auth.uid() = author_id);

drop policy if exists posts_admin_read on public.posts;
create policy posts_admin_read on public.posts
  for select using (public.is_admin());

drop policy if exists posts_author_insert on public.posts;
create policy posts_author_insert on public.posts
  for insert with check (
    auth.uid() = author_id
    and public.is_author_or_above()
    -- only admins may flip these flags at insert time
    and (status in ('draft','submitted') or public.can_publish_direct())
    and (featured = false or public.is_admin())
  );

drop policy if exists posts_author_update on public.posts;
create policy posts_author_update on public.posts
  for update using (auth.uid() = author_id)
  with check (
    auth.uid() = author_id
    -- contributor: may only move own post draft→submitted (and back)
    and (
      (status in ('draft','submitted','rejected'))
      or public.can_publish_direct()
      or public.is_admin()
    )
  );

drop policy if exists posts_admin_update on public.posts;
create policy posts_admin_update on public.posts
  for update using (public.is_admin());

drop policy if exists posts_admin_delete on public.posts;
create policy posts_admin_delete on public.posts
  for delete using (public.is_admin());

-- CATEGORIES / TAGS ─────────────────────────────────────────────────
drop policy if exists categories_public_read on public.categories;
create policy categories_public_read on public.categories for select using (true);

drop policy if exists categories_admin_write on public.categories;
create policy categories_admin_write on public.categories
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists tags_public_read on public.tags;
create policy tags_public_read on public.tags for select using (true);

-- any signed-in author may register new tags on their own posts
drop policy if exists tags_author_insert on public.tags;
create policy tags_author_insert on public.tags
  for insert with check (public.is_author_or_above());

drop policy if exists tags_admin_write on public.tags;
create policy tags_admin_write on public.tags
  for all using (public.is_admin()) with check (public.is_admin());

-- POST_TAGS ─────────────────────────────────────────────────────────
drop policy if exists post_tags_author_write on public.post_tags;
create policy post_tags_author_write on public.post_tags
  for all using (
    exists (select 1 from public.posts p where p.id = post_id and p.author_id = auth.uid())
    or public.is_admin()
  ) with check (
    exists (select 1 from public.posts p where p.id = post_id and p.author_id = auth.uid())
    or public.is_admin()
  );

drop policy if exists post_tags_public_read on public.post_tags;
create policy post_tags_public_read on public.post_tags for select using (true);

-- SERIES ────────────────────────────────────────────────────────────
drop policy if exists series_public_read on public.series;
create policy series_public_read on public.series for select using (true);

drop policy if exists series_admin_write on public.series;
create policy series_admin_write on public.series
  for all using (public.is_admin() or public.is_author_or_above())
  with check (public.is_admin() or public.is_author_or_above());

drop policy if exists series_posts_public_read on public.series_posts;
create policy series_posts_public_read on public.series_posts for select using (true);

drop policy if exists series_posts_author_write on public.series_posts;
create policy series_posts_author_write on public.series_posts
  for all using (public.is_author_or_above() or public.is_admin())
  with check (public.is_author_or_above() or public.is_admin());

-- COMMENTS ──────────────────────────────────────────────────────────
drop policy if exists comments_public_read on public.comments;
create policy comments_public_read on public.comments
  for select using (status = 'visible');

drop policy if exists comments_author_read on public.comments;
create policy comments_author_read on public.comments
  for select using (auth.uid() = user_id);

drop policy if exists comments_admin_read on public.comments;
create policy comments_admin_read on public.comments
  for select using (public.is_admin());

drop policy if exists comments_insert on public.comments;
create policy comments_insert on public.comments
  for insert with check (
    auth.uid() = user_id
    and status in ('visible','pending')
    and exists (
      select 1 from public.posts p
      where p.id = post_id and p.status = 'published'
    )
  );

drop policy if exists comments_author_update on public.comments;
create policy comments_author_update on public.comments
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id and status in ('visible','pending','deleted'));

drop policy if exists comments_admin_update on public.comments;
create policy comments_admin_update on public.comments
  for update using (public.is_admin());

drop policy if exists comments_admin_delete on public.comments;
create policy comments_admin_delete on public.comments
  for delete using (public.is_admin() or auth.uid() = user_id);

-- LIKES / BOOKMARKS ─────────────────────────────────────────────────
drop policy if exists likes_owner_all on public.likes;
create policy likes_owner_all on public.likes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists likes_public_read on public.likes;
create policy likes_public_read on public.likes for select using (true);

drop policy if exists bookmarks_owner_all on public.bookmarks;
create policy bookmarks_owner_all on public.bookmarks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists bookmarks_owner_read on public.bookmarks;
create policy bookmarks_owner_read on public.bookmarks for select using (auth.uid() = user_id);

-- FOLLOWS ───────────────────────────────────────────────────────────
drop policy if exists follows_owner_write on public.follows;
create policy follows_owner_write on public.follows
  for all using (auth.uid() = follower_id) with check (auth.uid() = follower_id);

drop policy if exists follows_public_read on public.follows;
create policy follows_public_read on public.follows for select using (true);

-- MEDIA ─────────────────────────────────────────────────────────────
drop policy if exists media_owner_all on public.media;
create policy media_owner_all on public.media
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

drop policy if exists media_admin_all on public.media;
create policy media_admin_all on public.media
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists media_public_read on public.media;
create policy media_public_read on public.media for select using (true);

-- PROJECT_LINKS ─────────────────────────────────────────────────────
drop policy if exists project_links_author_write on public.project_links;
create policy project_links_author_write on public.project_links
  for all using (
    exists (select 1 from public.posts p where p.id = post_id and p.author_id = auth.uid())
    or public.is_admin()
  ) with check (
    exists (select 1 from public.posts p where p.id = post_id and p.author_id = auth.uid())
    or public.is_admin()
  );

drop policy if exists project_links_public_read on public.project_links;
create policy project_links_public_read on public.project_links for select using (true);

-- REPORTS ───────────────────────────────────────────────────────────
drop policy if exists reports_owner_insert on public.reports;
create policy reports_owner_insert on public.reports
  for insert with check (auth.uid() = reporter_id);

drop policy if exists reports_owner_read on public.reports;
create policy reports_owner_read on public.reports
  for select using (auth.uid() = reporter_id);

drop policy if exists reports_admin_all on public.reports;
create policy reports_admin_all on public.reports
  for all using (public.is_admin()) with check (public.is_admin());

-- NEWSLETTER ────────────────────────────────────────────────────────
-- anyone may subscribe (anon allowed); only admins may read the list
drop policy if exists newsletter_anyone_insert on public.newsletter_subscribers;
create policy newsletter_anyone_insert on public.newsletter_subscribers
  for insert with check (true);

drop policy if exists newsletter_admin_read on public.newsletter_subscribers;
create policy newsletter_admin_read on public.newsletter_subscribers
  for select using (public.is_admin());

drop policy if exists newsletter_admin_update on public.newsletter_subscribers;
create policy newsletter_admin_update on public.newsletter_subscribers
  for update using (public.is_admin());

-- POST_VIEWS ────────────────────────────────────────────────────────
-- anon users may record views; nobody reads raw rows from client
drop policy if exists post_views_anyone_insert on public.post_views;
create policy post_views_anyone_insert on public.post_views
  for insert with check (true);

drop policy if exists post_views_admin_read on public.post_views;
create policy post_views_admin_read on public.post_views
  for select using (public.is_admin());

-- READING_HISTORY ───────────────────────────────────────────────────
drop policy if exists reading_history_owner_all on public.reading_history;
create policy reading_history_owner_all on public.reading_history
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── STORAGE: journal-media bucket ──────────────────────────────────
insert into storage.buckets (id, name, public)
values ('journal-media', 'journal-media', true)
on conflict (id) do update set public = true;

-- public read of published media
drop policy if exists journal_media_public_read on storage.objects;
create policy journal_media_public_read on storage.objects
  for select using (bucket_id = 'journal-media');

-- signed-in authors may upload into their own folder: journal-media/<uid>/…
drop policy if exists journal_media_owner_upload on storage.objects;
create policy journal_media_owner_upload on storage.objects
  for insert with check (
    bucket_id = 'journal-media'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists journal_media_owner_update on storage.objects;
create policy journal_media_owner_update on storage.objects
  for update using (
    bucket_id = 'journal-media'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists journal_media_owner_delete on storage.objects;
create policy journal_media_owner_delete on storage.objects
  for delete using (
    bucket_id = 'journal-media'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
