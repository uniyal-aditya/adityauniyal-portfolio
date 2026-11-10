import { useState, type ChangeEvent, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, type useQueryClient } from '@tanstack/react-query'
import { SUPABASE_CONFIGURED } from '@/lib/supabase'
import { confirmDialog, infoDialog } from '@/hooks/dialog-bus'
import { EmptyState } from '@/components/journal/bits'
import { GALLERY_TAGS } from '@/data/gallery'
import { GALLERY_LIMITS, type GalleryInput } from '@/lib/gallery-rules'
import {
  adminAddGalleryItem,
  adminDeleteGalleryItem,
  adminFetchGallery,
  adminSetGalleryPublished,
  adminUpdateGalleryItem,
  fileToDataUrl,
  measureImage,
} from '@/lib/gallery-api'
import type { GalleryRow } from '@/lib/types'

interface Props {
  qc: ReturnType<typeof useQueryClient>
  /** The signed-in admin's profile id (owner of the uploaded files). */
  userId: string
}

const EMPTY: GalleryInput = { title: '', caption: '', alt_text: '', tag: 'Moments', taken_on: '', is_published: true }

const problem = (message: string) =>
  infoDialog({ title: 'Could not save', body: message, confirmLabel: 'Dismiss' })

const toInput = (r: GalleryRow): GalleryInput => ({
  title: r.title,
  caption: r.caption ?? '',
  alt_text: r.alt_text ?? '',
  tag: r.tag,
  taken_on: r.taken_on ?? '',
  is_published: r.is_published,
})

/** Shared field set for "new" and "edit". */
function Fields({
  value,
  onChange,
  idPrefix,
}: {
  value: GalleryInput
  onChange: (v: GalleryInput) => void
  idPrefix: string
}) {
  const set = <K extends keyof GalleryInput>(k: K, v: GalleryInput[K]) => onChange({ ...value, [k]: v })
  const id = (n: string) => idPrefix + '-' + n
  return (
    <div style={{ display: 'grid', gap: 10 }}>
      <div>
        <label htmlFor={id('title')} className="meta">Title *</label>
        <input
          id={id('title')}
          className="filterbar"
          style={{ width: '100%' }}
          maxLength={GALLERY_LIMITS.title}
          value={value.title}
          onChange={(e) => set('title', e.target.value)}
          placeholder="e.g. Hackathon team photo"
        />
      </div>
      <div>
        <label htmlFor={id('caption')} className="meta">Caption</label>
        <input
          id={id('caption')}
          className="filterbar"
          style={{ width: '100%' }}
          maxLength={GALLERY_LIMITS.caption}
          value={value.caption}
          onChange={(e) => set('caption', e.target.value)}
          placeholder="Where / what is this?"
        />
      </div>
      <div>
        <label htmlFor={id('alt')} className="meta">Alt text (describes the image for screen readers)</label>
        <input
          id={id('alt')}
          className="filterbar"
          style={{ width: '100%' }}
          maxLength={GALLERY_LIMITS.alt}
          value={value.alt_text}
          onChange={(e) => set('alt_text', e.target.value)}
          placeholder="Optional - the title is used if left empty"
        />
      </div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div>
          <label htmlFor={id('tag')} className="meta">Tag</label>
          <select
            id={id('tag')}
            className="filterbar"
            style={{ display: 'block' }}
            value={value.tag}
            onChange={(e) => set('tag', e.target.value)}
          >
            {!(GALLERY_TAGS as readonly string[]).includes(value.tag) && <option value={value.tag}>{value.tag}</option>}
            {GALLERY_TAGS.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={id('date')} className="meta">Date taken</label>
          <input
            id={id('date')}
            type="date"
            className="filterbar"
            style={{ display: 'block' }}
            value={value.taken_on}
            onChange={(e) => set('taken_on', e.target.value)}
          />
        </div>
        <label className="meta" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, paddingBottom: 9 }}>
          <input
            type="checkbox"
            checked={value.is_published}
            onChange={(e) => set('is_published', e.target.checked)}
          />
          Visible on /gallery
        </label>
      </div>
    </div>
  )
}

export function GalleryAdmin({ qc, userId }: Props) {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [size, setSize] = useState<{ width: number; height: number } | null>(null)
  const [form, setForm] = useState<GalleryInput>(EMPTY)
  const [busy, setBusy] = useState(false)
  const [fileError, setFileError] = useState<string | null>(null)
  const [editing, setEditing] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<GalleryInput>(EMPTY)
  const [fileKey, setFileKey] = useState(0)

  const q = useQuery({
    queryKey: ['admin-gallery'],
    enabled: SUPABASE_CONFIGURED,
    queryFn: adminFetchGallery,
  })

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ['admin-gallery'] })
    void qc.invalidateQueries({ queryKey: ['gallery-public'] })
  }

  const onPick = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null
    setFile(f)
    setPreview(null)
    setSize(null)
    setFileError(null)
    if (!f) return
    try {
      const url = await fileToDataUrl(f)
      setPreview(url)
      setSize(await measureImage(url))
      // Pre-fill the title from the filename so one click is enough for quick uploads.
      setForm((cur) => (cur.title ? cur : { ...cur, title: f.name.replace(/\.[a-z0-9]+$/i, '').replace(/[-_]+/g, ' ') }))
    } catch (err) {
      setFileError(err instanceof Error ? err.message : 'That file could not be read.')
    }
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!file || !size || busy) return
    setBusy(true)
    const { error } = await adminAddGalleryItem(file, form, size, userId)
    setBusy(false)
    if (error) return void problem(error)
    setFile(null)
    setPreview(null)
    setSize(null)
    setForm(EMPTY)
    setFileKey((k) => k + 1) // clears the native file input
    refresh()
  }

  const saveEdit = async (id: string) => {
    const { error } = await adminUpdateGalleryItem(id, editForm)
    if (error) return void problem(error)
    setEditing(null)
    refresh()
  }

  const toggle = async (r: GalleryRow) => {
    const { error } = await adminSetGalleryPublished(r.id, !r.is_published)
    if (error) return void problem(error)
    refresh()
  }

  const remove = async (r: GalleryRow) => {
    const ok = await confirmDialog({
      title: 'Delete "' + r.title + '"?',
      body: 'The image is removed from the gallery and from storage. This cannot be undone.',
      confirmLabel: 'Delete',
      tone: 'rust',
    })
    if (!ok) return
    const { error } = await adminDeleteGalleryItem(r)
    if (error) return void problem(error)
    refresh()
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap', margin: '0 0 14px' }}>
        <div>
          <h2 style={{ fontFamily: 'var(--f-display)', fontSize: '1.7rem', lineHeight: 1.05 }}>Gallery</h2>
          <div className="meta" style={{ marginTop: 4 }}>Photos and certificates shown on the public gallery page.</div>
        </div>
        <Link to="/gallery" className="mini-btn">view /gallery</Link>
      </div>

      <form onSubmit={submit} aria-label="Add a gallery image" style={{ border: '1px solid var(--line)', borderRadius: 4, padding: 18, marginBottom: 28, display: 'grid', gap: 16 }}>
        <div className="meta" style={{ letterSpacing: '0.12em', textTransform: 'uppercase' }}>Add an image</div>
        <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <div style={{ flex: '0 0 220px', maxWidth: '100%' }}>
            <label htmlFor="gal-file" className="meta">Image (JPEG, PNG, WebP; max 5 MB)</label>
            <input
              key={fileKey}
              id="gal-file"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              onChange={onPick}
              style={{ display: 'block', marginTop: 6, maxWidth: '100%', fontSize: 12 }}
            />
            {fileError && <p role="alert" className="meta" style={{ color: 'var(--rust)', marginTop: 8 }}>{fileError}</p>}
            {preview && (
              <figure style={{ margin: '12px 0 0' }}>
                <img src={preview} alt="Preview of the selected file" style={{ width: '100%', borderRadius: 3, border: '1px solid var(--line)', display: 'block' }} />
                {size && <figcaption className="meta" style={{ marginTop: 6 }}>{size.width} × {size.height} px</figcaption>}
              </figure>
            )}
          </div>
          <div style={{ flex: '1 1 320px', minWidth: 0 }}>
            <Fields value={form} onChange={setForm} idPrefix="gal-new" />
          </div>
        </div>
        <div>
          <button type="submit" className="mini-btn solid" disabled={!file || !size || busy} style={{ padding: '10px 16px' }}>
            {busy ? 'Uploading…' : 'Upload to gallery'}
          </button>
        </div>
      </form>

      {q.isLoading && <p className="meta">Loading…</p>}
      {q.isError && (
        <p role="alert" className="meta" style={{ color: 'var(--rust)' }}>
          Could not load the gallery. Have you run supabase/18-gallery.sql? ({(q.error as Error).message})
        </p>
      )}
      {q.data && q.data.length === 0 && (
        <EmptyState title="No uploaded images yet." note="Images you add above appear here and on /gallery. The built-in certificates come from src/data/gallery.ts." />
      )}

      {q.data && q.data.length > 0 && (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
          {q.data.map((r) => (
            <li key={r.id} data-testid="gal-row" style={{ border: '1px solid var(--line)', borderRadius: 4, padding: 10, display: 'grid', gap: 8, alignContent: 'start' }}>
              <img src={r.image_url} alt={r.alt_text || r.title} loading="lazy" width={r.width} height={r.height} style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', display: 'block', borderRadius: 3 }} />
              {editing === r.id ? (
                <>
                  <Fields value={editForm} onChange={setEditForm} idPrefix={'gal-edit-' + r.id} />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button type="button" className="mini-btn solid" onClick={() => saveEdit(r.id)}>save</button>
                    <button type="button" className="mini-btn" onClick={() => setEditing(null)}>cancel</button>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <strong style={{ fontSize: 14 }}>{r.title}</strong>
                    <div className="meta" style={{ marginTop: 3 }}>
                      {r.tag} · {r.width}×{r.height}
                      {r.taken_on ? ' · ' + r.taken_on : ''}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    <span className="pill" style={{ color: r.is_published ? 'var(--lime)' : 'var(--rust)' }}>
                      {r.is_published ? 'visible' : 'hidden'}
                    </span>
                    <button type="button" className="mini-btn" onClick={() => { setEditing(r.id); setEditForm(toInput(r)) }}>edit</button>
                    <button type="button" className="mini-btn" onClick={() => toggle(r)}>{r.is_published ? 'hide' : 'show'}</button>
                    <button type="button" className="mini-btn danger" onClick={() => remove(r)}>delete</button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
