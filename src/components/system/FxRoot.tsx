import { useTiltEffect } from '@/hooks/useTiltEffect'

/** Mount once: turns on the site-wide pointer effects (3D card tilt). */
export function FxRoot() {
  useTiltEffect()
  return null
}
