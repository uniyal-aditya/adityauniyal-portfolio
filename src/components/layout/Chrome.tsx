import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Magnetic } from '@/components/ui/primitives'
import { Cursor, Scanline } from '@/components/system/Effects'
import { SeasonalEffect } from '@/components/system/SeasonalEffect'
import { CommandPalette } from '@/components/layout/CommandPalette'
import { AccountCluster } from '@/components/layout/AccountCluster'

export const NAV_LINKS = [
  { to: '/', label: 'Home' },
  { to: '/work', label: 'Work' },
  { to: '/building', label: 'Building' },
  { to: '/about', label: 'About' },
  { to: '/connect', label: 'Contact' },
  { to: '/blog', label: 'Journal' },
]

/** Fixed top navigation - faithful port with the Journal link and cmd-K hint. */
export function PortfolioNav({ onHire }: { onHire: () => void }) {
  const [stuck, setStuck] = useState(false)
  const [open, setOpen] = useState(false)
  const mobileNavRef = useRef<HTMLElement>(null)
  const loc = useLocation()

  useEffect(() => {
    const onScroll = () => setStuck(window.scrollY > 10)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => setOpen(false), [loc.pathname])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  // The drawer stays in the DOM for its slide transition (it is only moved
  // off-canvas with transform), so its links and buttons would otherwise
  // remain keyboard-tabbable while closed. `inert` removes it from tab order
  // and focus; aria-hidden below stays as a fallback for browsers without
  // inert support. useLayoutEffect applies before first paint.
  useLayoutEffect(() => {
    if (mobileNavRef.current) mobileNavRef.current.inert = !open
  }, [open])

  return (
    <>
      <nav className={'nav' + (stuck ? ' stuck' : '')} id="mainNav">
        <Link to="/" className="nav-logo">
          AU<span className="dot">_</span>
        </Link>
        <div className="nav-links">
          {NAV_LINKS.map((l, i) => (
            <NavLink key={l.to} to={l.to} data-index={String(i + 1).padStart(2, '0')} className={({ isActive }) => (isActive ? 'active' : '')} end={l.to === '/'}>
              {l.label}
            </NavLink>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button className="nav-kbd" onClick={() => window.dispatchEvent(new CustomEvent('au:palette'))} aria-label="Open command palette">
            Ctrl K
          </button>
          <AccountCluster />
          <Magnetic>
            <button className="nav-hire" onClick={onHire}>
              Let's Connect &rarr;
            </button>
          </Magnetic>
        </div>
        <button className={'hamburger' + (open ? ' open' : '')} id="hamburger" aria-label="Menu" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
          <span></span>
          <span></span>
          <span></span>
        </button>
      </nav>

      <nav ref={mobileNavRef} className={'mobile-nav' + (open ? ' open' : '')} id="mobileNav" aria-hidden={!open}>
        {NAV_LINKS.map((l) => (
          <NavLink key={l.to} to={l.to} className={({ isActive }) => (isActive ? 'active' : '')} end={l.to === '/'}>
            {l.label}
          </NavLink>
        ))}
        <div className="mobile-nav-foot">
          <button className="btn-lime" onClick={onHire}>
            Let's Connect &rarr;
          </button>
          <a href="/assets/Aditya_Uniyal_Resume.pdf" download className="btn-ghost-line">
            Resume &darr;
          </a>
        </div>
      </nav>
    </>
  )
}

/** Editorial footer shared by portfolio pages. */
export function Footer() {
  const yr = new Date().getFullYear()
  return (
    <footer className="footer">
      <div className="footer-left">
        &copy; <span>{yr}</span> <strong>Aditya Uniyal</strong> &middot; Built from scratch.
      </div>
      <div className="footer-right">
        <Link to="/privacy">Privacy</Link>
        <Link to="/terms">Terms</Link>
        <Link to="/data-use">Data use</Link>
        <Link to="/work">Work</Link>
        <Link to="/building">Building</Link>
        <Link to="/connect">Contact</Link>

        <a
          href="https://github.com/uniyal-aditya"
          target="_blank"
          rel="noopener noreferrer"
        >
          GitHub
        </a>

        <a
          href="https://x.com/RaftarCreates"
          target="_blank"
          rel="noopener noreferrer"
        >
          X
        </a>

        <a
          href="https://www.linkedin.com/in/uniyaladitya"
          target="_blank"
          rel="noopener noreferrer"
        >
          LinkedIn
        </a>
      </div>
    </footer>
  )
}

/** Connection modal with social profiles and direct contact options. */
export function HireModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="modal-bg open"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose()
          }}
        >
          <motion.div
            className="modal-box"
            initial={{ y: 20, scale: 0.97 }}
            animate={{ y: 0, scale: 1 }}
            exit={{ y: 12, scale: 0.98 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            role="dialog"
            aria-modal="true"
            aria-label="Let's Connect"
          >
            <button className="modal-x" onClick={onClose} aria-label="Close">
              &#10005;
            </button>
            <h3>Let's Connect.</h3>

            <div className="sub">
  // explore my work, follow my updates, or get in touch.
            </div>

            <div className="hire-opts">
              <a
                href="https://github.com/uniyal-aditya"
                target="_blank"
                rel="noopener noreferrer"
                className="hire-opt"
              >
                <span className="hire-opt-ico">&#128187;</span>
                <span className="hire-opt-text">
                  GitHub
                  <small>Repositories, projects &amp; contributions</small>
                </span>
                <span className="hire-opt-arr">&rarr;</span>
              </a>

              <a
                href="https://x.com/RaftarCreates"
                target="_blank"
                rel="noopener noreferrer"
                className="hire-opt"
              >
                <span className="hire-opt-ico">&#120143;</span>
                <span className="hire-opt-text">
                  X / Updates
                  <small>Development updates &amp; experiments</small>
                </span>
                <span className="hire-opt-arr">&rarr;</span>
              </a>

              <a
                href="https://www.linkedin.com/in/uniyaladitya"
                target="_blank"
                rel="noopener noreferrer"
                className="hire-opt"
              >
                <span className="hire-opt-ico">&#128188;</span>
                <span className="hire-opt-text">
                  LinkedIn
                  <small>Professional profile &amp; connections</small>
                </span>
                <span className="hire-opt-arr">&rarr;</span>
              </a>

              <Link to="/connect" className="hire-opt" onClick={onClose}>
                <span className="hire-opt-ico">&#9993;&#65039;</span>
                <span className="hire-opt-text">
                  Direct Contact
                  <small>Projects, open source &amp; technical discussions</small>
                </span>
                <span className="hire-opt-arr">&rarr;</span>
              </Link>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/** Full page chrome: cursor, scanline, nav, palette, footer. */
export function Chrome({ children }: { children?: ReactNode }) {
  const [hireOpen, setHireOpen] = useState(false)
  const loc = useLocation()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [loc.pathname])

  return (
    <>
      <Cursor />
      <Scanline />
      <SeasonalEffect />
      <PortfolioNav onHire={() => setHireOpen(true)} />
      <CommandPalette />
      <HireModal open={hireOpen} onClose={() => setHireOpen(false)} />
      {children ?? <Outlet />}
      <Footer />
    </>
  )
}
