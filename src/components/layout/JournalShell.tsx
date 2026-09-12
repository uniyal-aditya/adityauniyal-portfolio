import { useState, type ReactNode } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Cursor, Scanline } from '@/components/system/Effects'
import { useAuth } from '@/hooks/useAuth'
import { CommandPalette } from '@/components/layout/CommandPalette'

const JOURNAL_LINKS = [
  { to: '/blog', label: 'Home', end: true },
  { to: '/blog/search', label: 'Search', end: false },
  { to: '/blog/series', label: 'Series', end: false },
]

/** AU_ / JOURNAL navigation bar. */
export function JournalNav() {
  const { user, profile, isAdmin, signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const loc = useLocation()

  return (
    <nav className="nav stuck journal-nav">
      <Link to="/" className="nav-logo" title="Back to portfolio">
        AU<span className="dot">_</span>
        <span className="jn-sep">/ JOURNAL</span>
      </Link>
      <div className="nav-links">
        {JOURNAL_LINKS.map((l) => {
          const active = l.end ? loc.pathname === l.to : loc.pathname.startsWith(l.to)
          return (
            <NavLink key={l.to} to={l.to} className={active ? 'active' : ''} end={l.end}>
              {l.label}
            </NavLink>
          )
        })}
      </div>
      <div className="jn-right">
        <button className="nav-kbd" onClick={() => window.dispatchEvent(new CustomEvent('au:palette'))} aria-label="Open command palette">
          Ctrl K
        </button>
        {user ? (
          <div className="jn-user" tabIndex={0} aria-haspopup="menu">
            <Link to="/blog/dashboard" className="journal-nav-user" title="Dashboard">
              <span className="ac-fallback" style={{ width: 28, height: 28 }}>
                {(profile?.display_name || profile?.username || user.email || '?').charAt(0).toUpperCase()}
              </span>
              <span className="jn-name">{profile?.display_name || profile?.username || 'you'}</span>
              {profile?.verified && <span className="badge-verified" title="Verified author">&#10003;</span>}
            </Link>
            <div className="jn-user-menu" role="menu" aria-label="Account menu">
              <div className="jn-menu-role">{profile ? profile.role.replace('_', ' ').toUpperCase() : 'MEMBER'}</div>
              <Link role="menuitem" to={profile?.username ? '/blog/author/' + profile.username : '/blog/dashboard'} onClick={() => setOpen(false)}>
                My profile &rarr;
              </Link>
              <Link role="menuitem" to="/blog/dashboard" onClick={() => setOpen(false)}>
                Dashboard
              </Link>
              <Link role="menuitem" to="/blog/dashboard?tab=profile" onClick={() => setOpen(false)}>
                Edit profile
              </Link>
              {isAdmin && (
                <Link role="menuitem" to="/blog/admin" onClick={() => setOpen(false)}>
                  Admin console
                </Link>
              )}
              <button role="menuitem" onClick={() => { setOpen(false); void signOut() }}>
                Sign out
              </button>
            </div>
          </div>
        ) : (
          <Link to="/blog/login" className="btn-ghost-line btn-small">
            Sign in
          </Link>
        )}
        <button className={'hamburger' + (open ? ' open' : '')} aria-label="Menu" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
          <span></span>
          <span></span>
          <span></span>
        </button>
      </div>
      <AnimatePresence>
        {open && (
          <motion.div
            className="mobile-nav open jn-mobile"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {JOURNAL_LINKS.map((l) => (
              <Link key={l.to} to={l.to} onClick={() => setOpen(false)}>
                {l.label}
              </Link>
            ))}
            {user && (
              <>
                <Link to={profile?.username ? '/blog/author/' + profile.username : '/blog/dashboard'} onClick={() => setOpen(false)}>
                  My profile
                </Link>
                <Link to="/blog/dashboard?tab=profile" onClick={() => setOpen(false)}>
                  Edit profile
                </Link>
              </>
            )}
            <Link to="/blog/apply" onClick={() => setOpen(false)}>
              Become a contributor
            </Link>
            <div className="mobile-nav-foot">
              {user ? (
                <button className="btn-ghost-line" onClick={() => { setOpen(false); void signOut() }}>
                  Sign out
                </button>
              ) : (
                <Link to="/blog/login" className="btn-lime" onClick={() => setOpen(false)}>
                  Sign in
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  )
}

/**
 * Journal layout shell - keeps the same fixed nav + footer rhythm as the
 * portfolio but with journal-specific metadata styling.
 */
export function JournalShell({ children }: { children?: ReactNode }) {
  return (
    <>
      <Cursor />
      <Scanline />
      <JournalNav />
      <CommandPalette />
      <div className="journal-main">{children ?? <Outlet />}</div>
      <FooterJournal />
    </>
  )
}

/** Journal footer - same treatment as the portfolio footer. */
export function FooterJournal() {
  return (
    <footer className="footer">
      <div className="footer-left">
        &copy; {new Date().getFullYear()} <strong>Aditya Uniyal</strong> &middot; AU_ / JOURNAL
      </div>
      <div className="footer-right">
        <Link to="/">Portfolio</Link>
        <Link to="/blog">Journal</Link>
        <Link to="/blog/search">Search</Link>
        <Link to="/blog/apply">Write for us</Link>
        <Link to="/privacy">Privacy</Link>
      </div>
    </footer>
  )
}
