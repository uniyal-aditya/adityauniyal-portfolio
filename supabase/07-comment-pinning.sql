-- ═══════════════════════════════════════════════════════════════════
-- AU_ / JOURNAL — migration 07: comment pinning + moderation stamps
-- Run once in Supabase → SQL Editor. Idempotent.
-- ───────────────────────────────────────────────────────────────────
--  • pinned / pinned_at        — admin pins a comment to the top of a
--                                thread (pinned_at records when)
--  • moderated_at / moderated_by — stamped automatically every time
--                                admin_set_comment_status changes a
--                                comment's status (hide/show/delete)
-- ───────────────────────────────────────────────────────────────────

alter table public.comments add column if not exists pinned boolean not null default false;
alter table public.comments add column if not exists pinned_at timestamptz;
alter table public.comments add column if not exists moderated_at timestamptz;
alter table public.comments add column if not exists moderated_by uuid references public.profiles(id) on delete set null;

comment on column public.comments.pinned is 'Admin-pinned: renders at the top of the discussion';
comment on column public.comments.moderated_at is 'Last time a moderator changed this comment''s status';
comment on column public.comments.moderated_by is 'Profile of the last moderator to act on this comment';

-- ── RPC: pin / unpin (admin only) ───────────────────────────────────
create or replace function public.admin_toggle_pin_comment(p_comment uuid, p_pinned boolean)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN: admin role required';
  end if;
  if p_pinned then
    update public.comments
       set pinned = true, pinned_at = now()
     where id = p_comment;
  else
    update public.comments
       set pinned = false, pinned_at = null
     where id = p_comment;
  end if;
end $$;

grant execute on function public.admin_toggle_pin_comment to authenticated;

-- ── RPC: status changes now stamp WHO moderated and WHEN ────────────
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
  update public.comments
     set status = p_status::comment_status,
         moderated_at = now(),
         moderated_by = auth.uid()
   where id = p_comment;
end $$;

grant execute on function public.admin_set_comment_status to authenticated;

-- ── SECURITY: only the pin RPC may set pinned/pinned_at ────────────
-- RLS cannot restrict which COLUMNS a client can write, and the
-- comments_author_update policy lets authors edit their own comments.
-- Without this trigger any reader could self-pin to the top of any
-- thread. The trigger reverts client writes to the pin columns unless
-- the session is admin/owner (the RPC runs as security definer, so it
-- is unaffected — its role check has already passed by the time the
-- update fires the trigger).
create or replace function public.enforce_comment_pin_authority()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  is_mod boolean;
begin
  if new.pinned is distinct from old.pinned or new.pinned_at is distinct from old.pinned_at then
    select exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('admin', 'owner')
    ) into is_mod;
    if not is_mod then
      new.pinned    := old.pinned;
      new.pinned_at := old.pinned_at;
    end if;
  end if;
  return new;
end $$;

drop trigger if exists comments_pin_authority on public.comments;
create trigger comments_pin_authority
  before update on public.comments
  for each row execute function public.enforce_comment_pin_authority();

comment on function public.enforce_comment_pin_authority is 'Reverts client writes to pinned/pinned_at unless the caller is admin/owner; the admin pin RPC is unaffected (security definer).';
