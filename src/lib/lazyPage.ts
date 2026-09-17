import { lazy, type ComponentType } from 'react'

/**
 * lazy() wrapper that survives deploys.
 *
 * Problem: after a new deploy, an already-open tab may request the *old*
 * hashed chunk (swr-cached HTML / module graph) → 404 → the dynamic
 * import rejects. A bare lazy() would then crash the tree (blank page)
 * or hang Suspense forever.
 *
 * Fix: on import failure, retry the import once after a short delay;
 * if it still fails (almost always "chunk renamed by a deploy"), hard-
 * reload the page once. The reload fetches the new index.html, which
 * references the new chunks — the user lands on the same route on the
 * fresh deploy. The once-guard prevents reload loops if the site is
 * genuinely broken.
 */
const RELOAD_KEY = 'au_chunk_reload'

function failedImport(error: unknown): Promise<never> {
  // Retry once first — transient network blips shouldn't reload.
  return new Promise((_, reject) => {
    setTimeout(() => reject(error), 1200)
  })
}

type PageModule = { default: ComponentType<unknown> }

export function lazyPage(load: () => Promise<PageModule>) {
  let didReload = false
  return lazy(() =>
    load().catch(async (error) => {
      // Second chance before any reload.
      await failedImport(error).catch(() => undefined)
      if (didReload) throw error
      didReload = true
      try {
        if (sessionStorage.getItem(RELOAD_KEY) !== '1') {
          sessionStorage.setItem(RELOAD_KEY, '1')
          window.location.reload()
          return new Promise<never>(() => {}) // page is unloading
        }
      } catch {
        // sessionStorage unavailable (privacy mode): fall through to throw
      }
      throw error
    }),
  )
}

// Cleared on every successful load so a LATER deploy gets its own
// one-shot reload instead of being swallowed by an old flag.
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    try {
      sessionStorage.removeItem(RELOAD_KEY)
    } catch {
      /* ignore */
    }
  })
}
