// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { slugify, safeUrl } from './sanitize'

/**
 * slugify guards every post/tag slug (URLs + uniqueness joins in SQL);
 * safeUrl guards every external link and embed the journal renders.
 * Both are security surfaces — changes here must be deliberate.
 */

describe('slugify', () => {
  it('lowercases and hyphenates titles', () => {
    expect(slugify('Introducing AU_ / JOURNAL')).toBe('introducing-au-journal')
    expect(slugify('Why I rebuilt my portfolio as a living journal')).toBe(
      'why-i-rebuilt-my-portfolio-as-a-living-journal',
    )
  })

  it('strips punctuation and symbols', () => {
    expect(slugify('Hello, world!')).toBe('hello-world')
    expect(slugify('C++ & C# — a comparison')).toBe('c-c-a-comparison')
    expect(slugify('renders <script>alert(1)</script> as text')).toBe(
      'renders-scriptalert1-script-as-text',
    )
  })

  it('collapses runs of whitespace/underscores into one hyphen', () => {
    expect(slugify('many    spaces')).toBe('many-spaces')
    expect(slugify('under_scores_and---dashes')).toBe('under-scores-and-dashes')
  })

  it('trims leading/trailing hyphens', () => {
    expect(slugify('  --edge case--  ')).toBe('edge-case')
  })

  it('caps length at 80 characters', () => {
    const long = slugify('word '.repeat(40))
    expect(long.length).toBeLessThanOrEqual(80)
  })

  it('reduces symbol-only input to an empty string', () => {
    expect(slugify('***')).toBe('')
    expect(slugify('___')).toBe('')
  })
})

describe('safeUrl', () => {
  it('accepts absolute http(s) URLs and normalizes them', () => {
    expect(safeUrl('https://github.com/uniyal-aditya/adityauniyal-portfolio')).toBe(
      'https://github.com/uniyal-aditya/adityauniyal-portfolio',
    )
    // URL.toString() appends a trailing slash on bare hosts
    expect(safeUrl('https://example.com')).toBe('https://example.com/')
  })

  it('resolves relative paths against the site origin', () => {
    expect(safeUrl('/blog/post/introducing-au-journal')).toBe(
      window.location.origin + '/blog/post/introducing-au-journal',
    )
  })

  it('blocks javascript: URLs (XSS vector)', () => {
    expect(safeUrl('javascript:alert(1)')).toBeNull()
    expect(safeUrl('JavaScript:alert(1)')).toBeNull()
  })

  it('blocks data: and vbscript: URLs', () => {
    expect(safeUrl('data:text/html,<script>alert(1)</script>')).toBeNull()
    expect(safeUrl('vbscript:msgbox(1)')).toBeNull()
  })

  it('blocks protocol-relative URLs that would jump offsite', () => {
    // '//evil.com/x' inherits http(s) and resolves to an offsite absolute
    // URL — an open-redirect vector. Must be rejected outright.
    expect(safeUrl('//evil.example.com/x')).toBeNull()
  })

  it('same-origin junk becomes a harmless path or null — never offsite/scriptable', () => {
    for (const junk of ['not a url at all', 'ht!tp://weird', 'javascript%3Aalert(1)']) {
      const r = safeUrl(junk)
      if (r !== null) {
        expect(r.startsWith(window.location.origin + '/') || r === window.location.origin).toBe(true)
      }
    }
  })

  it('returns null for empty/null/undefined input', () => {
    expect(safeUrl('')).toBeNull()
    expect(safeUrl('   ')).toBeNull()
    expect(safeUrl(null)).toBeNull()
    expect(safeUrl(undefined)).toBeNull()
  })

  it('tolerates surrounding whitespace', () => {
    expect(safeUrl('  https://example.com/page  ')).toBe('https://example.com/page')
  })
})
