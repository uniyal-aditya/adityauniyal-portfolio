-- ═══════════════════════════════════════════════════════════════════
-- AU_ / JOURNAL — migration 09: profile identity fields
-- Adds public profile fields for the profile redesign (task #35/#38):
--   location    → user-provided, never auto-derived
--   interests   → freeform labels (comma-separated in the edit form)
-- Both nullable, no backfill. Idempotent.
-- ═══════════════════════════════════════════════════════════════════

alter table public.profiles add column if not exists location text;
alter table public.profiles add column if not exists interests text;
