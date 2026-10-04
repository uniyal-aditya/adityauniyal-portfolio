import { describe, expect, it } from 'vitest'
import { readingTime, docToText, youtubeId, escapeLikeTerm } from './sanitize'

/**
 * The formula is a public contract: cards, article headers, the editor
 * counter, upsertPost and the SQL backfill (migration 13) must all agree.
 * If these tests fail, reading times will drift between surfaces.
 */

describe('readingTime', () => {
  it('uses words / 200, rounded', () => {
    expect(readingTime('word '.repeat(200).trim())).toBe(1)
    expect(readingTime('word '.repeat(300).trim())).toBe(2) // 1.5 rounds to 2
    expect(readingTime('word '.repeat(639).trim())).toBe(3) // the flagship's count
    expect(readingTime('word '.repeat(1001).trim())).toBe(5)
  })

  it('never returns less than 1', () => {
    expect(readingTime('')).toBe(1)
    expect(readingTime('   ')).toBe(1)
    expect(readingTime('one word')).toBe(1)
  })

  it('counts whitespace-separated words only', () => {
    expect(readingTime('alpha beta gamma delta')).toBe(1)
    expect(readingTime('alpha\n\tbeta\ngamma    delta')).toBe(1)
  })
})

describe('docToText', () => {
  it('extracts text nodes from a Tiptap document', () => {
    const doc = {
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Title here' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'First sentence.' }] },
      ],
    }
    expect(docToText(doc)).toBe('Title here First sentence.')
  })

  it('joins adjacent inline text nodes with a space (matches getText counting)', () => {
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'plain ' },
            { type: 'text', marks: [{ type: 'bold' }], text: 'bold' },
            { type: 'text', text: ' more' },
          ],
        },
      ],
    }
    const words = docToText(doc).trim().split(/\s+/).filter(Boolean)
    expect(words).toEqual(['plain', 'bold', 'more'])
  })

  it('ignores attrs (image srcs, alt text never count as words)', () => {
    const doc = {
      type: 'doc',
      content: [
        { type: 'image', attrs: { src: '/covers/flagship.svg', alt: 'decorative words should not count' } },
        { type: 'paragraph', content: [{ type: 'text', text: 'visible' }] },
      ],
    }
    expect(docToText(doc)).toBe('visible')
  })

  it('handles empty and malformed input defensively', () => {
    expect(docToText(null)).toBe('')
    expect(docToText(undefined)).toBe('')
    expect(docToText({})).toBe('')
    expect(docToText('just a string')).toBe('just a string')
    expect(docToText([])).toBe('')
  })

  it('end-to-end: document → text → reading time agrees with the formula', () => {
    // 639 prose words spread over paragraphs → 3 min, like the flagship
    const paragraphs = Array.from({ length: 100 }, (_, i) => ({
      type: 'paragraph',
      content: [{ type: 'text', text: Array.from({ length: 7 }, (_, j) => `w${i}_${j}`).join(' ') }],
    }))
    const text = docToText({ type: 'doc', content: paragraphs })
    expect(readingTime(text)).toBe(Math.max(1, Math.round(700 / 200)))
  })
})

describe('youtubeId', () => {
  it('extracts ids from watch, youtu.be, shorts and embed URLs', () => {
    expect(youtubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
    expect(youtubeId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
    expect(youtubeId('https://www.youtube.com/shorts/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
    expect(youtubeId('https://www.youtube.com/embed/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
  })

  it('rejects ids outside [\\w-]{6,} (the id is spliced into embed URLs)', () => {
    expect(youtubeId('https://www.youtube.com/watch?v=abc')).toBeNull() // too short
    expect(youtubeId('https://youtu.be/ab;cd')).toBeNull() // junk characters
    expect(youtubeId('https://www.youtube.com/watch?v=x/y/z')).toBeNull()
    expect(youtubeId('https://www.youtube.com/watch?v=')).toBeNull()
    expect(youtubeId('https://www.youtube.com/shorts/ab')).toBeNull()
  })

  it('rejects non-YouTube and unparseable input', () => {
    expect(youtubeId('https://vimeo.com/12345678')).toBeNull()
    expect(youtubeId('https://evil.com/watch?v=dQw4w9WgXcQ')).toBeNull()
    expect(youtubeId('not a url')).toBeNull()
  })
})

describe('escapeLikeTerm', () => {
  it('escapes LIKE wildcards, the escape char, and or() filter syntax', () => {
    expect(escapeLikeTerm('100%')).toBe('100\\%')
    expect(escapeLikeTerm('under_score')).toBe('under\\_score')
    expect(escapeLikeTerm('a,b')).toBe('a\\,b')
    expect(escapeLikeTerm('group(1)')).toBe('group\\(1\\)')
    expect(escapeLikeTerm('back\\\\slash')).toBe('back\\\\\\\\slash')
  })

  it('neutralizes a filter-injection term', () => {
    // Without escaping, `x),username.ilike.%x%` could add conditions to the
    // or() filter and `%x%` would match everything.
    const t = escapeLikeTerm('x),username.ilike.%x%')
    expect(t).toBe('x\\)\\,username.ilike.\\%x\\%')
    // no unescaped filter-syntax characters remain
    expect(t).not.toMatch(/(?<!\\)[,()%_]/)
  })
})
