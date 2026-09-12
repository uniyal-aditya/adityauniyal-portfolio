import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase, SUPABASE_CONFIGURED } from '@/lib/supabase'
import type { Profile } from '@/lib/types'

interface AuthState {
  session: Session | null
  user: User | null
  profile: Profile | null
  loading: boolean
  configured: boolean
  isAdmin: boolean
  isAuthor: boolean
  canPublishDirect: boolean
}

interface AuthActions {
  signInWithPassword: (email: string, password: string) => Promise<string | null>
  signUp: (email: string, password: string) => Promise<string | null>
  signInWithMagicLink: (email: string) => Promise<string | null>
  resetPassword: (email: string) => Promise<string | null>
  updatePassword: (password: string) => Promise<string | null>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const Ctx = createContext<(AuthState & AuthActions) | null>(null)

function friendly(msg: string): string {
  if (/invalid login credentials/i.test(msg)) return 'Wrong email or password.'
  if (/email not confirmed/i.test(msg)) return 'Confirm your email first - check your inbox.'
  if (/already registered/i.test(msg)) return 'User already registered - try signing in.'
  if (/rate limit/i.test(msg)) return 'Too many attempts. Wait a minute and retry.'
  if (/failed to fetch/i.test(msg)) return 'Auth service unreachable. Is Supabase configured?'
  return msg
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!SUPABASE_CONFIGURED) {
      setLoading(false)
      return
    }
    let cancelled = false
    supabase.auth.getSession().then(({ data }) => {
      if (!cancelled) setSession(data.session)
      if (!cancelled) setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
    })
    return () => {
      cancelled = true
      sub?.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    const uid = session?.user?.id
    if (!uid) {
      setProfile(null)
      return
    }
    let cancelled = false
    supabase
      .from('profiles')
      .select('*')
      .eq('id', uid)
      .single()
      .then(({ data }) => {
        if (!cancelled) setProfile((data as Profile) ?? null)
      })
    return () => {
      cancelled = true
    }
  }, [session?.user?.id])

  async function signInWithPassword(email: string, password: string) {
    if (!SUPABASE_CONFIGURED) return 'Auth is not configured yet.'
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return error ? friendly(error.message) : null
  }

  async function signUp(email: string, password: string) {
    if (!SUPABASE_CONFIGURED) return 'Auth is not configured yet.'
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) return friendly(error.message)
    // Projects without auto-confirm return no session; ask the user to verify.
    return data.session ? null : 'Check your inbox to confirm your email.'
  }

  async function signInWithMagicLink(email: string) {
    if (!SUPABASE_CONFIGURED) return 'Auth is not configured yet.'
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/blog/login` },
    })
    return error ? friendly(error.message) : null
  }

  async function resetPassword(email: string) {
    if (!SUPABASE_CONFIGURED) return 'Auth is not configured yet.'
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/blog/login?mode=reset`,
    })
    return error ? friendly(error.message) : null
  }

  async function updatePassword(password: string) {
    const { error } = await supabase.auth.updateUser({ password })
    return error ? friendly(error.message) : null
  }

  async function signOut() {
    await supabase.auth.signOut()
    setSession(null)
    setProfile(null)
  }

  async function refreshProfile() {
    const uid = session?.user?.id
    if (!uid) return
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', uid)
      .single()
    setProfile((data as Profile) ?? null)
  }

  const role = profile?.role
  const value: AuthState & AuthActions = {
    session,
    user: session?.user ?? null,
    profile,
    loading,
    configured: SUPABASE_CONFIGURED,
    isAdmin: role === 'admin' || role === 'owner',
    isAuthor: role === 'verified_author' || role === 'admin' || role === 'owner',
    canPublishDirect: role === 'verified_author' || role === 'admin' || role === 'owner',
    signInWithPassword,
    signUp,
    signInWithMagicLink,
    resetPassword,
    updatePassword,
    signOut,
    refreshProfile,
  }

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAuth(): AuthState & AuthActions {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
