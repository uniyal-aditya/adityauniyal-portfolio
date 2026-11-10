import { useEffect, useRef, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react'
import { AnimatePresence, m } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { AppIcon } from '@/components/icons/AppIcon'
import { SOCIALS, getSocial, type Social } from '@/data/socials'
import { fetchBuilding } from '@/lib/github'
import { GithubLive, SectionList } from '@/components/system/SocialPreviews'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { useToast } from '@/hooks/useToast'

interface Props {
  /** Which profile to show; null = closed (lets the exit animation play). */
  activeId: Social['id'] | null
  onSelect: (id: Social['id']) => void
  onClose: () => void
}

/**
 * In-site profile popup (no new browser window).
 *
 * LinkedIn, X and GitHub forbid being embedded in other sites (X-Frame-Options /
 * frame-ancestors), so instead of an iframe this shows a profile card — and the
 * "Open profile" button is the one deliberate step out to the real page.
 */
export default function SocialModal({ activeId, onSelect, onClose }: Props) {
  const social = activeId ? getSocial(activeId) : null
  const reduced = useReducedMotion()
  const { toast } = useToast()
  const cardRef = useRef<HTMLDivElement>(null)
  const tiltRef = useRef<HTMLDivElement>(null)
  const ctaRef = useRef<HTMLAnchorElement>(null)
  const raf = useRef(0)

  // Live GitHub numbers — only fetched while the GitHub card is showing.
  const gh = useQuery({
    queryKey: ['github-building'],
    queryFn: fetchBuilding,
    staleTime: 10 * 60_000,
    retry: 1,
    enabled: activeId === 'github',
  })

  const open = activeId !== null

  // Escape closes, page stops scrolling underneath, focus lands on the main action.
  useEffect(() => {
    if (!open) return
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    const prev = document.body.style.overflow
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    const t = window.setTimeout(() => ctaRef.current?.focus(), 60)
    return () => {
      window.clearTimeout(t)
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  // Keep Tab inside the dialog.
  const trapTab = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Tab') return
    const nodes = cardRef.current?.querySelectorAll<HTMLElement>('a[href], button:not([disabled])')
    if (!nodes || nodes.length === 0) return
    const first = nodes[0]
    const last = nodes[nodes.length - 1]
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }

  // 3D tilt + moving glare (mouse only; skipped for touch and reduced motion).
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (reduced || e.pointerType !== 'mouse') return
    const el = tiltRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const px = (e.clientX - r.left) / r.width - 0.5
    const py = (e.clientY - r.top) / r.height - 0.5
    cancelAnimationFrame(raf.current)
    raf.current = requestAnimationFrame(() => {
      el.style.setProperty('--rx', (-py * 9).toFixed(2) + 'deg')
      el.style.setProperty('--ry', (px * 11).toFixed(2) + 'deg')
      el.style.setProperty('--gx', ((px + 0.5) * 100).toFixed(1) + '%')
      el.style.setProperty('--gy', ((py + 0.5) * 100).toFixed(1) + '%')
    })
  }
  const resetTilt = () => {
    cancelAnimationFrame(raf.current)
    const el = tiltRef.current
    if (!el) return
    el.style.setProperty('--rx', '0deg')
    el.style.setProperty('--ry', '0deg')
  }

  const copyLink = () => {
    if (!social) return
    const done = () => toast(social.label + ' link copied')
    const fail = () => toast('Could not copy. Link: ' + social.url, true)
    if (!navigator.clipboard) return fail()
    navigator.clipboard.writeText(social.url).then(done).catch(fail)
  }

  const stats: [string, string][] = []
  const ghUser = activeId === 'github' ? gh.data?.user : undefined
  if (activeId === 'github' && gh.data) {
    const d = gh.data
    if (typeof d.user.public_repos === 'number') stats.push(['Repos', String(d.user.public_repos)])
    if (typeof d.user.followers === 'number') stats.push(['Followers', String(d.user.followers)])
    if (typeof d.user.following === 'number') stats.push(['Following', String(d.user.following)])
    if (d.calendar && !d.calendar.unavailable) {
      stats.push(['Contributions', String(d.calendar.total)])
      stats.push(['Streak', d.calendar.streak + ' d'])
    }
  }
  // Real GitHub avatar + bio when the live data has arrived; site logo otherwise.
  const avatar = ghUser?.avatar_url ?? '/assets/logo.png'
  const bio = ghUser?.bio || social?.blurb

  return (
    <AnimatePresence>
      {social && (
        <m.div
          key="soc-bg"
          className="soc-bg"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose()
          }}
        >
          <m.div
            className="soc-wrap"
            initial={reduced ? false : { opacity: 0, y: 28, scale: 0.95, rotateX: 8 }}
            animate={{ opacity: 1, y: 0, scale: 1, rotateX: 0 }}
            exit={{ opacity: 0, y: 14, scale: 0.97 }}
            transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="soc-tilt" ref={tiltRef} onPointerMove={onPointerMove} onPointerLeave={resetTilt}>
              <div
                className="soc-card"
                ref={cardRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="soc-title"
                style={{ '--accent': social.accent } as CSSProperties}
                onKeyDown={trapTab}
              >
                <span className="soc-glare" aria-hidden="true" />
                <button type="button" className="soc-x" onClick={onClose} aria-label="Close profile popup">
                  <AppIcon name="close" size={18} />
                </button>

                <div className="soc-banner" aria-hidden="true">
                  <span className="soc-orb" />
                  <span className="soc-grid" />
                  <span className="soc-badge">
                    <AppIcon name={social.icon} size={44} />
                  </span>
                </div>

                <m.div
                  key={social.id}
                  className="soc-main"
                  initial={reduced ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                >
                  <div className="soc-scroll">
                    <div className="soc-body">
                      <div className="soc-id">
                        <img className="soc-avatar" src={avatar} alt="" width={56} height={56} />
                        <div>
                          <h3 id="soc-title" className="soc-name">
                            Aditya Uniyal
                          </h3>
                          <div className="soc-handle">
                            {social.label} · {social.handle}
                          </div>
                        </div>
                      </div>

                      {social.headline ? (
                        <p className="soc-headline">{social.headline}</p>
                      ) : (
                        <p className="soc-tagline">{social.tagline}</p>
                      )}
                      {social.location && <div className="soc-loc">{social.location}</div>}
                      {bio && <p className="soc-blurb">{bio}</p>}

                      {social.highlights.length > 0 && (
                        <ul className="soc-chips" aria-label={'What you will find on ' + social.label}>
                          {social.highlights.map((h) => (
                            <li key={h} className="soc-chip">
                              {h}
                            </li>
                          ))}
                        </ul>
                      )}

                      {activeId === 'github' && (gh.isLoading || stats.length > 0) && (
                        <dl className="soc-stats" aria-label="Live GitHub numbers">
                          {gh.isLoading
                            ? [0, 1, 2, 3].map((i) => <div key={i} className="soc-stat soc-skel" aria-hidden="true" />)
                            : stats.map(([k, v]) => (
                                <div key={k} className="soc-stat">
                                  <dd>{v}</dd>
                                  <dt>{k}</dt>
                                </div>
                              ))}
                        </dl>
                      )}

                      {activeId === 'github' && gh.data && <GithubLive data={gh.data} />}
                      {social.sections && <SectionList sections={social.sections} />}
                    </div>
                  </div>

                  <div className="soc-foot">
                    <div className="soc-actions">
                      <a
                        ref={ctaRef}
                        className="btn-lime soc-cta"
                        href={social.url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {social.cta}
                        <AppIcon name="arrowUpRight" size={16} />
                      </a>
                      <button type="button" className="btn-ghost-line soc-copy" onClick={copyLink}>
                        <AppIcon name="copy" size={15} />
                        Copy link
                      </button>
                    </div>
                    <div className="soc-note">Opens {social.label} in a new tab</div>

                    <div className="soc-switch" role="group" aria-label="Switch profile">
                      {SOCIALS.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          className={'soc-sw' + (s.id === social.id ? ' on' : '')}
                          aria-pressed={s.id === social.id}
                          aria-label={'Show ' + s.label}
                          onClick={() => onSelect(s.id)}
                        >
                          <AppIcon name={s.icon} size={18} />
                        </button>
                      ))}
                    </div>
                  </div>
                </m.div>
              </div>
            </div>
          </m.div>
        </m.div>
      )}
    </AnimatePresence>
  )
}
