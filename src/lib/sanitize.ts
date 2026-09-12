/** Validation + sanitization helpers shared by the editor, embeds and renderers. */

/** http(s) URL only; blocks javascript:, data:, vbscript: etc. Returns null when invalid. */
export function safeUrl(raw: string | null | undefined): string | null {
  if (!raw) return null
  const s = String(raw).trim()
  if (!s) return null
  try {
    const u = new URL(s, window.location.origin)
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null
    return u.toString()
  } catch {
    return null
  }
}

/** Extract a YouTube video id from watch/youtu.be/shorts/embed URLs. */
export function youtubeId(raw: string): string | null {
  try {
    const u = new URL(raw)
    if (u.hostname === 'youtu.be') return u.pathname.slice(1) || null
    if (u.hostname.includes('youtube.com')) {
      if (u.pathname.startsWith('/watch')) return u.searchParams.get('v')
      const m = u.pathname.match(/^\/(?:shorts|embed)\/([\w-]{6,})/)
      if (m) return m[1]
    }
    return null
  } catch {
    return null
  }
}

/** Very light HTML-to-text used for excerpts when none is written. */
export function htmlToText(html: string): string {
  const el = document.createElement('div')
  el.innerHTML = html
  return (el.textContent || '').replace(/\s+/g, ' ').trim()
}

/** Markdown-ish to text for excerpts/TOC sourcing of legacy content. */
export function mdToText(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/[*_>]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Words/200, minimum 1 — matches the editor's live counter and SQL defaults. */
export function readingTime(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.round(words / 200))
}

/** Title to URL slug. */
export function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

export function fmtNum(n: number | null | undefined): string {
  const v = Number(n) || 0
  if (v >= 1e6) return (v / 1e6).toFixed(1).replace(/\.0$/, '') + 'M'
  if (v >= 1e3) return (v / 1e3).toFixed(1).replace(/\.0$/, '') + 'K'
  return String(v)
}

export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return '—'
  const s = Math.max(1, (Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return Math.floor(s / 60) + 'm ago'
  if (s < 86400) return Math.floor(s / 3600) + 'h ago'
  if (s < 604800) return Math.floor(s / 86400) + 'd ago'
  return fmtDate(iso)
}
