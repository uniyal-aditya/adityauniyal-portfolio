import type { CSSProperties, MouseEvent, ReactNode } from 'react'
import { getSocial, type Social } from '@/data/socials'
import { useSocialModal } from '@/hooks/useSocialModal'

interface Props {
  id: Social['id']
  children: ReactNode
  className?: string
  style?: CSSProperties
  /** Runs just before the popup opens (e.g. close another modal first). */
  onOpen?: () => void
}

/**
 * A real <a href> to the profile — so it still works with middle-click,
 * Ctrl/Cmd-click, "open in new tab", crawlers and no-JS. A plain left click is
 * intercepted and opens the in-site profile popup instead of leaving the page.
 */
export function SocialLink({ id, children, className, style, onOpen }: Props) {
  const social = getSocial(id)
  const { open } = useSocialModal()

  const onClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    e.preventDefault()
    onOpen?.()
    open(id)
  }

  return (
    <a
      href={social.url}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      style={style}
      onClick={onClick}
      aria-haspopup="dialog"
    >
      {children}
    </a>
  )
}
