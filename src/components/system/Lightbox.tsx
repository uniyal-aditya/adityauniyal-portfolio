import { useEffect, useRef, type KeyboardEvent } from 'react'
import { AnimatePresence, m } from 'framer-motion'
import { AppIcon } from '@/components/icons/AppIcon'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import type { GalleryItem } from '@/data/gallery'

interface Props {
  items: GalleryItem[]
  /** Index into `items`, or null when closed. */
  index: number | null
  onIndex: (i: number) => void
  onClose: () => void
}

/**
 * Full-screen image viewer: Esc closes, ← / → move, focus stays inside,
 * the page behind stops scrolling and focus returns to the clicked tile.
 */
export function Lightbox({ items, index, onIndex, onClose }: Props) {
  const reduced = useReducedMotion()
  const open = index !== null
  const item = index !== null ? items[index] : null
  const boxRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const opener = useRef<HTMLElement | null>(null)
  const count = items.length

  const go = (delta: number) => {
    if (index === null || count < 2) return
    onIndex((index + delta + count) % count)
  }

  useEffect(() => {
    if (!open) return
    opener.current = document.activeElement as HTMLElement | null
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const t = window.setTimeout(() => closeRef.current?.focus(), 50)
    return () => {
      window.clearTimeout(t)
      document.body.style.overflow = prev
      const el = opener.current
      if (el && document.contains(el)) el.focus?.()
    }
  }, [open])

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.stopPropagation()
      onClose()
    } else if (e.key === 'ArrowRight') go(1)
    else if (e.key === 'ArrowLeft') go(-1)
    else if (e.key === 'Tab') {
      const nodes = boxRef.current?.querySelectorAll<HTMLElement>('a[href], button:not([disabled])')
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
  }

  return (
    <AnimatePresence>
      {item && (
        <m.div
          key="lb"
          className="lb-bg"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose()
          }}
        >
          <div
            ref={boxRef}
            className="lb-box"
            role="dialog"
            aria-modal="true"
            aria-label={item.title}
            onKeyDown={onKeyDown}
          >
            <m.figure
              key={item.id}
              className="lb-fig"
              initial={reduced ? false : { opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.25 }}
            >
              <img className="lb-img" src={item.src} alt={item.alt} width={item.width} height={item.height} />
              <figcaption className="lb-cap">
                <strong>{item.title}</strong>
                {item.caption && <span>{item.caption}</span>}
              </figcaption>
            </m.figure>

            <div className="lb-bar">
              <span className="lb-count" aria-live="polite">
                {(index ?? 0) + 1} / {count}
              </span>
              <a className="lb-open" href={item.src} target="_blank" rel="noopener noreferrer">
                Open full size
                <AppIcon name="external" size={14} />
              </a>
            </div>

            <button ref={closeRef} type="button" className="lb-x" onClick={onClose} aria-label="Close image viewer">
              <AppIcon name="close" size={20} />
            </button>
            {count > 1 && (
              <>
                <button type="button" className="lb-nav prev" onClick={() => go(-1)} aria-label="Previous image">
                  <AppIcon name="arrowRight" size={22} className="lb-flip" />
                </button>
                <button type="button" className="lb-nav next" onClick={() => go(1)} aria-label="Next image">
                  <AppIcon name="arrowRight" size={22} />
                </button>
              </>
            )}
          </div>
        </m.div>
      )}
    </AnimatePresence>
  )
}
