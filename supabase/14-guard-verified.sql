-- 14: guard `verified` + posts content (run in the Supabase SQL editor)
-- Idempotent: safe to re-run. Supersedes profiles_self_update from 02-rls.sql
-- (re-running 02-rls.sql afterwards would restore the weaker policy — avoid).

-- ── 1. PROFILES: only admins may change verified ───────────────────
-- profiles_self_update previously pinned only `role`, so a user could
-- set their own verified = true with a normal update. Admins toggle
-- verified through the admin_set_verified RPC (03-rpc.sql), which runs
-- SECURITY DEFINER and is unaffected by this policy.
drop policy if exists profiles_self_update on public.profiles;
create policy profiles_self_update on public.profiles
  for update using (auth.uid() = id)
  with check (
    auth.uid() = id
    -- prevent self-escalation: non-admins can never change their role
    and (role = public.current_role() or public.is_admin())
    -- prevent self-verification: verified may only stay the same, unless admin
    and (
      verified = (select p.verified from public.profiles p where p.id = auth.uid())
      or public.is_admin()
    )
  );

-- ── 2. POSTS: content guard ────────────────────────────────────────
-- posts.content is either Tiptap JSON ({"type":"doc",...}) or legacy
-- markdown. The markdown renderer builds alt="..." from image alt text,
-- so a " or ' inside an alt payload could break out of the attribute
-- (the renderer now escapes it; this blocks bad rows at the DB too,
-- including anything written before that fix).
create or replace function public.guard_posts_content() returns trigger
language plpgsql as $$
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

drop trigger if exists posts_content_guard on public.posts;
create trigger posts_content_guard
  before insert or update on public.posts
  for each row execute function public.guard_posts_content();
