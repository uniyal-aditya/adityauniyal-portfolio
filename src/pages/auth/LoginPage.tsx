import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Seo } from '@/lib/seo'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/useToast'

type Mode = 'signin' | 'signup' | 'reset'

export default function LoginPage() {
  const { configured, signInWithPassword, signUp, signInWithMagicLink, resetPassword, updatePassword } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const isRecovery = params.get('mode') === 'reset'
  const [mode, setMode] = useState<Mode>(params.get('mode') === 'signup' ? 'signup' : 'signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    if (isRecovery) {
      const err = await updatePassword(password)
      setBusy(false)
      if (err) return toast(err, true)
      toast('Password updated.')
      navigate('/blog/dashboard')
      return
    }
    if (mode === 'signin') {
      const err = await signInWithPassword(email, password)
      setBusy(false)
      if (err) return toast(err, true)
      navigate('/blog/dashboard')
    } else if (mode === 'signup') {
      const msg = await signUp(email, password)
      setBusy(false)
      toast(msg ?? 'Account created. Check your inbox if confirmation is required.')
      if (!msg) navigate('/blog/dashboard')
    } else {
      const err = await resetPassword(email)
      setBusy(false)
      toast(err ?? 'Reset link sent - check your inbox.')
      if (!err) setMode('signin')
    }
  }

  if (!configured) {
    return (
      <div className="container" style={{ paddingTop: 120, maxWidth: 640 }}>
        <Seo title="Sign in - AU_ / JOURNAL" path="/blog/login" noindex />
        <div className="dash-card">
          <div className="toc-label">Backend not connected</div>
          <h2 style={{ fontFamily: 'var(--f-display)', fontSize: '2rem', margin: '10px 0 16px' }}>
            Accounts unlock in 3 steps<span style={{ color: 'var(--lime)' }}>_</span>
          </h2>
          <ol className="setup-steps meta">
            <li>
              Create a free project at <a className="text-link" href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer">supabase.com/dashboard</a>
            </li>
            <li>
              Run <code>supabase/01…04-*.sql</code> from this repo in the SQL Editor
            </li>
            <li>
              Copy <code>.env.example</code> → <code>.env.local</code>, paste the project URL + anon key, restart <code>npm run dev</code>
            </li>
          </ol>
          <p className="meta" style={{ marginTop: 14 }}>
            Full walkthrough in <code>readme.md</code> → "Setup — 15 minutes".
          </p>
        </div>
        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <Link to="/blog" className="btn-ghost-line">Back to the journal</Link>
        </div>
      </div>
    )
  }

  const title = isRecovery ? 'New password' : mode === 'signup' ? 'Create account' : mode === 'reset' ? 'Reset password' : 'Sign in'
  return (
    <div className="auth-page">
      <Seo title="Sign in - AU_ / JOURNAL" path="/blog/login" noindex />
      <div className="container auth-box">
        <div className="auth-head">
          <div className="pt-label">AU_ / JOURNAL</div>
          <h1 style={{ fontFamily: 'var(--f-display)', fontSize: 'clamp(2.4rem,6vw,3.6rem)', lineHeight: 1 }}>{title}</h1>
        </div>
        <form className="cf" onSubmit={submit}>
          {!isRecovery && mode !== 'reset' && (
            <div className="cf-group">
              <label className="cf-label" htmlFor="auth-email">Email</label>
              <input className="cf-input" id="auth-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
            </div>
          )}
          {!(isRecovery && password) && (mode !== 'reset' || isRecovery) && (
            <div className="cf-group">
              <label className="cf-label" htmlFor="auth-pass">{isRecovery ? 'New password' : 'Password'}</label>
              <input className="cf-input" id="auth-pass" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} />
            </div>
          )}
          <button className="btn-lime" type="submit" disabled={busy} style={{ justifyContent: 'center' }}>
            {busy ? '...' : title.toUpperCase() + ' \u2192'}
          </button>
        </form>
        {!isRecovery && (
          <div className="auth-alt meta">
            {mode === 'signin' ? (
              <>
                No account? <button className="text-link" onClick={() => setMode('signup')}>Sign up</button>
                <span className="dot-sep">&middot;</span>
                <button className="text-link" onClick={() => setMode('reset')}>Forgot password?</button>
                <span className="dot-sep">&middot;</span>
                <button className="text-link" onClick={async () => { const err = await signInWithMagicLink(email); toast(err ?? 'Magic link sent - check your inbox.') }}>Magic link</button>
              </>
            ) : (
              <>
                Have an account? <button className="text-link" onClick={() => setMode('signin')}>Sign in</button>
              </>
            )}
          </div>
        )}
        <div className="auth-foot meta">
          <Link to="/">Portfolio</Link>
          <Link to="/blog">Journal</Link>
          <Link to="/blog/apply">Become a contributor</Link>
        </div>
      </div>
    </div>
  )
}
