import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import LinkExt from '@tiptap/extension-link'
import ImageExt from '@tiptap/extension-image'
import PlaceholderExt from '@tiptap/extension-placeholder'
import StrikeExt from '@tiptap/extension-strike'
import TextStyleExt from '@tiptap/extension-text-style'
import YoutubeExt from '@tiptap/extension-youtube'
import { Table } from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableHeader from '@tiptap/extension-table-header'
import TableCell from '@tiptap/extension-table-cell'
import { Seo } from '@/lib/seo'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/useToast'
import { fetchPostForEdit, fetchCategories, uploadMedia, upsertPost } from '@/lib/journal-api'
import { supabase, SUPABASE_CONFIGURED } from '@/lib/supabase'
import { slugify, readingTime, mdToText, safeUrl } from '@/lib/sanitize'
import { EmptyState } from '@/components/journal/bits'
import type { PostType } from '@/lib/types'

const TYPES: [PostType, string][] = [
  ['article', 'Article'],
  ['tutorial', 'Tutorial'],
  ['guide', 'Guide'],
  ['build_log', 'Build Log'],
  ['note', 'Note'],
  ['case_study', 'Case Study'],
  ['project_journal', 'Project Journal'],
]

interface SlashItem {
  label: string
  hint: string
  run: () => void
}

function useEditorSetup(initialJson: unknown) {
  return useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3, 4] } }),
      LinkExt.configure({ openOnClick: false, autolink: true, HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' } }),
      ImageExt.configure({ inline: false, allowBase64: false }),
      PlaceholderExt.configure({ placeholder: 'Write the story. Type / for commands...' }),
      StrikeExt,
      TextStyleExt,
      YoutubeExt.configure({ nocookie: true, controls: true }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: (initialJson as object) ?? { type: 'doc', content: [] },
    autofocus: false,
  })
}

function SlashMenu({ editor }: { editor: ReturnType<typeof useEditorSetup> }) {
  const [q, setQ] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const items = useMemo<SlashItem[]>(() => {
    if (!editor) return []
    return [
      { label: '/heading', hint: 'H2', run: () => editor.chain().focus().toggleHeading({ level: 2 }).run() },
      { label: '/subheading', hint: 'H3', run: () => editor.chain().focus().toggleHeading({ level: 3 }).run() },
      { label: '/image', hint: 'upload', run: () => window.dispatchEvent(new CustomEvent('au:editor-image')) },
      { label: '/code', hint: 'block', run: () => editor.chain().focus().toggleCodeBlock().run() },
      { label: '/quote', hint: 'blockquote', run: () => editor.chain().focus().toggleBlockquote().run() },
      { label: '/link', hint: 'url', run: () => {
        const url = window.prompt('Link URL (https://...)')
        if (url) {
          const s = safeUrl(url)
          if (s) editor.chain().focus().setLink({ href: s }).run()
          else window.alert('Invalid URL - only http(s) links are allowed.')
        }
      } },
      { label: '/table', hint: '3x3', run: () => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run() },
      { label: '/callout', hint: 'info box', run: () => editor.chain().focus().setNode('blockquote').run() },
      { label: '/youtube', hint: 'embed video', run: () => {
        const url = window.prompt('YouTube URL')
        if (!url) return
        editor.chain().focus().setYoutubeVideo({ src: url }).run()
      } },
      { label: '/embed', hint: 'youtube or link', run: () => {
        const url = window.prompt('Embed URL (YouTube or any link)')
        if (!url) return
        const s = safeUrl(url)
        if (!s) return window.alert('Invalid URL.')
        const isYt = /youtu\.?be/.test(s)
        editor
          .chain()
          .focus()
          .insertContent(
            isYt
              ? { type: 'paragraph', content: [{ type: 'text', text: 'YouTube: ' + s }] }
              : { type: 'paragraph', content: [{ type: 'text', marks: [{ type: 'link', attrs: { href: s } }] }, { type: 'text', text: s }] },
          )
          .run()
      } },
      { label: '/divider', hint: 'hr', run: () => editor.chain().focus().setHorizontalRule().run() },
    ]
  }, [editor])

  // open on a freshly typed "/", track the query, close otherwise
  useEffect(() => {
    if (!editor) return
    const onUpdate = () => {
      const { $from, empty } = editor.state.selection
      if (!empty || !$from.parent.isTextblock) {
        setOpen(false)
        return
      }
      const before = $from.parent.textBetween(0, $from.parentOffset, undefined, '\ufffc')
      const m = before.match(/(?:^|\s)\/(\S*)$/)
      if (m) {
        setOpen(true)
        setQ(m[1])
      } else {
        setOpen(false)
      }
    }
    editor.on('transaction', onUpdate)
    return () => {
      editor.off('transaction', onUpdate)
    }
  }, [editor])

  const filtered = items.filter((i) => i.label.toLowerCase().includes(q.toLowerCase()))
  if (!editor) return null
  if (!open) return null
  return (
    <div className="slash-menu" ref={ref} role="menu">
      {filtered.map((i) => (
        <button
          key={i.label}
          role="menuitem"
          onClick={() => {
            // remove the typed "/command" text, then apply the block
            const { state } = editor
            const { $from } = state.selection
            const node = $from.parent
            const start = $from.parentOffset
            let textBefore = ''
            if (node.isTextblock) {
              const found = node.textContent.slice(0, start).match(/\/(\S*)$/)
              if (found) {
                textBefore = found[0]
                editor.chain().focus().deleteRange({ from: $from.pos - textBefore.length, to: $from.pos }).run()
              }
            }
            setOpen(false)
            setQ('')
            i.run()
          }}
        >
          <span>{i.label}</span>
          <span className="palette-hint">{i.hint}</span>
        </button>
      ))}
      {!filtered.length && <div className="palette-empty">No commands.</div>}
      <span hidden>{q}</span>
    </div>
  )
}

export default function EditorPage() {
  const { user, profile, loading, configured, canPublishDirect, isAdmin } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [params] = useSearchParams()
  const editId = params.get('id') ?? undefined

  const [title, setTitle] = useState('')
  const [slugTouched, setSlugTouched] = useState(false)
  const [slug, setSlug] = useState('')
  const [subtitle, setSubtitle] = useState('')
  const [excerpt, setExcerpt] = useState('')
  const [cover, setCover] = useState<{ url: string; alt: string } | null>(null)
  const [type, setType] = useState<PostType>('article')
  const [categoryId, setCategoryId] = useState('')
  const [tagNames, setTagNames] = useState('')
  const [seoTitle, setSeoTitle] = useState('')
  const [seoDesc, setSeoDesc] = useState('')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(0)
  const [showMeta, setShowMeta] = useState(true)
  const fileRef = useRef<HTMLInputElement>(null)
  const loadedRef = useRef(false)

  const { data: cats } = useQuery({ queryKey: ['categories'], queryFn: fetchCategories, enabled: SUPABASE_CONFIGURED })
  const { data: existing } = useQuery({
    queryKey: ['post-edit', editId],
    queryFn: () => fetchPostForEdit(editId!),
    enabled: Boolean(editId),
  })

  const editor = useEditorSetup(null)

  useEffect(() => {
    if (!existing || loadedRef.current || !editor) return
    loadedRef.current = true
    setTitle(existing.title)
    setSlug(existing.slug)
    setSlugTouched(true)
    setSubtitle(existing.subtitle ?? '')
    setExcerpt(existing.excerpt ?? '')
    if (existing.cover_image_url) setCover({ url: existing.cover_image_url, alt: existing.cover_image_alt ?? '' })
    setType(existing.post_type)
    setCategoryId(existing.categories?.id ?? '')
    setTagNames((existing.tags ?? []).map((t) => t.name).join(', '))
    setSeoTitle(existing.seo_title ?? '')
    setSeoDesc(existing.seo_description ?? '')
    if (existing.content) editor.commands.setContent(existing.content as never)
  }, [existing, editor])

  useEffect(() => {
    if (!slugTouched) setSlug(slugify(title))
  }, [title, slugTouched])

  const words = useMemo(() => {
    if (!editor) return 0
    return editor.getText().split(/\s+/).filter(Boolean).length
  // eslint-disable-next-line react-hooks/exhaustive-deps -- editor state changes re-run via doc reference
  }, [editor?.state.doc])

  const minutes = readingTime(editor?.getText() ?? '')

  async function uploadCover(file: File) {
    if (!user) return
    setUploading(1)
    const res = await uploadMedia(file, user.id, (p) => setUploading(p))
    setUploading(0)
    if (res.error) return toast(res.error, true)
    if (res.url) setCover({ url: res.url, alt: file.name.replace(/\.[a-z0-9]+$/i, '') })
  }

  async function uploadInline(file: File) {
    if (!user || !editor) return
    setUploading(1)
    const res = await uploadMedia(file, user.id, (p) => setUploading(p))
    setUploading(0)
    if (res.error) return toast(res.error, true)
    if (res.url) editor.chain().focus().setImage({ src: res.url, alt: file.name }).run()
  }

  async function save(status: 'draft' | 'published' | 'submitted') {
    if (!user) return
    if (!title.trim()) return toast('Give the article a title first.', true)
    if (!slug.trim()) return toast('Slug is required.', true)
    setSaving(true)
    const text = editor?.getText() ?? ''
    const content = editor?.getJSON() ?? { type: 'doc', content: [] }
    const autoExcerpt = excerpt || (mdToText(text).slice(0, 180) || null)
    // Resolve tags: existing or create
    const names = tagNames.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean)
    const tagIds: string[] = []
    for (const n of names) {
      const tslug = slugify(n)
      const { data: found } = await supabase.from('tags').select('id').eq('slug', tslug).maybeSingle()
      if (found) tagIds.push((found as { id: string }).id)
      else {
        const { data: created } = await supabase.from('tags').insert({ name: n, slug: tslug }).select('id').single()
        if (created) tagIds.push((created as { id: string }).id)
      }
    }
    const res = await upsertPost(
      {
        title: title.trim(),
        subtitle: subtitle || null,
        slug,
        excerpt: autoExcerpt,
        content,
        cover_image_url: cover?.url ?? null,
        cover_image_alt: cover?.alt ?? null,
        post_type: type,
        category_id: categoryId || null,
        status,
        seo_title: seoTitle || null,
        seo_description: seoDesc || null,
        reading_time: readingTime(text),
        tag_ids: tagIds,
        series_id: null,
        series_position: null,
        project_name: null,
        project_url: null,
      },
      user.id,
      editId,
    )
    setSaving(false)
    if (res.error) return toast(res.error, true)
    toast(status === 'published' ? 'Published.' : status === 'submitted' ? 'Submitted for review.' : 'Draft saved.')
    void qc.invalidateQueries({ queryKey: ['my-posts'] })
    if (!editId) navigate('/blog/dashboard/editor?id=' + res.id, { replace: true })
  }

  // gate: only contributors and above can publish; readers get turned away
  useEffect(() => {
    if (loading || !configured) return
    if (!user) navigate('/blog/login', { replace: true })
  }, [loading, configured, user, navigate])

  if (!configured || !user) {
    return (
      <div className="container" style={{ paddingTop: 140 }}>
        <EmptyState title="The editor needs Supabase and a signed-in contributor account." note="Apply on the Become a contributor page to get access." />
      </div>
    )
  }

  const roleOk = profile?.role === 'contributor' || profile?.role === 'verified_author' || isAdmin
  if (profile && !roleOk) {
    return (
      <div className="container" style={{ paddingTop: 140 }}>
        <EmptyState title="Contributor access required." note="Your application is pending. Once approved, the editor opens here." />
        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <Link to="/blog/apply" className="btn-ghost-line">Apply to write</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="editor-page">
      <Seo title="Editor - AU_ / JOURNAL" path="/blog/dashboard/editor" noindex />
      <div className="editor-top">
        <div className="container editor-top-inner">
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
            <Link to="/blog/dashboard" className="btn-ghost-line btn-small">&larr; Dashboard</Link>
            <span className="meta">{minutes} min &middot; {words} words</span>
            {uploading > 0 && <span className="meta" style={{ color: 'var(--lime)' }}>uploading {uploading}%</span>}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn-ghost-line btn-small" onClick={() => setShowMeta((v) => !v)}>{showMeta ? 'Hide details' : 'Show details'}</button>
            <button className="btn-ghost-line btn-small" disabled={saving} onClick={() => void save('draft')}>Save draft</button>
            {!canPublishDirect && (
              <button className="btn-ghost-line btn-small" disabled={saving} onClick={() => void save('submitted')}>Submit for review</button>
            )}
            {(canPublishDirect || isAdmin) && (
              <button className="btn-lime btn-small" disabled={saving} onClick={() => void save('published')}>Publish</button>
            )}
          </div>
        </div>
      </div>

      <div className="container editor-grid">
        <div className="editor-main">
          <input
            className="editor-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Article title..."
            aria-label="Title"
          />
          <input
            className="editor-subtitle"
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
            placeholder="Subtitle (optional)"
            aria-label="Subtitle"
          />
          <div className="editor-toolbar meta">
            <button onClick={() => editor?.chain().focus().toggleBold().run()} aria-label="Bold">B</button>
            <button onClick={() => editor?.chain().focus().toggleItalic().run()} aria-label="Italic"><em>I</em></button>
            <button onClick={() => editor?.chain().focus().toggleStrike().run()} aria-label="Strikethrough"><s>S</s></button>
            <button onClick={() => editor?.chain().focus().toggleCode().run()} aria-label="Inline code">&lt;&gt;</button>
            <button onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}>H2</button>
            <button onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}>H3</button>
            <button onClick={() => editor?.chain().focus().toggleBulletList().run()}>&bull; list</button>
            <button onClick={() => editor?.chain().focus().toggleOrderedList().run()}>1. list</button>
            <button onClick={() => editor?.chain().focus().toggleBlockquote().run()}>&ldquo; quote</button>
            <button onClick={() => editor?.chain().focus().toggleCodeBlock().run()}>&lt;/&gt; code</button>
            <button onClick={() => fileRef.current?.click()}>image</button>
            <button
              onClick={() => editor?.chain().focus().unsetAllMarks().clearNodes().run()}
              aria-label="Clear formatting"
              title="Clear formatting"
            >
              &times;fmt
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) void uploadInline(f)
                e.target.value = ''
              }}
            />
          </div>
          <div className="editor-shell">
            <EditorContent editor={editor} />
          </div>
          <SlashMenu editor={editor} />
        </div>

        {showMeta && (
          <aside className="editor-side">
            <div className="aside-box">
              <div className="toc-label">Slug</div>
              <input className="cf-input" value={slug} onChange={(e) => { setSlug(slugify(e.target.value)); setSlugTouched(true) }} aria-label="Slug" />
              <div className="meta" style={{ marginTop: 6 }}>/blog/post/{slug || '...'}</div>
            </div>
            <div className="aside-box">
              <div className="toc-label">Excerpt</div>
              <textarea className="cf-textarea" style={{ minHeight: 80 }} value={excerpt} onChange={(e) => setExcerpt(e.target.value)} placeholder="Auto-generated if empty" />
            </div>
            <div className="aside-box">
              <div className="toc-label">Cover</div>
              {cover ? (
                <div>
                  <img src={cover.url} alt={cover.alt} style={{ width: '100%', borderRadius: 3, marginBottom: 10 }} />
                  <input className="cf-input" value={cover.alt} onChange={(e) => setCover({ ...cover, alt: e.target.value })} placeholder="Alt text" aria-label="Cover alt text" />
                  <button className="btn-ghost-line btn-small" style={{ marginTop: 8 }} onClick={() => setCover(null)}>Remove</button>
                </div>
              ) : (
                <div
                  className="cover-drop"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault()
                    const f = e.dataTransfer.files?.[0]
                    if (f) void uploadCover(f)
                  }}
                >
                  <span className="meta">Drag an image here</span>
                  <button className="btn-ghost-line btn-small" onClick={() => fileRef.current?.click()}>Browse</button>
                </div>
              )}
            </div>
            <div className="aside-box">
              <div className="toc-label">Type &amp; topic</div>
              <select className="cf-input" value={type} onChange={(e) => setType(e.target.value as PostType)} aria-label="Post type">
                {TYPES.map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
              <select className="cf-input" style={{ marginTop: 8 }} value={categoryId} onChange={(e) => setCategoryId(e.target.value)} aria-label="Category">
                <option value="">- none -</option>
                {(cats ?? []).map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="aside-box">
              <div className="toc-label">Tags</div>
              <input className="cf-input" value={tagNames} onChange={(e) => setTagNames(e.target.value)} placeholder="comma, separated" aria-label="Tags" />
            </div>
            <div className="aside-box">
              <div className="toc-label">SEO</div>
              <input className="cf-input" value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} placeholder="SEO title (defaults to article title)" />
              <textarea className="cf-textarea" style={{ minHeight: 70, marginTop: 8 }} value={seoDesc} onChange={(e) => setSeoDesc(e.target.value)} placeholder="SEO description (defaults to excerpt)" />
            </div>
          </aside>
        )}
      </div>
    </div>
  )
}
