import { useEffect } from 'react'

// Canonical site origin. Override per-environment with VITE_SITE_URL;
// defaults to the production subdomain.
const SITE = import.meta.env.VITE_SITE_URL || 'https://adityauniyal.is-a.dev'

/** Site-wide default share card (the flagship terminal art, 1200x630 PNG). */
const DEFAULT_OG_IMAGE = SITE + '/covers/flagship.png'

/** Crawlers need absolute URLs for og:image — resolve relative paths against SITE. */
function absoluteImage(img?: string | null): string {
  if (!img) return DEFAULT_OG_IMAGE
  let p = img
  // Bundled SVG covers ship with 1200x630 PNG twins: most link-preview
  // crawlers cannot rasterize SVG, so feed them the PNG for share cards.
  if (p.startsWith('/covers/') && p.endsWith('.svg')) p = p.slice(0, -4) + '.png'
  if (/^https?:\/\//i.test(p)) return p
  return SITE + (p.startsWith('/') ? p : '/' + p)
}

interface SeoProps {
  title: string
  description?: string
  path?: string
  image?: string | null
  type?: 'website' | 'article'
  jsonLd?: Record<string, unknown> | null
  noindex?: boolean
}

function upsertMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function upsertCanonical(href: string) {
  let el = document.head.querySelector('link[rel="canonical"]')
  if (!el) {
    el = document.createElement('link')
    el.setAttribute('rel', 'canonical')
    document.head.appendChild(el)
  }
  el.setAttribute('href', href)
}

/** Per-route metadata: title, description, canonical, Open Graph, JSON-LD. */
export function Seo({ title, description, path = '/', image, type = 'website', jsonLd, noindex }: SeoProps) {
  const url = SITE + path
  const img = absoluteImage(image)
  const desc =
    description ||
    'Aditya Uniyal - developer building scalable systems, Discord bots, and interactive web platforms.'
  const jsonLdKey = jsonLd ? JSON.stringify(jsonLd) : ''

  useEffect(() => {
    document.title = title
    upsertMeta('name', 'description', desc)
    upsertCanonical(url)

    if (noindex) upsertMeta('name', 'robots', 'noindex, nofollow')
    else document.head.querySelector('meta[name="robots"]')?.remove()

    upsertMeta('property', 'og:title', title)
    upsertMeta('property', 'og:description', desc)
    upsertMeta('property', 'og:url', url)
    upsertMeta('property', 'og:type', type)
    upsertMeta('property', 'og:site_name', 'Aditya Uniyal')
    upsertMeta('property', 'og:image', img)
    upsertMeta('property', 'og:image:alt', title)
    if (img.endsWith('.png') || img.endsWith('.jpg') || img.endsWith('.jpeg') || img.endsWith('.webp')) {
      upsertMeta('property', 'og:image:width', '1200')
      upsertMeta('property', 'og:image:height', '630')
    }

    upsertMeta('name', 'twitter:card', 'summary_large_image')
    upsertMeta('name', 'twitter:title', title)
    upsertMeta('name', 'twitter:description', desc)
    upsertMeta('name', 'twitter:image', img)

    const JSONLD_ID = 'au-route-jsonld'
    document.getElementById(JSONLD_ID)?.remove()
    if (jsonLdKey) {
      const s = document.createElement('script')
      s.type = 'application/ld+json'
      s.id = JSONLD_ID
      s.textContent = jsonLdKey
      document.head.appendChild(s)
    }
  }, [title, desc, url, img, type, noindex, jsonLdKey])

  return null
}

export function articleJsonLd(opts: {
  title: string
  description: string
  path: string
  image?: string | null
  authorName: string
  authorUrl: string
  publishedIso: string | null
  modifiedIso: string | null
}): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: opts.title,
    description: opts.description,
    url: SITE + opts.path,
    image: absoluteImage(opts.image),
    author: { '@type': 'Person', name: opts.authorName, url: opts.authorUrl },
    datePublished: opts.publishedIso || undefined,
    dateModified: opts.modifiedIso || opts.publishedIso || undefined,
    publisher: { '@type': 'Person', name: 'Aditya Uniyal' },
    mainEntityOfPage: SITE + opts.path,
  }
}
