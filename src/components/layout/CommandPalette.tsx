import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useAuth } from '@/hooks/useAuth'

interface Cmd {
  id: string
  label: string
  hint?: string
  action: () => void
}

/** Ctrl/Cmd+K command palette - navigation, journal actions, contact. */
export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  const { profile, isAdmin } = useAuth()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((v) => !v)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    const onOpen = () => setOpen(true)
    document.addEventListener('keydown', onKey)
    window.addEventListener('au:palette', onOpen as EventListener)
    return () => {
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('au:palette', onOpen as EventListener)
    }
  }, [])

  useEffect(() => {
    if (open) {
      setQuery('')
      setActive(0)
      window.setTimeout(() => inputRef.current?.focus(), 30)
    }
  }, [open])

  const cmds = useMemo<Cmd[]>(() => {
    const go = (to: string) => () => navigate(to)
    const base: Cmd[] = [
      { id: 'home', label: 'Home', hint: 'page', action: go('/') },
      { id: 'work', label: 'Work', hint: 'page', action: go('/work') },
      { id: 'projects', label: 'Projects', hint: 'page', action: go('/projects') },
      { id: 'about', label: 'About', hint: 'page', action: go('/about') },
      { id: 'skills', label: 'Skills', hint: 'page', action: go('/skills') },
      { id: 'connect', label: 'Contact', hint: 'page', action: go('/connect') },
      { id: 'feedback', label: 'Feedback', hint: 'page', action: go('/feedback') },
      { id: 'blog', label: 'AU_ / Journal', hint: 'page', action: go('/blog') },
      { id: 'blog-search', label: 'Search the Journal', hint: 'journal', action: go('/blog/search') },
      { id: 'blog-series', label: 'Series', hint: 'journal', action: go('/blog/search?type=series') },
      { id: 'contact-copy', label: 'Copy contact email', hint: 'action', action: () => {
        navigator.clipboard?.writeText('aditya@adityauniyal.dev').catch(() => undefined)
      } },
    ]
    if (profile) base.push({ id: 'dash', label: 'My dashboard', hint: 'you', action: go('/blog/dashboard') })
    if (profile) base.push({ id: 'editor', label: 'Write a new article', hint: 'you', action: go('/blog/dashboard/editor') })
    if (isAdmin) base.push({ id: 'admin', label: 'Admin console', hint: 'admin', action: go('/blog/admin') })
    base.push({ id: 'apply', label: 'Become a contributor', hint: 'journal', action: go('/blog/apply') })
    return base
  }, [navigate, profile, isAdmin])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return cmds
    return cmds.filter((c) => c.label.toLowerCase().includes(q))
  }, [cmds, query])

  useEffect(() => setActive(0), [query])

  function run(i: number) {
    const c = filtered[i]
    if (!c) return
    setOpen(false)
    c.action()
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="palette-bg"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false)
          }}
        >
          <motion.div
            className="palette"
            initial={{ y: -8, scale: 0.98 }}
            animate={{ y: 0, scale: 1 }}
            exit={{ y: -6, scale: 0.99 }}
            transition={{ duration: 0.18 }}
            role="dialog"
            aria-modal="true"
            aria-label="Command palette"
          >
            <input
              ref={inputRef}
              className="palette-input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown') {
                  e.preventDefault()
                  setActive((a) => Math.min(a + 1, filtered.length - 1))
                }
                if (e.key === 'ArrowUp') {
                  e.preventDefault()
                  setActive((a) => Math.max(a - 1, 0))
                }
                if (e.key === 'Enter') {
                  e.preventDefault()
                  run(active)
                }
              }}
              placeholder="Type a command or search..."
              aria-label="Command input"
            />
            <div className="palette-list" role="listbox">
              {filtered.map((c, i) => (
                <button
                  key={c.id}
                  role="option"
                  aria-selected={i === active}
                  className={'palette-item' + (i === active ? ' active' : '')}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => run(i)}
                >
                  <span>{c.label}</span>
                  {c.hint && <span className="palette-hint">{c.hint}</span>}
                </button>
              ))}
              {!filtered.length && <div className="palette-empty">No matching commands.</div>}
            </div>
            <div className="palette-foot">
              <span>&uarr;&darr; navigate</span>
              <span>&crarr; select</span>
              <span>esc close</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
