import { Helmet } from 'react-helmet-async'

const SITE = 'https://adityauniyal.is-a.dev'

interface SeoProps {
  title: string
  description?: string
  path?: string
  image?: string | null
  type?: 'website' | 'article'
  jsonLd?: Record<string, unknown> | null
  noindex?: boolean
}

/** Per-route metadata: title, description, canonical, Open Graph, JSON-LD. */
export function Seo({ title, description, path = '/', image, type = 'website', jsonLd, noindex }: SeoProps) {
  const url = SITE + path
  const desc = description || 'Aditya Uniyal - developer building scalable systems, Discord bots, and interactive web platforms.'
  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={desc} />
      <link rel="canonical" href={url} />
      {noindex && <meta name="robots" content="noindex, nofollow" />}
      <meta property="og:title" content={title} />
      <meta property="og:description" content={desc} />
      <meta property="og:url" content={url} />
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content="Aditya Uniyal" />
      {image && <meta property="og:image" content={image} />}
      <meta name="twitter:card" content={image ? 'summary_large_image' : 'summary'} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={desc} />
      {jsonLd && <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>}
    </Helmet>
  )
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
    image: opts.image || undefined,
    author: { '@type': 'Person', name: opts.authorName, url: opts.authorUrl },
    datePublished: opts.publishedIso || undefined,
    dateModified: opts.modifiedIso || opts.publishedIso || undefined,
    publisher: { '@type': 'Person', name: 'Aditya Uniyal' },
    mainEntityOfPage: SITE + opts.path,
  }
}
