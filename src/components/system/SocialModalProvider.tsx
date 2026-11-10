import { lazy, Suspense, useCallback, useMemo, useRef, useState, type ReactNode } from 'react'
import type { Social } from '@/data/socials'
import { SocialModalContext } from '@/hooks/useSocialModal'

// The popup (icons, 3D card, GitHub stats) is only downloaded the first time
// someone opens it — it never touches the initial page load.
const SocialModal = lazy(() => import('@/components/system/SocialModal'))

/** Mount once near the app root. Pages open the popup via `useSocialModal()`. */
export function SocialModalProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState<Social['id'] | null>(null)
  const [loaded, setLoaded] = useState(false)
  const opener = useRef<HTMLElement | null>(null)

  const open = useCallback((id: Social['id']) => {
    if (!opener.current) opener.current = document.activeElement as HTMLElement | null
    setLoaded(true)
    setActive(id)
  }, [])

  const close = useCallback(() => {
    setActive(null)
    // Hand focus back to whatever opened the popup (keyboard users).
    const el = opener.current
    opener.current = null
    if (el && document.contains(el)) requestAnimationFrame(() => el.focus?.())
  }, [])

  const value = useMemo(() => ({ open, close }), [open, close])

  return (
    <SocialModalContext.Provider value={value}>
      {children}
      {loaded && (
        <Suspense fallback={null}>
          <SocialModal activeId={active} onSelect={setActive} onClose={close} />
        </Suspense>
      )}
    </SocialModalContext.Provider>
  )
}
