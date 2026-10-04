import DOMPurify from 'dompurify'
import { safeUrl, headingId } from '@/lib/sanitize'

/**
 * Markdown fallback (legacy posts): escape first, then build structure.
 * This feeds dangerouslySetInnerHTML in ArticleContent — it is the XSS
 * boundary for pre-Tiptap posts. Lives in its own module (not content.tsx)
 * so it can be exported and unit-tested without tripping react-refresh.
 */
export function mdToSafeHtml(md: string): string {
  let src = md.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  // fenced code blocks first
  const codeBlocks: string[] = []
  src = src.replace(/```(\w*)\n([\s\S]*?)```/g, (_m, lang: string, code: string) => {
    codeBlocks.push('<pre data-lang="' + lang + '"><code>' + code + '</code></pre>')
    return '\u0000CODE' + (codeBlocks.length - 1) + '\u0000'
  })

  src = src
    .replace(/^### (.*)$/gm, (_m, t: string) => '<h3 id="' + headingId(t) + '">' + t + '</h3>')
    .replace(/^## (.*)$/gm, (_m, t: string) => '<h2 id="' + headingId(t) + '">' + t + '</h2>')
    .replace(/^# (.*)$/gm, (_m, t: string) => '<h2 id="' + headingId(t) + '">' + t + '</h2>')
    .replace(/^&gt; (.*)$/gm, '<blockquote><p>$1</p></blockquote>')
    .replace(/^---+$/gm, '<hr/>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (_m, alt: string, url: string) => {
      const s = safeUrl(url)
      // alt goes inside an attribute: quotes must not be able to break out of it
      const safeAlt = alt.replace(/"/g, '&quot;').replace(/'/g, '&#39;')
      return s ? '<figure><img src="' + s + '" alt="' + safeAlt + '" loading="lazy"/></figure>' : ''
    })
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_m, text: string, url: string) => {
      const s = safeUrl(url)
      return s ? '<a href="' + s + '" target="_blank" rel="noopener noreferrer">' + text + '</a>' : text
    })
    // lists
    .replace(/^[-*] (.*)$/gm, '<li>$1</li>')
    .replace(/(<li>[\s\S]*?<\/li>)(?!\s*<li>)/g, '<ul>$1</ul>')
    .replace(/^\d+\. (.*)$/gm, '<li>$1</li>')
    // paragraphs: group remaining non-tag lines
    .replace(/^(?!<[a-z/])(.+)$/gm, '<p>$1</p>')
    .replace(/<p><\/p>/g, '')

  // eslint-disable-next-line no-control-regex -- sentinel markers, never user data
  const built = src.replace(/\u0000CODE(\d+)\u0000/g, (_m, i: string) => codeBlocks[Number(i)] ?? '')

  // Second pass: strip anything outside the allow-list in case a builder above slipped.
  return DOMPurify.sanitize(built, {
    ALLOWED_TAGS: [
      'p', 'h2', 'h3', 'strong', 'em', 'code', 'pre', 'blockquote',
      'ul', 'ol', 'li', 'a', 'img', 'figure', 'hr',
    ],
    ALLOWED_ATTR: ['href', 'src', 'alt', 'id', 'loading', 'target', 'rel', 'data-lang'],
  })
}
