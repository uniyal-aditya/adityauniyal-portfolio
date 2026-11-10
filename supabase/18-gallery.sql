-- ═══════════════════════════════════════════════════════════════════
-- 18 — GALLERY
-- Photos & certificates shown on /gallery, uploaded from
-- Admin → Gallery. Images live in the existing `journal-media` storage
-- bucket (uploaded by the signed-in admin into their own folder, which
-- the policies from 02-rls.sql already allow); this table stores the
-- metadata. RLS: the world can read PUBLISHED rows, only admins/owner
-- can read hidden rows or write anything.
-- Run in Supabase → SQL Editor, after 17. Idempotent.
-- ═══════════════════════════════════════════════════════════════════

create table if not exists public.gallery_items (
  id            uuid primary key default gen_random_uuid(),
  title         text not null check (char_length(title) between 1 and 120),
  caption       text check (caption is null or char_length(caption) <= 400),
  alt_text      text check (alt_text is null or char_length(alt_text) <= 300),
  -- Kept flexible on purpose: the admin form offers the tags listed in
  -- src/data/gallery.ts (GALLERY_TAGS); adding a tag there needs no SQL change.
  tag           text not null default 'Moments' check (char_length(tag) between 1 and 40),
  image_url     text not null check (image_url ~* '^https://'),
  storage_path  text,
  width         integer not null check (width between 1 and 20000),
  height        integer not null check (height between 1 and 20000),
  taken_on      date,
  is_published  boolean not null default true,
  created_by    uuid references public.profiles (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists gallery_items_published_idx
  on public.gallery_items (is_published, created_at desc);

drop trigger if exists gallery_items_touch_updated on public.gallery_items;
create trigger gallery_items_touch_updated before update on public.gallery_items
  for each row execute function public.touch_updated_at();

alter table public.gallery_items enable row level security;

-- Anyone (including signed-out visitors) can read published items.
drop policy if exists gallery_public_read on public.gallery_items;
create policy gallery_public_read on public.gallery_items
  for select using (is_published);

-- Admins/owner can do everything, including reading hidden items.
drop policy if exists gallery_admin_all on public.gallery_items;
create policy gallery_admin_all on public.gallery_items
  for all using (public.is_admin())
  with check (public.is_admin());
