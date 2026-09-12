import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

/** True only when both public env vars are present. Drives every graceful empty state. */
export const SUPABASE_CONFIGURED = Boolean(url && anonKey)

/**
 * Public anon client only — the service-role key never touches the frontend.
 * When unconfigured we still create a client against a placeholder so the app
 * renders; all queries fail fast and surfaces show "No data yet."
 */
export const supabase: SupabaseClient = createClient(
  url || 'https://placeholder.supabase.co',
  anonKey || 'public-anon-key-placeholder',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
)

/** Storage bucket for journal media (created by supabase/01-schema.sql). */
export const MEDIA_BUCKET = 'journal-media'
/** Owner username binding "From the Builder" to Aditya's posts. */
export const OWNER_USERNAME = 'adityauniyal'
