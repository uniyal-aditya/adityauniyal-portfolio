import { useEffect } from 'react'

/**
 * Observes [data-reveal] elements inside the given root and adds .in when they
 * enter the viewport - the React port of the legacy .reveal IntersectionObserver.
 * Respects prefers-reduced-motion by revealing immediately.
 */
export function useReveal(rootSelector = 'main') {
  useEffect(() => {
    const root = document.querySelector(rootSelector) ?? document
    const els = Array.from(root.querySelectorAll<HTMLElement>('[data-reveal]:not(.in)'))
    if (!els.length) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      els.forEach((el) => el.classList.add('in'))
      return
    }
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('in')
            obs.unobserve(e.target)
          }
        })
      },
      { threshold: 0.1, rootMargin: '0px 0px -48px 0px' },
    )
    els.forEach((el) => obs.observe(el))
    return () => obs.disconnect()
  })
}
