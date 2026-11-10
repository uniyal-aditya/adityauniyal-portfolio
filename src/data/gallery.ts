/**
 * Gallery photos & certificates.
 *
 * HOW TO ADD A PHOTO (3 steps, no other code needed):
 *   1. Put the image in  public/gallery/   (JPG / WebP, ideally under ~300 KB).
 *   2. Add one entry below. `width` / `height` are the image's real pixel size —
 *      they reserve space so the page never jumps while images load.
 *   3. Commit + deploy. The page, filter chips and lightbox update by themselves.
 *
 * Newest first. A tag chip only appears once at least one item uses it.
 */
export const GALLERY_TAGS = ['Certificates', 'Hackathons', 'Team', 'Projects', 'Moments'] as const
export type GalleryTag = (typeof GALLERY_TAGS)[number]

export interface GalleryItem {
  id: string
  /** Path under /public, e.g. /gallery/my-photo.jpg */
  src: string
  /** Describe the image for screen readers. */
  alt: string
  title: string
  caption?: string
  /** One of GALLERY_TAGS for photos you add by hand; the admin form uses the same list. */
  tag: string
  width: number
  height: number
}

export const GALLERY: GalleryItem[] = [
  {
    id: 'hacktoberfest-certificate',
    src: '/gallery/hacktoberfest-2026-certificate.jpg',
    alt: 'Hacktoberfest 2026 certificate of attendance for Aditya Uniyal, Hack Day Dehradun x AWS SBG GEU, 10 October 2026',
    title: 'Hacktoberfest Hack Day Dehradun',
    caption: 'Certificate of Attendance · 10 Oct 2026',
    tag: 'Certificates',
    width: 499,
    height: 350,
  },
  {
    id: 'sih-certificate',
    src: '/gallery/sih-2026-internal-round-certificate.jpg',
    alt: 'Smart India Hackathon 2026 internal round certificate of participation for Aditya Uniyal, Doon University, 22 and 23 August 2026',
    title: 'Smart India Hackathon 2026: Internal Round',
    caption: 'Certificate of Participation · 22–23 Aug 2026',
    tag: 'Certificates',
    width: 499,
    height: 350,
  },
]
