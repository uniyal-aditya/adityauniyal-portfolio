// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { mdToSafeHtml } from './md-safe-html'

/**
 * mdToSafeHtml feeds dangerouslySetInnerHTML for legacy markdown posts, so it
 * is the XSS boundary for pre-Tiptap content. Changes here must be deliberate.
 */

function render(html: string): HTMLDivElement {
  const div = document.createElement('div')
  div.innerHTML = html
  return div
}

describe('mdToSafeHtml injection payloads', () => {
  it('does not emit an onerror attribute from a quote-bearing alt payload', () => {
    const html = mdToSafeHtml('![x" onerror="alert(1)](https://a.com/b.png)')
    const div = render(html)
    expect(div.querySelector('[onerror]')).toBeNull()
    const img = div.querySelector('img')
    expect(img).not.toBeNull()
    // alt survives as literal text, never as a second attribute
    expect(img!.getAttribute('alt')).toBe('x" onerror="alert(1)')
    expect(img!.getAttribute('src')).toBe('https://a.com/b.png')
  })

  it('keeps raw <script> and <img onerror> escaped as inert text', () => {
    const html = mdToSafeHtml('hello <script>alert(1)</script>\n\n<img src=x onerror=alert(1)>')
    expect(html).not.toMatch(/<script\b/i)
    expect(html).not.toMatch(/<img\b/i)
    const div = render(html)
    expect(div.querySelector('script')).toBeNull()
    expect(div.querySelector('img')).toBeNull()
    expect(div.querySelector('[onerror]')).toBeNull()
    expect(div.textContent).toContain('alert(1)') // present, but only as text
  })

  it('drops javascript: link URLs instead of rendering an anchor', () => {
    const div = render(mdToSafeHtml('[click](javascript:alert(1))'))
    expect(div.querySelector('a')).toBeNull()
    expect(div.textContent).toContain('click')
  })

  it('strips tags the allow-list does not cover (DOMPurify second pass)', () => {
    const html = mdToSafeHtml('## T\n\n<div onclick="alert(1)">hi</div>')
    const div = render(html)
    expect(div.querySelector('div')).toBeNull()
    expect(div.querySelector('[onclick]')).toBeNull()
  })
})

describe('mdToSafeHtml clean markdown still renders', () => {
  it('renders headings, bold, images, links and code blocks', () => {
    const html = mdToSafeHtml(
      '## A Title\n\nSome **bold** text\n\n![alt text](https://a.com/b.png)\n\n[a link](https://e.com/x)\n\n```js\nconst a = 1\n```',
    )
    const div = render(html)
    expect(div.querySelector('h2')?.getAttribute('id')).toBe('a-title')
    expect(div.querySelector('strong')?.textContent).toBe('bold')
    const img = div.querySelector('img')
    expect(img?.getAttribute('src')).toBe('https://a.com/b.png')
    expect(img?.getAttribute('alt')).toBe('alt text')
    expect(img?.getAttribute('loading')).toBe('lazy')
    const a = div.querySelector('a')
    expect(a?.getAttribute('href')).toBe('https://e.com/x')
    expect(a?.getAttribute('target')).toBe('_blank')
    expect(div.querySelector('pre')?.getAttribute('data-lang')).toBe('js')
    expect(div.querySelector('pre code')?.textContent).toContain('const a = 1')
  })
})
