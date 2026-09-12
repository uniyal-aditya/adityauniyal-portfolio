/** Database row types mirroring supabase/01-schema.sql. */

export type Role = 'reader' | 'contributor' | 'verified_author' | 'admin' | 'owner'
export type PostStatus =
  | 'draft'
  | 'submitted'
  | 'review'
  | 'approved'
  | 'published'
  | 'rejected'
  | 'archived'
export type PostType =
  | 'article'
  | 'tutorial'
  | 'guide'
  | 'build_log'
  | 'note'
  | 'case_study'
  | 'project_journal'
export type CommentStatus = 'visible' | 'pending' | 'hidden' | 'deleted'

export interface Profile {
  id: string
  username: string
  display_name: string | null
  email: string | null
  avatar_url: string | null
  bio: string | null
  website: string | null
  github_url: string | null
  linkedin_url: string | null
  role: Role
  verified: boolean
  created_at: string
}

export interface Category {
  id: string
  name: string
  slug: string
  description: string | null
}

export interface Tag {
  id: string
  name: string
  slug: string
}

export interface Post {
  id: string
  author_id: string
  title: string
  subtitle: string | null
  slug: string
  excerpt: string | null
  /** Tiptap JSON or legacy markdown — the renderer detects the shape. */
  content: unknown
  cover_image_url: string | null
  cover_image_alt: string | null
  status: PostStatus
  post_type: PostType
  featured: boolean
  published_at: string | null
  created_at: string
  updated_at: string
  reading_time: number | null
  view_count: number | null
  like_count: number | null
  comment_count: number | null
  bookmark_count: number | null
  seo_title: string | null
  seo_description: string | null
  /** Joined relations when selected. */
  profiles?: Profile | null
  author?: Profile | null
  categories?: Category | null
  tags?: Tag[] | null
  project_links?: ProjectLink[] | null
  series_posts?: { series_id: string; position: number; series?: Series | null }[] | null
}

export interface Comment {
  id: string
  post_id: string
  user_id: string
  parent_id: string | null
  body: string
  status: CommentStatus
  created_at: string
  profiles?: Profile | null
}

export interface Like {
  user_id: string
  post_id: string
  created_at: string
}

export interface Bookmark {
  user_id: string
  post_id: string
  created_at: string
}

export interface Follow {
  follower_id: string
  following_id: string
  created_at: string
}

export interface Media {
  id: string
  owner_id: string
  storage_path: string
  public_url: string
  alt_text: string | null
  caption: string | null
  credit: string | null
  created_at: string
}

export interface Series {
  id: string
  title: string
  slug: string
  description: string | null
  cover_image_url: string | null
}

export interface ProjectLink {
  post_id: string
  project_name: string
  project_url: string | null
  portfolio_project_id: string | null
}

export interface Report {
  id: string
  reporter_id: string | null
  post_id: string | null
  comment_id: string | null
  reason: string
  details: string | null
  status: 'open' | 'resolved' | 'dismissed'
  created_at: string
}

export interface NewsletterSubscriber {
  id: string
  email: string
  created_at: string
  confirmed: boolean
}

export interface ReadingHistory {
  user_id: string
  post_id: string
  progress: number
  updated_at: string
  posts?: Post | null
}

export interface ContributorApplication {
  id: string
  user_id: string | null
  name: string
  username: string
  bio: string | null
  portfolio: string | null
  github_url: string | null
  linkedin_url: string | null
  topics: string | null
  reason: string
  sample_work: string | null
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
}
