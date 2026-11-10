import { createContext, useContext } from 'react'
import type { Social } from '@/data/socials'

export interface SocialModalApi {
  open: (id: Social['id']) => void
  close: () => void
}

export const SocialModalContext = createContext<SocialModalApi | null>(null)

/** Open the in-site profile popup:  const { open } = useSocialModal();  open('github') */
export function useSocialModal() {
  const ctx = useContext(SocialModalContext)
  if (!ctx) throw new Error('useSocialModal must be used inside <SocialModalProvider>')
  return ctx
}
