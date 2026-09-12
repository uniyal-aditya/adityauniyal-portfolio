import { useEffect, useRef } from 'react'
import { useReducedMotion } from '@/hooks/useReducedMotion'

/** Dot cursor + trailing ring - faithful port of the legacy behavior. */
export function Cursor() {
  const dot = useRef<HTMLDivElement>(null)
  const ring = useRef<HTMLDivElement>(null)
  const reduced = useReducedMotion()

  useEffect(() => {
    if (reduced) return
    if (window.matchMedia('(max-width: 768px)').matches) return
    let mx = 0
    let my = 0
    let rx = 0
    let ry = 0
    let raf = 0

    const move = (e: MouseEvent) => {
      mx = e.clientX
      my = e.clientY
      if (dot.current) {
        dot.current.style.left = mx + 'px'
        dot.current.style.top = my + 'px'
      }
    }
    const loop = () => {
      rx += (mx - rx) * 0.14
      ry += (my - ry) * 0.14
      if (ring.current) {
        ring.current.style.left = rx + 'px'
        ring.current.style.top = ry + 'px'
      }
      raf = requestAnimationFrame(loop)
    }
    document.addEventListener('mousemove', move)
    raf = requestAnimationFrame(loop)
    return () => {
      document.removeEventListener('mousemove', move)
      cancelAnimationFrame(raf)
    }
  }, [reduced])

  if (reduced) return null

  return (
    <>
      <div className="cursor" ref={dot} aria-hidden="true" />
      <div className="cursor-ring" ref={ring} aria-hidden="true" />
    </>
  )
}

/** Fixed scanline strip. */
export function Scanline() {
  const reduced = useReducedMotion()
  if (reduced) return null
  return <div className="scanline" aria-hidden="true" />
}
