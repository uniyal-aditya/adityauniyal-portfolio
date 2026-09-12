-- ═══════════════════════════════════════════════════════════════════
-- AU_ / JOURNAL — migration 04: contributor applications
-- Run after 01-schema.sql / 02-rls.sql / 03-rpc.sql. Idempotent.
-- ───────────────────────────────────────────────────────────────────
-- Readers apply to become contributors from /blog/apply; admins review
-- the queue in /blog/admin/applications and approve/reject.

create table if not exists public.contributor_applications (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references public.profiles (id) on delete set null,
  name          text not null,
  username      text not null unique,
  bio           text,
  portfolio     text,
  github_url    text,
  linkedin_url  text,
  topics        text,
  reason        text not null,
  sample_work   text,
  status        text not null default 'pending'
                check (status in ('pending', 'approved', 'rejected')),
  created_at    timestamptz not null default now()
);

alter table public.contributor_applications enable row level security;

-- Anyone (even pre-signup applicants) may apply.
drop policy if exists applications_public_insert on public.contributor_applications;
create policy applications_public_insert on public.contributor_applications
  for insert with check (true);

-- Users can track their own application; admins see everything.
drop policy if exists applications_owner_read on public.contributor_applications;
create policy applications_owner_read on public.contributor_applications
  for select using (user_id = auth.uid() or public.is_admin());

drop policy if exists applications_admin_update on public.contributor_applications;
create policy applications_admin_update on public.contributor_applications
  for update using (public.is_admin()) with check (public.is_admin());

-- Moderation helper: flip application status (admin only, server-side check).
create or replace function public.admin_set_application_status(
  p_application uuid,
  p_status      text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'admin only';
  end if;
  if p_status not in ('pending', 'approved', 'rejected') then
    raise exception 'invalid status';
  end if;
  update public.contributor_applications
     set status = p_status
   where id = p_application;
end;
$$;

grant execute on function public.admin_set_application_status(uuid, text) to authenticated;
