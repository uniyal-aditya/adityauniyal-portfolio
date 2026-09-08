/* ══════════════════════════════════════════════════════════
   AU_ / JOURNAL — Supabase client bootstrap
   Loads the official @supabase/supabase-js v2 from CDN.
   Exposes window.sb (client) + window.AUAuth (auth/session).
   Only the public anon key is used here. Never the service key.
══════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  const CDN = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js';

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = () => reject(new Error('Failed to load ' + src));
      document.head.appendChild(s);
    });
  }

  const cfg = window.SUPABASE_CONFIG || {};
  let client = null;

  /* Returns the shared Supabase client, or null when not configured.
     Every journal page calls this before touching the database. */
  function getSupabase() {
    if (!cfg.configured || !cfg.configured()) return null;
    if (client) return client;
    if (!window.supabase || !window.supabase.createClient) return null;
    client = window.supabase.createClient(cfg.url, cfg.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
    return client;
  }

  /* ── Auth helpers ─────────────────────────────────────── */
  const AUAuth = {
    async getUser() {
      const sb = getSupabase();
      if (!sb) return null;
      const { data } = await sb.auth.getUser();
      return data && data.user ? data.user : null;
    },

    /* Returns the row in public.profiles for the signed-in user (or null). */
    async getProfile() {
      const sb = getSupabase();
      if (!sb) return null;
      const user = await this.getUser();
      if (!user) return null;
      const { data, error } = await sb
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();
      if (error) { console.warn('profile fetch failed', error.message); return null; }
      return data;
    },

    /* user + profile in one call. role is never trusted from the client —
       it comes from the RLS-protected profiles table only. */
    async getSession() {
      const sb = getSupabase();
      if (!sb) return { user: null, profile: null };
      const user = await this.getUser();
      const profile = user ? await this.getProfile() : null;
      return { user, profile };
    },

    async signIn(email, password) {
      const sb = getSupabase();
      if (!sb) return { error: 'Supabase not configured' };
      return sb.auth.signInWithPassword({ email, password });
    },

    async signUp(email, password, options) {
      const sb = getSupabase();
      if (!sb) return { error: 'Supabase not configured' };
      return sb.auth.signUp(Object.assign({ email, password }, options || {}));
    },

    async sendMagicLink(email) {
      const sb = getSupabase();
      if (!sb) return { error: 'Supabase not configured' };
      return sb.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: (cfg.authRedirectBase || window.location.origin + '/blog/login/') },
      });
    },

    async signOut() {
      const sb = getSupabase();
      if (!sb) return;
      await sb.auth.signOut();
    },

    /* Auth state listener; cb(user|null) */
    onChange(cb) {
      const sb = getSupabase();
      if (!sb || !sb.auth.onAuthStateChange) return () => {};
      const { data } = sb.auth.onAuthStateChange((_evt, session) => {
        cb(session && session.user ? session.user : null);
      });
      return () => { if (data && data.subscription) data.subscription.unsubscribe(); };
    },
  };

  /* Boot: load the CDN bundle once, then signal readiness. */
  window.AUJournalReady = (async function () {
    if (!cfg.configured || !cfg.configured()) {
      console.warn('[AU Journal] Supabase not configured — see js/supabase-config.js');
      return false;
    }
    try {
      if (!window.supabase) await loadScript(CDN);
      return true;
    } catch (err) {
      console.error('[AU Journal] Failed to load Supabase JS:', err);
      return false;
    }
  })();

  window.getSupabase = getSupabase;
  window.AUAuth = AUAuth;
})();
