import { supabase, SUPABASE_CONFIGURED } from '@/lib/supabase'
import { uploadMedia } from '@/lib/journal-api'
import type { GalleryItem } from '@/data/gallery'
import type { GalleryRow } from '@/lib/types'
import { clean, rowToItem, validateGalleryInput, type GalleryInput } from '@/lib/gallery-rules'

export { GALLERY_LIMITS, rowToItem, validateGalleryInput, type GalleryInput } from '@/lib/gallery-rules'

/**
 * Public gallery photos. Never throws: if Supabase is not configured or the
 * table does not exist yet (migration 18 not run), the page simply shows the
 * photos from src/data/gallery.ts.
 */
export async function fetchPublicGallery(): Promise<GalleryItem[]> {
  if (!SUPABASE_CONFIGURED) return []
  const { data, error } = await supabase
    .from('gallery_items')
    .select('*')
    .eq('is_published', true)
    .order('created_at', { ascending: false })
  if (error) return []
  return ((data ?? []) as GalleryRow[]).map(rowToItem)
}

/** Everything, including hidden items (RLS only returns hidden rows to admins). */
export async function adminFetchGallery(): Promise<GalleryRow[]> {
  const { data, error } = await supabase.from('gallery_items').select('*').order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as GalleryRow[]
}

/** file -> data: URL (data: is allowed by the site's CSP; blob: is not). */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Could not read that file.'))
    reader.onload = () => resolve(String(reader.result))
    reader.readAsDataURL(file)
  })
}

/** Natural pixel size of an image, so the page can reserve space (no layout jump). */
export function measureImage(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () =>
      img.naturalWidth > 0 && img.naturalHeight > 0
        ? resolve({ width: img.naturalWidth, height: img.naturalHeight })
        : reject(new Error('That file is not a readable image.'))
    img.onerror = () => reject(new Error('That file is not a readable image.'))
    img.src = dataUrl
  })
}

type Result = { error: string | null }

/** Upload the file, then save its metadata. Cleans up the upload if saving fails. */
export async function adminAddGalleryItem(
  file: File,
  input: GalleryInput,
  size: { width: number; height: number },
  userId: string,
): Promise<Result> {
  const problem = validateGalleryInput(input)
  if (problem) return { error: problem }

  const up = await uploadMedia(file, userId)
  if (up.error || !up.url) return { error: up.error || 'Upload failed.' }

  const { error } = await supabase.from('gallery_items').insert({
    ...clean(input),
    image_url: up.url,
    storage_path: up.path,
    width: size.width,
    height: size.height,
    created_by: userId,
  })
  if (error) {
    // Saving failed: don't leave an orphaned file behind.
    if (up.path) {
      await supabase.storage.from('journal-media').remove([up.path])
      await supabase.from('media').delete().eq('storage_path', up.path)
    }
    const hint = /relation .*gallery_items|does not exist|schema cache/i.test(error.message)
      ? ' (Run supabase/18-gallery.sql in the Supabase SQL Editor first.)'
      : ''
    return { error: error.message + hint }
  }
  return { error: null }
}

export async function adminUpdateGalleryItem(id: string, input: GalleryInput): Promise<Result> {
  const problem = validateGalleryInput(input)
  if (problem) return { error: problem }
  const { error } = await supabase.from('gallery_items').update(clean(input)).eq('id', id)
  return { error: error ? error.message : null }
}

export async function adminSetGalleryPublished(id: string, published: boolean): Promise<Result> {
  const { error } = await supabase.from('gallery_items').update({ is_published: published }).eq('id', id)
  return { error: error ? error.message : null }
}

/** Deletes the row, then (best effort) the stored file and its media-library record. */
export async function adminDeleteGalleryItem(row: GalleryRow): Promise<Result> {
  const { error } = await supabase.from('gallery_items').delete().eq('id', row.id)
  if (error) return { error: error.message }
  if (row.storage_path) {
    await supabase.storage.from('journal-media').remove([row.storage_path])
    await supabase.from('media').delete().eq('storage_path', row.storage_path)
  }
  return { error: null }
}
