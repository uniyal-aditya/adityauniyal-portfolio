import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { GALLERY, GALLERY_TAGS } from '../data/gallery'
import { GALLERY_LIMITS, rowToItem, validateGalleryInput, type GalleryInput } from './gallery-rules'
import type { GalleryRow } from './types'

/**
 * Gallery: SQL <-> TypeScript agreement + the pure rules.
 *
 * Migration 18 enforces limits with CHECK constraints and protects the table
 * with RLS; the admin form validates the same limits in TypeScript. If either
 * side drifts, an upload would pass the form and then fail in the database
 * (or the reverse). This test reads the ACTUAL migration file, so editing a
 * number or a policy there breaks the build instead of silently diverging.
 */
const sql = readFileSync(new URL('../../supabase/18-gallery.sql', import.meta.url), 'utf8')
const num = (re: RegExp) => Number(sql.match(re)?.[1])

const ok: GalleryInput = { title: 'Team photo', caption: '', alt_text: '', tag: 'Team', taken_on: '', is_published: true }

describe('gallery migration (supabase/18-gallery.sql)', () => {
  it('length limits in SQL match GALLERY_LIMITS in TypeScript', () => {
    expect(num(/char_length\(title\) between 1 and (\d+)/)).toBe(GALLERY_LIMITS.title)
    expect(num(/char_length\(caption\) <= (\d+)/)).toBe(GALLERY_LIMITS.caption)
    expect(num(/char_length\(alt_text\) <= (\d+)/)).toBe(GALLERY_LIMITS.alt)
  })

  it('row level security is on; public may read ONLY published rows', () => {
    expect(sql).toMatch(/alter table public\.gallery_items enable row level security/)
    expect(sql).toMatch(/create policy gallery_public_read on public\.gallery_items\s+for select using \(is_published\)/)
  })

  it('every write (and reading hidden rows) requires is_admin(), in both USING and WITH CHECK', () => {
    expect(sql).toMatch(
      /create policy gallery_admin_all on public\.gallery_items\s+for all using \(public\.is_admin\(\)\)\s+with check \(public\.is_admin\(\)\)/,
    )
  })

  it('has exactly two policies and nothing that opens writes to anonymous users', () => {
    expect((sql.match(/create policy/g) ?? []).length).toBe(2)
    expect(sql).not.toMatch(/\bto anon\b/i)
    expect(sql).not.toMatch(/using \(true\)/i)
    expect(sql).not.toMatch(/for (insert|update|delete) /i)
  })

  it('is safe to re-run (idempotent)', () => {
    expect(sql).toMatch(/create table if not exists public\.gallery_items/)
    expect(sql).toMatch(/drop policy if exists gallery_public_read/)
    expect(sql).toMatch(/drop policy if exists gallery_admin_all/)
    expect(sql).toMatch(/drop trigger if exists gallery_items_touch_updated/)
  })

  it('constrains the image URL to https and the size to sane bounds', () => {
    expect(sql).toMatch(/image_url\s+text not null check \(image_url ~\* '\^https:\/\/'\)/)
    expect(sql).toMatch(/width\s+integer not null check \(width between 1 and 20000\)/)
    expect(sql).toMatch(/height\s+integer not null check \(height between 1 and 20000\)/)
  })

  it('reuses the existing updated_at trigger function', () => {
    expect(sql).toMatch(/execute function public\.touch_updated_at\(\)/)
  })

  it('is documented in the setup guide', () => {
    const readme = readFileSync(new URL('../../readme.md', import.meta.url), 'utf8')
    expect(readme).toContain('18-gallery.sql')
  })
})

describe('built-in gallery data (src/data/gallery.ts)', () => {
  it('every built-in tag is a known tag and fits the SQL tag length limit (40)', () => {
    for (const g of GALLERY) {
      expect((GALLERY_TAGS as readonly string[]).includes(g.tag)).toBe(true)
    }
    for (const t of GALLERY_TAGS) {
      expect(t.length).toBeLessThanOrEqual(40)
      expect(t.length).toBeGreaterThanOrEqual(1)
    }
  })

  it('ids are unique and sizes are positive integers (so images never cause layout jumps)', () => {
    expect(new Set(GALLERY.map((g) => g.id)).size).toBe(GALLERY.length)
    for (const g of GALLERY) {
      expect(Number.isInteger(g.width) && g.width > 0).toBe(true)
      expect(Number.isInteger(g.height) && g.height > 0).toBe(true)
      expect(g.alt.length).toBeGreaterThanOrEqual(10)
    }
  })
})

describe('validateGalleryInput', () => {
  it('accepts a normal entry', () => {
    expect(validateGalleryInput(ok)).toBeNull()
    expect(validateGalleryInput({ ...ok, taken_on: '2026-10-10', caption: 'Dehradun', alt_text: 'Five students' })).toBeNull()
  })

  it('requires a title and a tag', () => {
    expect(validateGalleryInput({ ...ok, title: '   ' })).toBe('Give the image a title.')
    expect(validateGalleryInput({ ...ok, tag: '' })).toBe('Pick a tag.')
  })

  it('enforces the same limits as the database', () => {
    expect(validateGalleryInput({ ...ok, title: 'x'.repeat(GALLERY_LIMITS.title) })).toBeNull()
    expect(validateGalleryInput({ ...ok, title: 'x'.repeat(GALLERY_LIMITS.title + 1) })).toContain('Title must be')
    expect(validateGalleryInput({ ...ok, caption: 'x'.repeat(GALLERY_LIMITS.caption + 1) })).toContain('Caption must be')
    expect(validateGalleryInput({ ...ok, alt_text: 'x'.repeat(GALLERY_LIMITS.alt + 1) })).toContain('Alt text must be')
  })

  it('only accepts ISO-style dates', () => {
    expect(validateGalleryInput({ ...ok, taken_on: '10/10/2026' })).toBe('Date must look like 2026-10-10.')
    expect(validateGalleryInput({ ...ok, taken_on: '2026-10-10' })).toBeNull()
  })
})

describe('rowToItem (database row -> page item)', () => {
  const row: GalleryRow = {
    id: 'abc',
    title: 'Team',
    caption: 'After the pitch',
    alt_text: null,
    tag: 'Team',
    image_url: 'https://x.supabase.co/storage/v1/object/public/journal-media/u/1.jpg',
    storage_path: 'u/1.jpg',
    width: 1600,
    height: 900,
    taken_on: '2026-10-10',
    is_published: true,
    created_by: 'u',
    created_at: '2026-11-01T00:00:00Z',
    updated_at: '2026-11-01T00:00:00Z',
  }

  it('maps the fields the lightbox needs and namespaces the id', () => {
    const it1 = rowToItem(row)
    expect(it1.id).toBe('db-abc')
    expect(it1.src).toBe(row.image_url)
    expect(it1.width).toBe(1600)
    expect(it1.height).toBe(900)
    expect(it1.tag).toBe('Team')
  })

  it('falls back to the title for alt text and joins caption + date', () => {
    const it1 = rowToItem(row)
    expect(it1.alt).toBe('Team')
    expect(it1.caption).toBe('After the pitch · 10 Oct 2026')
    expect(rowToItem({ ...row, alt_text: 'Five students outdoors' }).alt).toBe('Five students outdoors')
  })

  it('omits the caption entirely when there is nothing to show', () => {
    expect(rowToItem({ ...row, caption: null, taken_on: null }).caption).toBe(undefined)
  })
})
