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
