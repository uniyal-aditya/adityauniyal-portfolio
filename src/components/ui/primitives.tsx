import { useRef, type ReactNode, type MouseEvent } from 'react'
import { Link } from 'react-router-dom'
import { useReducedMotion } from '@/hooks/useReducedMotion'

/** Lime primary button. href -> Link, else button. */
export function BtnLime({
  children,
  href,
  onClick,
  type = 'button',
  disabled,
  className = '',
  small,
}: {
  children: ReactNode
  href?: string
  onClick?: () => void
  type?: 'button' | 'submit'
  disabled?: boolean
  className?: string
  small?: boolean
}) {
  const cls = `btn-lime${small ? ' btn-small' : ''} ${className}`.trim()
  if (href) {
    return (
      <Link to={href} className={cls}>
        {children}
      </Link>
    )
  }
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={cls} style={disabled ? { opacity: 0.5 } : undefined}>
      {children}
    </button>
  )
}

/** Ghost bordered button. href -> Link, else button. */
export function BtnGhost({
  children,
  href,
  onClick,
  type = 'button',
  disabled,
  className = '',
  small,
}: {
  children: ReactNode
  href?: string
  onClick?: () => void
  type?: 'button' | 'submit'
  disabled?: boolean
  className?: string
  small?: boolean
}) {
  const cls = `btn-ghost-line${small ? ' btn-small' : ''} ${className}`.trim()
  if (href) {
    return (
      <Link to={href} className={cls}>
        {children}
      </Link>
    )
  }
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={cls} style={disabled ? { opacity: 0.5 } : undefined}>
      {children}
    </button>
  )
}

/** Underlined text link with lime hover. */
export function TextLink({ children, href, external }: { children: ReactNode; href: string; external?: boolean }) {
  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className="text-link">
        {children}
      </a>
    )
  }
  return (
    <Link to={href} className="text-link">
      {children}
    </Link>
  )
}

/**
 * Magnetic button - content drifts toward the pointer within a small radius.
 * Disabled on touch and reduced-motion.
 */
export function Magnetic({ children, strength = 0.3 }: { children: ReactNode; strength?: number }) {
  const ref = useRef<HTMLSpanElement>(null)
  const reduced = useReducedMotion()

  function onMove(e: MouseEvent<HTMLSpanElement>) {
    if (reduced || !ref.current) return
    const r = ref.current.getBoundingClientRect()
    const x = (e.clientX - (r.left + r.width / 2)) * strength
    const y = (e.clientY - (r.top + r.height / 2)) * strength
    ref.current.style.transform = `translate(${x}px, ${y}px)`
  }
  function onLeave() {
    if (!ref.current) return
    ref.current.style.transform = 'translate(0px, 0px)'
  }

  return (
    <span onMouseMove={onMove} onMouseLeave={onLeave} style={{ display: 'inline-flex' }}>
      <span ref={ref} style={{ display: 'inline-flex', transition: 'transform .25s cubic-bezier(.16,1,.3,1)' }}>
        {children}
      </span>
    </span>
  )
}

/**
 * Pointer-tilt card with subtle travel + glare. Max 6deg - restrained.
 * Disabled on touch and reduced-motion.
 */
export function Tilt({ children, max = 6 }: { children: ReactNode; max?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const reduced = useReducedMotion()

  function onMove(e: MouseEvent<HTMLDivElement>) {
    if (reduced || !ref.current) return
    const r = ref.current.getBoundingClientRect()
    const px = (e.clientX - r.left) / r.width
    const py = (e.clientY - r.top) / r.height
    const rx = (0.5 - py) * max
    const ry = (px - 0.5) * max
    ref.current.style.transform = `perspective(900px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg)`
    ref.current.style.setProperty('--mx', `${(px * 100).toFixed(1)}%`)
    ref.current.style.setProperty('--my', `${(py * 100).toFixed(1)}%`)
  }
  function onLeave() {
    if (!ref.current) return
    ref.current.style.transform = 'perspective(900px) rotateX(0deg) rotateY(0deg)'
  }

  return (
    <div ref={ref} onMouseMove={onMove} onMouseLeave={onLeave} className="au-tilt">
      {children}
    </div>
  )
}
