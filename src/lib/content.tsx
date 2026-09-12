import { Fragment, type ReactNode } from 'react'
import { safeUrl, youtubeId } from '@/lib/sanitize'

interface TiptapNode {
  type: string
  attrs?: Record<string, unknown>
  content?: TiptapNode[]
  marks?: { type: string; attrs?: Record<string, unknown> }[]
  text?: string
}

function renderMarks(text: string, marks: TiptapNode['marks'], key: number): ReactNode {
  if (!marks?.length) return <Fragment key={key}>{text}</Fragment>
  let out: ReactNode = text
  for (let i = marks.length - 1; i >= 0; i--) {
    const m = marks[i]
    if (m.type === 'bold') out = <strong key={key + '-b'}>{out}</strong>
    else if (m.type === 'italic') out = <em key={key + '-i'}>{out}</em>
    else if (m.type === 'code') out = <code key={key + '-c'}>{out}</code>
    else if (m.type === 'link') {
      const href = safeUrl(String(m.attrs?.href ?? ''))
      out = href ? (
        <a key={key + '-l'} href={href} target="_blank" rel="noopener noreferrer">
          {out}
        </a>
      ) : (
        out
      )
    }
  }
  return out
}

function EmbedCard({ url, caption }: { url: string; caption?: string | null }) {
  const yt = youtubeId(url)
  if (yt) {
    return (
      <figure className="embed-wrap">
        <div className="embed-16x9">
          <iframe
            src={'https://www.youtube-nocookie.com/embed/' + yt}
            title="YouTube embed"
            loading="lazy"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
        {caption && <figcaption>{caption}</figcaption>}
      </figure>
    )
  }
  let host = ''
  try {
    host = new URL(url).hostname.replace(/^www\./, '')
  } catch {
    host = ''
  }
  return (
    <a className="embed-card" href={url} target="_blank" rel="noopener noreferrer">
      <span className="ec-host">{host || 'link'}</span>
      <span className="ec-url">{url}</span>
      <span className="ec-arr">&rarr;</span>
    </a>
  )
}

function renderNode(node: TiptapNode, key: number): ReactNode {
  switch (node.type) {
    case 'paragraph':
      return <p key={key}>{renderChildren(node, key)}</p>
    case 'heading': {
      const lvl = Math.min(6, Math.max(2, Number(node.attrs?.level ?? 2)))
      const Tag = ('h' + lvl) as 'h2'
      return <Tag key={key}>{renderChildren(node, key)}</Tag>
    }
    case 'bulletList':
      return <ul key={key}>{renderChildren(node, key)}</ul>
    case 'orderedList':
      return <ol key={key}>{renderChildren(node, key)}</ol>
    case 'listItem':
      return <li key={key}>{renderChildren(node, key)}</li>
    case 'blockquote':
      return <blockquote key={key}>{renderChildren(node, key)}</blockquote>
    case 'codeBlock': {
      const code =
        node.content
          ?.map((c) => c.text ?? '')
          .join('\n') ?? ''
      const lang = String(node.attrs?.language ?? '')
      return (
        <pre key={key} data-lang={lang || undefined}>
          <code>{code}</code>
        </pre>
      )
    }
    case 'image': {
      const src = safeUrl(String(node.attrs?.src ?? ''))
      if (!src) return null
      return (
        <figure key={key}>
          <img src={src} alt={String(node.attrs?.alt ?? '')} loading="lazy" />
          {node.attrs?.title ? <figcaption>{String(node.attrs.title)}</figcaption> : null}
        </figure>
      )
    }
    case 'horizontalRule':
      return <hr key={key} />
    case 'hardBreak':
      return <br key={key} />
    case 'callout': {
      const kind = String(node.attrs?.kind ?? 'info')
      return (
        <aside key={key} className={'callout callout-' + kind}>
          <div className="callout-label">{kind.toUpperCase()}</div>
          {renderChildren(node, key)}
        </aside>
      )
    }
    case 'embed':
    case 'linkCard': {
      const url = safeUrl(String(node.attrs?.url ?? ''))
      if (!url) return null
      return <EmbedCard key={key} url={url} caption={node.attrs?.caption ? String(node.attrs.caption) : undefined} />
    }
    case 'table':
      return (
        <div key={key} className="table-wrap">
          <table>
            {renderChildren(node, key)}
          </table>
        </div>
      )
    case 'tableRow':
      return <tr key={key}>{renderChildren(node, key)}</tr>
    case 'tableHeader':
      return <th key={key}>{renderChildren(node, key)}</th>
    case 'tableCell':
      return <td key={key}>{renderChildren(node, key)}</td>
    case 'text':
      return renderMarks(node.text ?? '', node.marks, key)
    case 'doc':
      return <Fragment key={key}>{renderChildren(node, key)}</Fragment>
    default:
      return renderChildren(node, key)
  }
}

function renderChildren(node: TiptapNode, parentKey: number): ReactNode {
  return (node.content ?? []).map((c, i) => renderNode(c, parentKey * 100 + i))
}

/** Markdown fallback (legacy posts): escape first, then build structure. */
function mdToSafeHtml(md: string): string {
  let src = md.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  // fenced code blocks first
  const codeBlocks: string[] = []
  src = src.replace(/```(\w*)\n([\s\S]*?)```/g, (_m, lang: string, code: string) => {
    codeBlocks.push('<pre data-lang="' + lang + '"><code>' + code + '</code></pre>')
    return '\u0000CODE' + (codeBlocks.length - 1) + '\u0000'
  })

  src = src
    .replace(/^### (.*)$/gm, '<h3>$1</h3>')
    .replace(/^## (.*)$/gm, '<h2 id="$1">$1</h2>')
    .replace(/^# (.*)$/gm, '<h2 id="$1">$1</h2>')
    .replace(/^&gt; (.*)$/gm, '<blockquote><p>$1</p></blockquote>')
    .replace(/^---+$/gm, '<hr/>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (_m, alt: string, url: string) => {
      const s = safeUrl(url)
      return s ? '<figure><img src="' + s + '" alt="' + alt + '" loading="lazy"/></figure>' : ''
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
  return src.replace(/\u0000CODE(\d+)\u0000/g, (_m, i: string) => codeBlocks[Number(i)] ?? '')
}

/** Renders stored article content - Tiptap JSON or legacy markdown - safely. */
export function ArticleContent({ content }: { content: unknown }) {
  if (!content) return null

  // Tiptap JSON
  if (typeof content === 'object' && content !== null && 'type' in (content as Record<string, unknown>)) {
    return <div className="article-body">{renderNode(content as TiptapNode, 0)}</div>
  }

  // Legacy markdown string
  if (typeof content === 'string') {
    return <div className="article-body" dangerouslySetInnerHTML={{ __html: mdToSafeHtml(content) }} />
  }

  return null
}
