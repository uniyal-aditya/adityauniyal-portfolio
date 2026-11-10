import type { GalleryItem } from '@/data/gallery'
import type { GalleryRow } from '@/lib/types'

/*
 * Pure gallery rules: no Supabase, no React. Kept separate so they can be unit
 * tested (src/lib/gallery-rules.test.ts) and checked against the SQL migration.
 */

/** Mirrors the CHECK constraints in supabase/18-gallery.sql. */
export const GALLERY_LIMITS = { title: 120, caption: 400, alt: 300 } as const

export interface GalleryInput {
  title: string
  caption: string
  alt_text: string
  tag: string
  /** YYYY-MM-DD or empty. */
  taken_on: string
  is_published: boolean
}

const niceDate = (iso: string) =>
  new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

/** Database row -> the shape the Gallery page and lightbox render. */
export function rowToItem(r: GalleryRow): GalleryItem {
  const parts = [r.caption, r.taken_on ? niceDate(r.taken_on) : null].filter((x): x is string => !!x)
  return {
    id: 'db-' + r.id,
    src: r.image_url,
    alt: r.alt_text || r.title,
    title: r.title,
    caption: parts.length ? parts.join(' · ') : undefined,
    tag: r.tag,
    width: r.width,
    height: r.height,
  }
}

/** Returns a human-readable problem, or null when the input is fine. */
export function validateGalleryInput(i: GalleryInput): string | null {
  if (!i.title.trim()) return 'Give the image a title.'
  if (i.title.trim().length > GALLERY_LIMITS.title) return `Title must be ${GALLERY_LIMITS.title} characters or fewer.`
  if (i.caption.trim().length > GALLERY_LIMITS.caption) return `Caption must be ${GALLERY_LIMITS.caption} characters or fewer.`
  if (i.alt_text.trim().length > GALLERY_LIMITS.alt) return `Alt text must be ${GALLERY_LIMITS.alt} characters or fewer.`
  if (!i.tag.trim()) return 'Pick a tag.'
  if (i.taken_on && !/^\d{4}-\d{2}-\d{2}$/.test(i.taken_on)) return 'Date must look like 2026-10-10.'
  return null
}

export const clean = (i: GalleryInput) => ({
  title: i.title.trim(),
  caption: i.caption.trim() || null,
  alt_text: i.alt_text.trim() || null,
  tag: i.tag.trim(),
  taken_on: i.taken_on || null,
  is_published: i.is_published,
})
