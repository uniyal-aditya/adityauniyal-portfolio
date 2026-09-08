/* ══════════════════════════════════════════════════════════
   AU_ / JOURNAL — Supabase configuration
   ──────────────────────────────────────────────────────────
   ONLY the public anon key belongs in this file.
   NEVER put the service-role key, SendGrid key, or any other
   server secret here — service keys must stay in server
   environments (Netlify functions, Supabase Edge Functions).
══════════════════════════════════════════════════════════ */

// ── 1. Supabase project URL — e.g. https://xxxxx.supabase.co
const SUPABASE_URL = '';

// ── 2. Supabase public anon key (Project Settings → API → anon public)
const SUPABASE_ANON_KEY = '';

/* ── Server-side constants (safe: read-only public identifiers) ──
   Storage bucket that must exist in your Supabase project.
   Set up with the SQL in supabase/schema.sql.
   The bucket itself is PUBLIC-READ via a storage policy —
   the anon key never grants write access. */
const SUPABASE_STORAGE_BUCKET = 'journal-media';
const SUPABASE_TABLE_PREFIX = ''; // reserved

/* ── Portfolio identity (used to bind "From the Builder" posts) ── */
const OWNER_USERNAME = 'adityauniyal';

/* ── Supabase Auth settings ── */
const AUTH_REDIRECT_BASE = window.location.origin + '/blog/login/';

const SUPABASE_CONFIG = {
  url: SUPABASE_URL,
  anonKey: SUPABASE_ANON_KEY,
  storageBucket: SUPABASE_STORAGE_BUCKET,
  ownerUsername: OWNER_USERNAME,
  authRedirectBase: AUTH_REDIRECT_BASE,
  configured() {
    return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
  },
};

window.SUPABASE_CONFIG = SUPABASE_CONFIG;
