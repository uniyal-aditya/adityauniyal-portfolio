import { useEffect } from 'react'

/**
 * Reveals `.reveal` elements (adds `.in`) as they enter the viewport - the
 * React port of the legacy IntersectionObserver.
 *
 * Elements that mount LATER (data-driven sections such as the Work page's
 * build journal or the Home series callout) are picked up too, via a
 * MutationObserver - otherwise they would stay at opacity 0 forever.
 * Respects prefers-reduced-motion by revealing immediately.
 */
export function useReveal(rootSelector = 'main') {
  useEffect(() => {
    const root: ParentNode = document.querySelector(rootSelector) ?? document.body
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const io = reduced
      ? null
      : new IntersectionObserver(
          (entries) => {
            entries.forEach((e) => {
              if (e.isIntersecting) {
                e.target.classList.add('in')
                io?.unobserve(e.target)
              }
            })
          },
          { threshold: 0.1, rootMargin: '0px 0px -48px 0px' },
        )

    const handle = (el: HTMLElement) => {
      if (el.classList.contains('in')) return
      if (!io) {
        el.classList.add('in')
        return
      }
      // Already on screen: reveal instantly with no transition so content never
      // depends on the animation clock (throttled tabs, suspended compositor).
      const r = el.getBoundingClientRect()
      if (r.top < window.innerHeight && r.bottom > 0) {
        el.style.transition = 'none'
        el.classList.add('in')
      } else {
        io.observe(el)
      }
    }

    const scan = (node: ParentNode) => {
      node.querySelectorAll<HTMLElement>('.reveal:not(.in)').forEach(handle)
    }

    scan(root)

    const mo = new MutationObserver((mutations) => {
      for (const m of mutations) {
        m.addedNodes.forEach((n) => {
          if (!(n instanceof HTMLElement)) return
          if (n.matches('.reveal')) handle(n)
          scan(n)
        })
      }
    })
    mo.observe(root as Node, { childList: true, subtree: true })

    return () => {
      io?.disconnect()
      mo.disconnect()
    }
  }, [rootSelector])
}
