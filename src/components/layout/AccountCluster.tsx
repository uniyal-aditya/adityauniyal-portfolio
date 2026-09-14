import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { NotificationBell } from '@/components/journal/NotificationBell'

/**
 * Signed-in account cluster (bell + avatar menu) or Sign in link.
 * Shared by the portfolio nav and the journal nav so authentication UI
 * is consistent across the whole site, not just /blog.
 */
export function AccountCluster() {
  const { user, profile, isAdmin, signOut } = useAuth()
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <NotificationBell />
      {user ? (
        <div className="jn-user" tabIndex={0} aria-haspopup="menu">
          <Link to="/blog/dashboard" className="journal-nav-user" title="Dashboard">
            <span className="ac-fallback" style={{ width: 28, height: 28, fontSize: 11 }}>
              {(profile?.display_name || profile?.username || user.email || '?').charAt(0).toUpperCase()}
            </span>
            <span className="jn-name">{profile?.display_name || profile?.username || 'you'}</span>
            {profile?.verified && <span className="badge-verified" title="Verified author">&#10003;</span>}
          </Link>
          <div className="jn-user-menu" role="menu" aria-label="Account menu">
            <div className="jn-menu-role">{profile ? profile.role.replace('_', ' ').toUpperCase() : 'MEMBER'}</div>
            <Link role="menuitem" to={profile?.username ? '/blog/author/' + profile.username : '/blog/dashboard'}>
              My profile &rarr;
            </Link>
            <Link role="menuitem" to="/blog/dashboard">
              Dashboard
            </Link>
            <Link role="menuitem" to="/blog/dashboard?tab=profile">
              Edit profile
            </Link>
            {isAdmin && (
              <Link role="menuitem" to="/blog/admin">
                Admin console
              </Link>
            )}
            <button role="menuitem" onClick={() => void signOut()}>
              Sign out
            </button>
          </div>
        </div>
      ) : (
        <Link to="/blog/login" className="btn-ghost-line btn-small">
          Sign in
        </Link>
      )}
    </div>
  )
}
