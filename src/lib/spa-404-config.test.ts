import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/**
 * SPA 404 config agreement: src/App.tsx ⇄ vercel.json ⇄ netlify.toml.
 *
 * Real HTTP 404s for unknown URLs only work because the hosts have an
 * EXPLICIT rewrite/redirect for every SPA route and no catch-all: a path
 * matching nothing falls through to the hosts' native 404 handling, which
 * serves dist/404.html with a 404 status. That means the route table is
 * duplicated from App.tsx into both host configs, and silent drift would
 * ship real 404s for perfectly valid pages (or, worse, someone would
 * "fix" it by re-adding a catch-all, silently reverting to 200-everything).
 *
 * This test parses the ACTUAL route declarations out of App.tsx and the
 * ACTUAL rewrite/redirect tables out of both host configs, so adding a
 * route without updating vercel.json + netlify.toml — or adding a route
 * to a config that doesn't exist in the router — fails here instead of
 * in production.
 */
const APP_PATH = new URL('../App.tsx', import.meta.url)
const VERCEL_PATH = new URL('../../vercel.json', import.meta.url)
const NETLIFY_PATH = new URL('../../netlify.toml', import.meta.url)
const NOT_FOUND_HTML_PATH = new URL('../../public/404.html', import.meta.url)

const appSource = readFileSync(APP_PATH, 'utf8')
const vercelJson = JSON.parse(readFileSync(VERCEL_PATH, 'utf8')) as { rewrites: { source: string; destination: string }[] }
const netlifyToml = readFileSync(NETLIFY_PATH, 'utf8')
const notFoundHtml = readFileSync(NOT_FOUND_HTML_PATH, 'utf8')

/** Every declared route path in the router — `/work`, `/blog/post/:slug`, … — with the `*` client catch-all excluded. */
const routerPaths = [...appSource.matchAll(/path="([^"]+)"/g)].map((m) => m[1]).filter((p) => p !== '*')

/** `/blog/post/:slug` → `/blog/post/*` (Netlify splat syntax). */
const toNetlifyFrom = (routePath: string) => routePath.replace(/:[A-Za-z]+/g, '*')

type NetlifyRule = { from: string; to: string; status: number }
const netlifyRules: NetlifyRule[] = [...netlifyToml.matchAll(/from = "([^"]+)"\s*\n\s*to = "([^"]+)"\s*\n\s*status = (\d+)/g)].map((m) => ({
  from: m[1],
  to: m[2],
  status: Number(m[3]),
}))

describe('SPA 404 config agreement (App.tsx ⇄ vercel.json ⇄ netlify.toml)', () => {
  it('the router declares the routes this test guards', () => {
    // Tripwire for the extractor itself: if App.tsx ever moves its route
    // table somewhere this regex can't see, fail loudly instead of guarding
    // an empty list.
    expect(routerPaths.length).toBeGreaterThanOrEqual(25)
    expect(routerPaths).toContain('/')
    expect(routerPaths).toContain('/blog/post/:slug')
  })

  it('vercel.json rewrites cover every router route (and nothing else)', () => {
    const sources = vercelJson.rewrites.map((r) => r.source)
    const spaSources = vercelJson.rewrites.filter((r) => r.destination === '/index.html').map((r) => r.source)

    for (const route of routerPaths) {
      expect(spaSources, `vercel.json is missing a rewrite for the route "${route}" — add { "source": "${route}", "destination": "/index.html" }`).toContain(route)
    }
    // Bidirectional: a typo'd or stale rewrite for a non-existent route is
    // how a valid page starts 404ing (or an invalid one starts 200ing).
    expect(spaSources.sort()).toEqual([...routerPaths].sort())

    // The function rewrites must survive the enumeration.
    expect(sources).toContain('/blog/sitemap.xml')
    expect(sources).toContain('/blog/rss.xml')
  })

  it('netlify.toml redirects cover every router route (and nothing else)', () => {
    const spaRules = netlifyRules.filter((r) => r.to === '/index.html')
    const froms = spaRules.map((r) => r.from)

    for (const route of routerPaths) {
      expect(froms, `netlify.toml is missing a redirect for the route "${route}" — add from = "${toNetlifyFrom(route)}"`).toContain(toNetlifyFrom(route))
    }
    expect(froms.sort()).toEqual(routerPaths.map(toNetlifyFrom).sort())
    expect(spaRules.every((r) => r.status === 200)).toBe(true)

    // The function redirects must survive the enumeration.
    expect(netlifyRules.some((r) => r.to === '/.netlify/functions/journalSitemap' && r.from === '/blog/sitemap.xml')).toBe(true)
    expect(netlifyRules.some((r) => r.to === '/.netlify/functions/journalRss' && r.from === '/blog/rss.xml')).toBe(true)
    expect(netlifyRules.some((r) => r.from === '/sendFeedback')).toBe(true)
  })

  it('neither host config contains a catch-all that would 200 every unknown URL', () => {
    for (const r of vercelJson.rewrites) {
      expect(r.source, `vercel.json rewrite "${r.source}" is a catch-all and defeats the real-404 setup`).not.toMatch(/\(\.\*\)/)
    }
    for (const r of netlifyRules) {
      expect(r.from, `netlify.toml redirect "${r.from}" is a catch-all and defeats the real-404 setup`).not.toBe('/*')
    }
  })

  it('dist 404.html exists and is noindexed', () => {
    expect(notFoundHtml).toMatch(/<meta name="robots" content="noindex"/)
    expect(notFoundHtml).toMatch(/href="\/"/)
  })
})
