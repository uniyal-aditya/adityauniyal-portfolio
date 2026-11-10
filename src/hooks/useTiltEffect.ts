import { useEffect } from 'react'
import { useReducedMotion } from '@/hooks/useReducedMotion'

/** Cards that get the 3D tilt + moving glare (styles live in fx.css). */
const TILT_SELECTOR = '.proj-card, .post-card, .project-featured-card, .gal-tile'

/**
 * One delegated pointer listener for the whole site — no per-card handlers and
 * no component changes. Mouse only (touch devices and reduced-motion users are
 * skipped), throttled to one update per animation frame.
 */
export function useTiltEffect() {
  const reduced = useReducedMotion()

  useEffect(() => {
    if (reduced) return
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return

    let current: HTMLElement | null = null
    let raf = 0

    const release = () => {
      cancelAnimationFrame(raf)
      if (!current) return
      current.classList.remove('tilt-on')
      for (const v of ['--rx', '--ry', '--mx', '--my']) current.style.removeProperty(v)
      current = null
    }

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return
      const hit = (e.target as Element | null)?.closest?.(TILT_SELECTOR) as HTMLElement | null
      if (hit !== current) {
        release()
        current = hit
        current?.classList.add('tilt-on')
      }
      const el = current
      if (!el) return
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect()
        const px = (e.clientX - r.left) / r.width - 0.5
        const py = (e.clientY - r.top) / r.height - 0.5
        // Big cards tilt less so they never feel wobbly.
        const k = Math.min(1, 420 / r.width)
        el.style.setProperty('--rx', (-py * 8 * k).toFixed(2) + 'deg')
        el.style.setProperty('--ry', (px * 10 * k).toFixed(2) + 'deg')
        el.style.setProperty('--mx', ((px + 0.5) * 100).toFixed(1) + '%')
        el.style.setProperty('--my', ((py + 0.5) * 100).toFixed(1) + '%')
      })
    }

    document.addEventListener('pointermove', onMove, { passive: true })
    document.addEventListener('mouseleave', release)
    window.addEventListener('blur', release)
    return () => {
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('mouseleave', release)
      window.removeEventListener('blur', release)
      release()
    }
  }, [reduced])
}
