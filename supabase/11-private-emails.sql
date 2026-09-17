-- ═══════════════════════════════════════════════════════════════════
-- 11 · PRIVATE EMAILS
-- Run once in Supabase → SQL Editor. Idempotent (safe to re-run).
-- ───────────────────────────────────────────────────────────────────
-- Why: profiles are world-readable by design (author pages, comment
-- avatars, featured writers), and the profiles table carried an email
-- column — which made every user's email readable through the public
-- REST API. The app never needed it client-side (emails for auth live
-- in Supabase's private auth.users schema), so this migration:
--   1. drops public.profiles.email
--   2. stops the signup trigger from copying the email in
--   3. adds an admin-only RPC to look up a member's email when needed
--      (moderation/contact), enforced by RLS-backed is_admin()
-- ───────────────────────────────────────────────────────────────────

-- 1 · Drop the exposed column (cascades nothing — no views depend on it)
alter table public.profiles drop column if exists email;

-- 2 · Signup trigger: derive the username from the email local-part
--     (as before) but stop storing the email itself on the profile.
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
  insert into public.profiles (id, username, display_name)
  values (new.id, uname, split_part(new.email, '@', 1))
  on conflict (id) do nothing;
  return new;
end $$;

-- 3 · Admin-only email lookup (e.g. contacting a member about their
--     report/application). security definer + explicit is_admin() gate;
--     anon/authenticated users get NULL, never someone else's email.
create or replace function public.admin_user_email(p_user uuid)
returns text
language sql stable security definer set search_path = public as $$
  select case when public.is_admin()
    then (select u.email from auth.users u where u.id = p_user)
    else null end
$$;
revoke execute on function public.admin_user_email(uuid) from anon, authenticated;
grant execute on function public.admin_user_email(uuid) to authenticated;

-- verify: this must return a single row saying the column is gone
select
  exists (select 1 from information_schema.columns
          where table_schema = 'public' and table_name = 'profiles' and column_name = 'email')
  as email_column_still_exists;
