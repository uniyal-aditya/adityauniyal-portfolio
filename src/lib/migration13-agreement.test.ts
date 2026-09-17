import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { docToText, readingTime } from './sanitize'

/**
 * SQL ⇄ TypeScript word-count agreement for migration 13.
 *
 * Migration 13 recomputes reading_time in SQL by pulling every "text":
 * value out of the stored Tiptap JSON with a regex; the app recomputes
 * it in TypeScript via docToText(). If either side drifts, a post's
 * reading time changes depending on which path last saved it. This
 * test extracts the ACTUAL pattern from the migration file — editing
 * the migration's regex breaks this test instead of silently diverging —
 * and proves it counts words identically to docToText().
 */
const MIGRATION_PATH = new URL('../../supabase/13-post-metadata.sql', import.meta.url)
const migrationSql = readFileSync(MIGRATION_PATH, 'utf8')

// The migration's only regexp_matches over content must keep this exact shape.
const extracted = migrationSql.match(/regexp_matches\(content,\s*'([^']+)',\s*'g'\)/)
/** The raw Postgres regex source, exactly as the migration declares it. */
const PG_PATTERN = extracted?.[1] ?? ''

/**
 * Faithful JS emulation of the migration's SQL pipeline:
 *   string_agg(m.w, ' ') → trim → regexp_split_to_array(_, '\s+') → array_length
 * Postgres notes kept honest:
 *  - string_agg over zero rows returns NULL → n is NULL → the UPDATE's
 *    `where w.n is not null` skips the row (reading_time left untouched).
 *  - regexp_split_to_array('', ...) yields one empty string (length 1).
 */
function sqlWordCount(storedJson: string): number | null {
  if (!storedJson.startsWith('{')) return null // migration only special-cases JSON docs
  const words: string[] = []
  for (const m of storedJson.matchAll(new RegExp(PG_PATTERN, 'g'))) words.push(m[1])
  if (words.length === 0) return null // string_agg NULL → row skipped
  return words.join(' ').trim().split(/\s+/).length
}

/** greatest(1, round(n::numeric / 200)::int) — PG round-half matches Math.round for positives. */
const sqlReadingTime = (n: number) => Math.max(1, Math.round(n / 200))

/** The TypeScript side, exactly as upsertPost runs it. */
const tsReadingTime = (storedJson: string) => readingTime(docToText(JSON.parse(storedJson)))

/** A realistic Tiptap document: every block type the editor produces. */
const richDoc = {
  type: 'doc',
  content: [
    { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'What you never saw was the middle' }] },
    {
      type: 'paragraph',
      content: [
        { type: 'text', text: 'The old site said ' },
        { type: 'text', marks: [{ type: 'code' }], text: 'SYSTEMS THAT work.' },
        { type: 'text', text: ' — a claim, not a story. It quoted "ship it" often enough.' },
      ],
    },
    { type: 'codeBlock', attrs: { language: 'ts' }, content: [{ type: 'text', text: 'const honest = true' }] },
    { type: 'blockquote', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Ship the honest version.' }] }] },
    {
      type: 'bulletList',
      content: [
        { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'auth' }] }] },
        { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'editor' }] }] },
      ],
    },
    { type: 'paragraph', content: [{ type: 'text', text: 'Escapes count once: café — "done" \\n not twice.' }] },
    // attrs only — alt/title/src must NEVER count as words
    { type: 'image', attrs: { src: '/covers/flagship.svg', alt: 'decorative words must not count', title: 'more invisible words' } },
  ],
}

describe('migration 13 SQL ⇄ docToText agreement', () => {
  it('the migration still contains the word-count regex this test pins', () => {
    // Guards the test itself: if the migration's shape changes, update it here.
    expect(PG_PATTERN).toContain('"text":')
    expect(PG_PATTERN).toContain('(?:[^"\\\\]|\\\\.)*')
  })

  it('counts the rich fixture identically (word list AND final reading time)', () => {
    const stored = JSON.stringify(richDoc)
    const sqlN = sqlWordCount(stored) as number
    const tsText = docToText(richDoc)
    const tsWords = tsText.trim().split(/\s+/).filter(Boolean).length
    expect(sqlN).toBe(tsWords)
    expect(sqlReadingTime(sqlN)).toBe(tsReadingTime(stored))
  })

  it('attrs (alt/src/title) never inflate the SQL count', () => {
    const stored = JSON.stringify(richDoc)
    // every word in the SQL aggregation must come from a text node
    const sqlWords = [...stored.matchAll(new RegExp(PG_PATTERN, 'g'))].map((m) => m[1]).join(' ')
    expect(sqlWords).not.toContain('decorative')
    expect(sqlWords).not.toContain('flagship.svg')
    expect(sqlWords).not.toContain('invisible')
  })

  it('escaped characters inside text values count the same on both sides', () => {
    const doc = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'say "hi" to \\n café' }] }] }
    const stored = JSON.stringify(doc)
    expect(sqlWordCount(stored)).toBe(docToText(doc).trim().split(/\s+/).filter(Boolean).length)
  })

  it('the flagship contract: 639 words → 3 minutes on BOTH paths', () => {
    const words = Array.from({ length: 639 }, (_, i) => `w${i}`)
    const doc = {
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: words.join(' ') }] }],
    }
    const stored = JSON.stringify(doc)
    expect(sqlReadingTime(sqlWordCount(stored) as number)).toBe(3)
    expect(tsReadingTime(stored)).toBe(3)
  })

  it('a doc with zero text nodes: SQL skips the row, TS floors at 1 (documented, benign)', () => {
    const stored = JSON.stringify({ type: 'doc', content: [{ type: 'image', attrs: { src: '/x.svg' } }] })
    expect(sqlWordCount(stored)).toBeNull() // n IS NULL → UPDATE skips, rt keeps its previous value
    expect(tsReadingTime(stored)).toBe(1) // docToText('') → min 1
  })
})
