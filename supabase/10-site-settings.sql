-- ═══════════════════════════════════════════════════════════════════
-- 10 — SITE SETTINGS
-- Key/value store for owner-editable site configuration that used to
-- live in code (src/data/building.ts). RLS: world-readable (it is
-- public site config), writable by admins/owner only.
-- Run in Supabase → SQL Editor. Idempotent.
-- ═══════════════════════════════════════════════════════════════════

create table if not exists public.site_settings (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id) on delete set null
);

alter table public.site_settings enable row level security;

drop policy if exists site_settings_public_read on public.site_settings;
create policy site_settings_public_read on public.site_settings
  for select using (true);

drop policy if exists site_settings_admin_write on public.site_settings;
create policy site_settings_admin_write on public.site_settings
  for all using (public.is_admin())
  with check (public.is_admin());

-- Seed with the values currently hard-coded in src/data/building.ts so
-- behavior is identical until the owner edits them in Admin → Settings.
insert into public.site_settings (key, value) values
(
  'current_project',
  '{
    "name": "AU_ / JOURNAL",
    "description": "This site itself — a portfolio, publication and developer-activity platform built as one system.",
    "status": "ACTIVE",
    "stack": ["React", "TypeScript", "Supabase", "Tiptap"],
    "repo": "adityauniyal-portfolio",
    "journalSlugs": [
      "introducing-au-journal",
      "shipping-the-notification-bell",
      "why-i-rebuilt-my-portfolio-as-a-living-journal"
    ]
  }'::jsonb
)
on conflict (key) do nothing;
