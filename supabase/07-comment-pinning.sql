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
