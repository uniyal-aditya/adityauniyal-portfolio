import { useEffect, useRef } from 'react'
import { useReducedMotion } from '@/hooks/useReducedMotion'

/**
 * Self-made seasonal ambience — no third-party library.
 *
 * A single fixed <canvas> draws light, low-opacity particles that follow the
 * (Indian) season of the visitor's calendar month:
 *   winter  (Dec–Feb)  slow drifting frost / snow
 *   spring  (Mar–Apr)  falling petals
 *   summer  (May–Jun)  rising embers / fireflies
 *   monsoon (Jul–Sep)  rain streaks
 *   autumn  (Oct–Nov)  tumbling leaves
 *
 * Safe by design: pointer-events none, aria-hidden, disabled for
 * prefers-reduced-motion, paused while the tab is hidden, DPR capped, and
 * particle count scaled to the viewport.
 *
 * Turn off:  set VITE_SEASONAL_FX=off  (or remove <SeasonalEffect /> in Chrome.tsx).
 * Preview:   append ?season=winter|spring|summer|monsoon|autumn to any URL.
 */
export type Season = 'winter' | 'spring' | 'summer' | 'monsoon' | 'autumn'

const SEASONS: Season[] = ['winter', 'spring', 'summer', 'monsoon', 'autumn']

function seasonForMonth(month: number): Season {
  if (month === 11 || month <= 1) return 'winter'
  if (month <= 3) return 'spring'
  if (month <= 5) return 'summer'
  if (month <= 8) return 'monsoon'
  return 'autumn'
}

function resolveSeason(): Season {
  try {
    const q = new URLSearchParams(window.location.search).get('season')
    if (q && (SEASONS as string[]).includes(q)) return q as Season
  } catch {
    /* ignore */
  }
  return seasonForMonth(new Date().getMonth())
}

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  r: number
  rot: number
  vr: number
  phase: number
  hue: string
  a: number
}

const PALETTE: Record<Season, string[]> = {
  winter: ['240,237,230', '200,225,255'],
  spring: ['255,183,197', '240,237,230', '200,241,53'],
  summer: ['200,241,53', '255,200,90'],
  monsoon: ['150,185,220'],
  autumn: ['232,89,58', '230,160,60', '190,120,40'],
}

const DENSITY: Record<Season, number> = { winter: 70, spring: 40, summer: 45, monsoon: 90, autumn: 38 }

function spawn(season: Season, w: number, h: number, initial: boolean): Particle {
  const pal = PALETTE[season]
  const hue = pal[Math.floor(Math.random() * pal.length)]
  const p: Particle = {
    x: Math.random() * w,
    y: initial ? Math.random() * h : -20,
    vx: 0,
    vy: 0,
    r: 2,
    rot: Math.random() * Math.PI * 2,
    vr: (Math.random() - 0.5) * 0.03,
    phase: Math.random() * Math.PI * 2,
    hue,
    a: 0.5,
  }
  switch (season) {
    case 'winter':
      p.r = 1 + Math.random() * 2.2
      p.vy = 0.25 + Math.random() * 0.55
      p.vx = (Math.random() - 0.5) * 0.2
      p.a = 0.25 + Math.random() * 0.4
      break
    case 'spring':
      p.r = 3 + Math.random() * 3
      p.vy = 0.45 + Math.random() * 0.6
      p.vx = 0.15 + Math.random() * 0.4
      p.a = 0.35 + Math.random() * 0.35
      break
    case 'summer':
      p.y = initial ? Math.random() * h : h + 20
      p.r = 1 + Math.random() * 1.8
      p.vy = -(0.2 + Math.random() * 0.5)
      p.vx = (Math.random() - 0.5) * 0.3
      p.a = 0.2 + Math.random() * 0.5
      break
    case 'monsoon':
      p.r = 10 + Math.random() * 14 // streak length
      p.vy = 9 + Math.random() * 7
      p.vx = -1.6
      p.a = 0.12 + Math.random() * 0.2
      break
    case 'autumn':
      p.r = 4 + Math.random() * 4
      p.vy = 0.6 + Math.random() * 0.9
      p.vx = (Math.random() - 0.3) * 0.6
      p.vr = (Math.random() - 0.5) * 0.06
      p.a = 0.4 + Math.random() * 0.35
      break
  }
  return p
}

function draw(ctx: CanvasRenderingContext2D, season: Season, p: Particle, t: number) {
  ctx.fillStyle = `rgba(${p.hue},${p.a})`
  ctx.strokeStyle = `rgba(${p.hue},${p.a})`
  switch (season) {
    case 'winter':
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
      ctx.fill()
      break
    case 'summer': {
      const tw = 0.5 + 0.5 * Math.sin(t * 0.002 + p.phase)
      ctx.fillStyle = `rgba(${p.hue},${p.a * tw})`
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
      ctx.fill()
      break
    }
    case 'monsoon':
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(p.x, p.y)
      ctx.lineTo(p.x + p.vx * 1.4, p.y - p.r)
      ctx.stroke()
      break
    case 'spring':
    case 'autumn': {
      ctx.save()
      ctx.translate(p.x, p.y)
      ctx.rotate(p.rot)
      ctx.beginPath()
      ctx.ellipse(0, 0, p.r, p.r * (season === 'spring' ? 0.55 : 0.4), 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
      break
    }
  }
}

export function SeasonalEffect() {
  const ref = useRef<HTMLCanvasElement>(null)
  const reduced = useReducedMotion()
  const disabled = import.meta.env.VITE_SEASONAL_FX === 'off'

  useEffect(() => {
    if (reduced || disabled) return
    const canvas = ref.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    const season = resolveSeason()
    let w = 0
    let h = 0
    let particles: Particle[] = []
    let raf = 0
    let running = true

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
      w = window.innerWidth
      h = window.innerHeight
      canvas.width = Math.floor(w * dpr)
      canvas.height = Math.floor(h * dpr)
      canvas.style.width = w + 'px'
      canvas.style.height = h + 'px'
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      const scale = w < 768 ? 0.5 : Math.min(1, w / 1400 + 0.3)
      const count = Math.round(DENSITY[season] * scale)
      particles = Array.from({ length: count }, () => spawn(season, w, h, true))
    }

    const frame = (t: number) => {
      if (!running) return
      ctx.clearRect(0, 0, w, h)
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i]
        p.x += p.vx + (season === 'winter' || season === 'spring' || season === 'autumn' ? Math.sin(t * 0.001 + p.phase) * 0.35 : 0)
        p.y += p.vy
        p.rot += p.vr
        const out = p.y > h + 24 || p.y < -30 || p.x > w + 30 || p.x < -30
        if (out) particles[i] = spawn(season, w, h, false)
        else draw(ctx, season, p, t)
      }
      raf = requestAnimationFrame(frame)
    }

    const onVisibility = () => {
      if (document.hidden) {
        running = false
        cancelAnimationFrame(raf)
      } else if (!running) {
        running = true
        raf = requestAnimationFrame(frame)
      }
    }

    resize()
    raf = requestAnimationFrame(frame)
    window.addEventListener('resize', resize)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      running = false
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [reduced, disabled])

  if (reduced || disabled) return null
  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      style={{ position: 'fixed', inset: 0, zIndex: 9988, pointerEvents: 'none' }}
    />
  )
}
