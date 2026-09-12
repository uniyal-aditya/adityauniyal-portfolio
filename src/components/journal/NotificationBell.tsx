import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import { useAuth } from '@/hooks/useAuth'
import {
  fetchUnreadCount,
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  type NotificationItem,
} from '@/lib/journal-api'
import { timeAgo } from '@/lib/sanitize'
import { SUPABASE_CONFIGURED } from '@/lib/supabase'

const POLL_MS = 60_000

/**
 * In-app notification bell for the journal nav.
 * Polls the unread count while signed in; the dropdown lists recent
 * notifications (new posts from followed authors) and marks them read.
 */
export function NotificationBell() {
  const { user } = useAuth()
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  // close on outside click / Escape
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const enabled = Boolean(user) && SUPABASE_CONFIGURED

  const { data: unread } = useQuery({
    queryKey: ['notif-unread'],
    queryFn: fetchUnreadCount,
    enabled,
    refetchInterval: POLL_MS,
  })

  // refetch the list when the dropdown opens
  const { data: items } = useQuery({
    queryKey: ['notif-list'],
    queryFn: () => fetchNotifications(20),
    enabled: enabled && open,
  })

  // reset unread once the list has been seen open
  useEffect(() => {
    if (!open || !unread) return
    const t = setTimeout(() => {
      void markAllNotificationsRead().then(() => {
        void qc.invalidateQueries({ queryKey: ['notif-unread'] })
        void qc.invalidateQueries({ queryKey: ['notif-list'] })
      })
    }, 1200)
    return () => clearTimeout(t)
  }, [open, unread, qc])

  if (!user) return null

  return (
    <div className="nb-wrap" ref={wrapRef}>
      <button
        className="nb-btn"
        onClick={() => setOpen((v) => !v)}
        aria-label={'Notifications' + (unread ? ' (' + unread + ' unread)' : '')}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.7 21a2 2 0 0 1-3.4 0" />
        </svg>
        {Boolean(unread) && <span className="nb-dot" aria-hidden="true" />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="nb-panel"
            role="menu"
            aria-label="Notifications"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.16 }}
          >
            <div className="nb-head">
              <span>NOTIFICATIONS</span>
              {Boolean(unread) && (
                <button
                  className="nb-clear"
                  onClick={() => {
                    void markAllNotificationsRead().then(() => {
                      void qc.invalidateQueries({ queryKey: ['notif-unread'] })
                      void qc.invalidateQueries({ queryKey: ['notif-list'] })
                    })
                  }}
                >
                  mark all read
                </button>
              )}
            </div>
            <div className="nb-list">
              {(items ?? []).length === 0 && (
                <div className="nb-empty">
                  <span className="meta">Nothing yet.</span>
                  <span className="meta" style={{ color: 'var(--dim-3)' }}>
                    New posts from authors you follow land here.
                  </span>
                </div>
              )}
              {(items ?? []).map((n) => (
                <NotifRow key={n.id} n={n} onRead={() => {
                  void markNotificationRead(n.id).then(() => {
                    void qc.invalidateQueries({ queryKey: ['notif-unread'] })
                    void qc.invalidateQueries({ queryKey: ['notif-list'] })
                  })
                }} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function NotifRow({ n, onRead }: { n: NotificationItem; onRead: () => void }) {
  const unread = !n.read_at
  const initial = (n.actor_name || n.actor_username || 'A').charAt(0).toUpperCase()
  const body = (
    <>
      <span className={'nb-avatar' + (n.actor_avatar ? '' : ' fallback')}>{n.actor_avatar ? <img src={n.actor_avatar} alt="" loading="lazy" /> : initial}</span>
      <span className="nb-body">
        <span className="nb-text">
          <strong>{n.actor_name || n.actor_username || 'Someone'}</strong>
          {n.actor_verified ? <span className="badge-verified" title="Verified author">&#10003;</span> : null}
          {' '}published{' '}
          {n.post_slug ? <em className="nb-post-title">{n.post_title}</em> : <em>a new article</em>}
        </span>
        <span className="nb-time">{timeAgo(n.created_at)}</span>
      </span>
      {unread && <span className="nb-unread" aria-label="Unread" />}
    </>
  )
  const cls = 'nb-row' + (unread ? ' unread' : '')
  if (n.post_slug) {
    return (
      <Link className={cls} role="menuitem" to={'/blog/post/' + n.post_slug} onClick={onRead}>
        {body}
      </Link>
    )
  }
  return (
    <button className={cls} role="menuitem" onClick={onRead}>
      {body}
    </button>
  )
}
