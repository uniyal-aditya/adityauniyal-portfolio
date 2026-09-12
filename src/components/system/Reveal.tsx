import type { CSSProperties, ReactNode } from 'react'
import { useReveal } from '@/hooks/useReveal'

/**
 * Scroll reveal wrapper mapping to the legacy .reveal classes.
 * delay: 0-4 selects d1..d4 transition-delay classes.
 */
export function Reveal({
  children,
  delay = 0,
  className = '',
  style,
}: {
  children: ReactNode
  delay?: 0 | 1 | 2 | 3 | 4
  className?: string
  style?: CSSProperties
}) {
  useReveal()
  const d = delay ? ` d${delay}` : ''
  return (
    <div data-reveal className={`reveal${d} ${className}`} style={style}>
      {children}
    </div>
  )
}
