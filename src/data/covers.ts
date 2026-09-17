/**
 * Cover art bundled with the site (served from /public/covers).
 * These are real, shipped assets — listed here so admin surfaces
 * (Media tab) can show them alongside uploaded media. When you add
 * a new cover to public/covers, add a matching entry here.
 * Uploaded images (Supabase Storage) live in the `media` table instead.
 */
export interface BundledCover {
  /** Public URL of the asset */
  file: string
  /** Alt text — kept in sync with the posts referencing this cover */
  alt: string
}

export const BUNDLED_COVERS: BundledCover[] = [
  { file: '/covers/flagship.svg', alt: 'Terminal window announcing AU_ / JOURNAL is live' },
  { file: '/covers/buildlog-01.svg', alt: 'Git graph of the portfolio branching into a journal' },
  { file: '/covers/buildlog-02.svg', alt: 'Bell with a lime unread notification dot' },
]
