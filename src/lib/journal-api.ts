import { supabase, SUPABASE_CONFIGURED, OWNER_USERNAME } from '@/lib/supabase'
import type {
  Post,
  Profile,
  Category,
  Comment,
  Media,
  Series,
  ContributorApplication,
  ReadingHistory,
} from '@/lib/types'

const POST_SELECT = `
  *, profiles:author_id(id, username, display_name, avatar_url, bio, website, github_url, linkedin_url, role, verified),
  categories(id, name, slug, description),
  tags:post_tags(tags(id, name, slug)),
  project_links(post_id, project_name, project_url, portfolio_project_id),
  series_posts(series_id, position, series(id, title, slug, description, cover_image_url))
`

type PostRow = Post & {
  tags?: { tags: { id: string; name: string; slug: string } }[] | null
}

/** Flatten the post_tags join into a plain Tag[] on post.tags. */
function normalizePost(p: PostRow): Post {
  const flat = ((p.tags ?? []) as unknown as { tags: { id: string; name: string; slug: string } }[]).map((t) => t.tags).filter(Boolean)
  return { ...p, tags: flat } as unknown as Post
}

function normalizePosts(rows: PostRow[] | null): Post[] {
  return (rows ?? []).map(normalizePost)
}

/** Latest published posts. */
export async function fetchLatestPosts(limit = 9, offset = 0): Promise<Post[]> {
  if (!SUPABASE_CONFIGURED) return []
  const { data, error } = await supabase
    .from('posts')
    .select(POST_SELECT)
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .range(offset, offset + limit - 1)
  if (error) return []
  return normalizePosts(data as PostRow[])
}

/** Admin-featured posts. */
export async function fetchFeaturedPost(): Promise<Post | null> {
  if (!SUPABASE_CONFIGURED) return null
  const { data, error } = await supabase
    .from('posts')
    .select(POST_SELECT)
    .eq('status', 'published')
    .eq('featured', true)
    .order('published_at', { ascending: false })
    .limit(1)
  if (error || !data?.length) return null
  return normalizePost(data[0] as PostRow)
}

/** Recency-weighted trending via the SQL RPC (not lifetime views). */
export async function fetchTrendingPosts(limit = 5): Promise<Post[]> {
  if (!SUPABASE_CONFIGURED) return []
  const { data, error } = await supabase.rpc('get_trending_posts', { p_limit: limit })
  if (error) return []
  return normalizePosts(data as PostRow[])
}

/** From the Builder - the owner's own posts. */
export async function fetchBuilderPosts(limit = 4): Promise<Post[]> {
  if (!SUPABASE_CONFIGURED) return []
  const { data: prof } = await supabase.from('profiles').select('id').eq('username', OWNER_USERNAME).single()
  if (!prof) return []
  const { data, error } = await supabase
    .from('posts')
    .select(POST_SELECT)
    .eq('status', 'published')
    .eq('author_id', prof.id)
    .order('published_at', { ascending: false })
    .limit(limit)
  if (error) return []
  return normalizePosts(data as PostRow[])
}

/** Posts linked to a portfolio project via project_links.project_name. */
export async function fetchProjectJournal(projectName: string): Promise<Post[]> {
  if (!SUPABASE_CONFIGURED) return []
  const { data, error } = await supabase
    .from('project_links')
    .select('project_name, posts!inner(' + POST_SELECT + ')')
    .ilike('project_name', '%' + projectName + '%')
  if (error) return []
  const rows = (data ?? []) as unknown as { posts: PostRow }[]
  return rows.map((r) => normalizePost(r.posts))
}

export interface SearchArgs {
  q: string
  category?: string
  type?: string
  author?: string
  sort?: 'relevance' | 'newest' | 'views' | 'likes' | 'bookmarks'
  limit?: number
}

/** Full-text search through the search_journal RPC with client-side filters. */
export async function searchJournal(args: SearchArgs): Promise<Post[]> {
  if (!SUPABASE_CONFIGURED) return []
  const q = args.q.trim()
  if (!q) {
    let req = supabase.from('posts').select(POST_SELECT).eq('status', 'published').limit(args.limit ?? 24)
    if (args.type) req = req.eq('post_type', args.type)
    if (args.category) req = req.eq('categories.slug', args.category)
    const sortCol =
      args.sort === 'views'
        ? 'view_count'
        : args.sort === 'likes'
          ? 'like_count'
          : args.sort === 'bookmarks'
            ? 'bookmark_count'
            : 'published_at'
    req = req.order(sortCol, { ascending: false })
    const { data, error } = await req
    return error ? [] : normalizePosts(data as PostRow[])
  }
  const { data, error } = await supabase.rpc('search_journal', { p_query: q, p_limit: args.limit ?? 30 })
  if (error) return []
  let posts = normalizePosts(data as PostRow[])
  if (args.type) posts = posts.filter((p) => p.post_type === args.type)
  if (args.category) posts = posts.filter((p) => p.categories?.slug === args.category)
  if (args.author) posts = posts.filter((p) => (p.profiles?.username ?? '') === args.author)
  if (args.sort && args.sort !== 'relevance') {
    const key = args.sort === 'views' ? 'view_count' : args.sort === 'likes' ? 'like_count' : 'bookmark_count'
    posts = [...posts].sort((a, b) => (Number(b[key as keyof Post]) || 0) - (Number(a[key as keyof Post]) || 0))
  }
  return posts
}

/** Single published post by slug. */
export async function fetchPostBySlug(slug: string): Promise<Post | null> {
  if (!SUPABASE_CONFIGURED || !slug) return null
  const { data, error } = await supabase
    .from('posts')
    .select(POST_SELECT)
    .eq('slug', slug)
    .eq('status', 'published')
    .single()
  if (error) return null
  return normalizePost(data as PostRow)
}

/** Related posts: same category first, else latest by the same author. */
export async function fetchRelatedPosts(post: Post, limit = 3): Promise<Post[]> {
  if (!SUPABASE_CONFIGURED) return []
  if (post.categories?.id) {
    const { data } = await supabase
      .from('posts')
      .select(POST_SELECT)
      .eq('status', 'published')
      .eq('category_id', post.categories.id)
      .neq('id', post.id)
      .order('published_at', { ascending: false })
      .limit(limit)
    if (data?.length) return normalizePosts(data as PostRow[])
  }
  const { data } = await supabase
    .from('posts')
    .select(POST_SELECT)
    .eq('status', 'published')
    .eq('author_id', post.author_id)
    .neq('id', post.id)
    .order('published_at', { ascending: false })
    .limit(limit)
  return normalizePosts(data as PostRow[])
}

/** Author profile by username plus their published posts. */
export async function fetchAuthorPage(username: string): Promise<{ profile: Profile | null; posts: Post[] }> {
  if (!SUPABASE_CONFIGURED || !username) return { profile: null, posts: [] }
  const { data: profile } = await supabase.from('profiles').select('*').eq('username', username).single()
  if (!profile) return { profile: null, posts: [] }
  const { data } = await supabase
    .from('posts')
    .select(POST_SELECT)
    .eq('status', 'published')
    .eq('author_id', profile.id)
    .order('published_at', { ascending: false })
    .limit(50)
  return { profile: profile as Profile, posts: normalizePosts(data as PostRow[]) }
}

/** All categories for topic pills. */
export async function fetchCategories(): Promise<Category[]> {
  if (!SUPABASE_CONFIGURED) return []
  const { data, error } = await supabase.from('categories').select('*').order('name')
  return error ? [] : (data ?? [])
}

/** Topic page data: category and its posts. */
export async function fetchTopicPage(slug: string): Promise<{ category: Category | null; posts: Post[] }> {
  if (!SUPABASE_CONFIGURED || !slug) return { category: null, posts: [] }
  const { data: category } = await supabase.from('categories').select('*').eq('slug', slug).single()
  if (!category) return { category: null, posts: [] }
  const { data } = await supabase
    .from('posts')
    .select(POST_SELECT)
    .eq('status', 'published')
    .eq('category_id', category.id)
    .order('published_at', { ascending: false })
    .limit(50)
  return { category: category as Category, posts: normalizePosts(data as PostRow[]) }
}

export interface SeriesChapter {
  id: string
  title: string
  slug: string
  excerpt: string | null
  reading_time: number | null
  published_at: string | null
  position: number
}

/** Series by slug with its ordered chapters. */
export async function fetchSeriesPage(slug: string): Promise<{ series: Series | null; chapters: SeriesChapter[] }> {
  if (!SUPABASE_CONFIGURED || !slug) return { series: null, chapters: [] }
  const { data: series } = await supabase.from('series').select('*').eq('slug', slug).single()
  if (!series) return { series: null, chapters: [] }
  const { data } = await supabase
    .from('series_posts')
    .select('position, posts(id, title, slug, excerpt, reading_time, published_at, status)')
    .eq('series_id', series.id)
    .order('position', { ascending: true })
  const chapters = ((data ?? []) as unknown as { position: number; posts: SeriesChapter | null }[])
    .filter((r) => r.posts)
    .map((r) => ({ ...(r.posts as SeriesChapter), position: r.position }))
  return { series: series as Series, chapters }
}

/** Featured writers: distinct authors with at least one published post. */
export async function fetchFeaturedWriters(limit = 6): Promise<Profile[]> {
  if (!SUPABASE_CONFIGURED) return []
  const { data, error } = await supabase
    .from('posts')
    .select('profiles!inner(id, username, display_name, avatar_url, bio, website, github_url, linkedin_url, role, verified)')
    .eq('status', 'published')
    .limit(50)
  if (error) return []
  const seen = new Map<string, Profile>()
  for (const row of data ?? []) {
    const p = (row as unknown as { profiles: Profile }).profiles
    if (p && !seen.has(p.id)) seen.set(p.id, p)
  }
  return [...seen.values()]
    .sort((a, b) => (a.username === OWNER_USERNAME ? -1 : b.username === OWNER_USERNAME ? 1 : 0))
    .slice(0, limit)
}

/* ---- Reader social actions ---- */

export async function recordView(postId: string): Promise<void> {
  if (!SUPABASE_CONFIGURED) return
  await supabase.from('post_views').insert({ post_id: postId })
}

export async function fetchLikeState(postId: string, userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('likes')
    .select('user_id')
    .eq('post_id', postId)
    .eq('user_id', userId)
    .maybeSingle()
  return Boolean(data)
}

export async function toggleLike(postId: string, userId: string, liked: boolean): Promise<void> {
  if (liked) {
    await supabase.from('likes').delete().eq('post_id', postId).eq('user_id', userId)
  } else {
    await supabase.from('likes').insert({ post_id: postId, user_id: userId })
  }
}

export async function fetchBookmarkState(postId: string, userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('bookmarks')
    .select('user_id')
    .eq('post_id', postId)
    .eq('user_id', userId)
    .maybeSingle()
  return Boolean(data)
}

export async function toggleBookmark(postId: string, userId: string, marked: boolean): Promise<void> {
  if (marked) {
    await supabase.from('bookmarks').delete().eq('post_id', postId).eq('user_id', userId)
  } else {
    await supabase.from('bookmarks').insert({ post_id: postId, user_id: userId })
  }
}

export async function fetchIsFollowing(followerId: string, followingId: string): Promise<boolean> {
  const { data } = await supabase
    .from('follows')
    .select('follower_id')
    .eq('follower_id', followerId)
    .eq('following_id', followingId)
    .maybeSingle()
  return Boolean(data)
}

export async function toggleFollow(followerId: string, followingId: string, following: boolean): Promise<void> {
  if (following) {
    await supabase.from('follows').delete().eq('follower_id', followerId).eq('following_id', followingId)
  } else {
    await supabase.from('follows').insert({ follower_id: followerId, following_id: followingId })
  }
}

export async function fetchFollowerCount(profileId: string): Promise<number> {
  const { count } = await supabase
    .from('follows')
    .select('*', { count: 'exact', head: true })
    .eq('following_id', profileId)
  return count ?? 0
}

/** Visible comments with author profiles, oldest first. */
export async function fetchComments(postId: string): Promise<Comment[]> {
  if (!SUPABASE_CONFIGURED) return []
  const { data, error } = await supabase
    .from('comments')
    .select('*, profiles(id, username, display_name, avatar_url, verified, role)')
    .eq('post_id', postId)
    .eq('status', 'visible')
    .order('created_at', { ascending: true })
  return error ? [] : (data as Comment[])
}

export async function addComment(postId: string, userId: string, body: string, parentId: string | null): Promise<void> {
  await supabase.from('comments').insert({ post_id: postId, user_id: userId, body, parent_id: parentId })
}

export async function reportContent(
  reporterId: string | null,
  payload: { post_id?: string | null; comment_id?: string | null; reason: string; details?: string },
): Promise<void> {
  await supabase.from('reports').insert({ reporter_id: reporterId, ...payload })
}

export async function subscribeNewsletter(email: string): Promise<string | null> {
  if (!SUPABASE_CONFIGURED) return 'Newsletter is not configured yet.'
  const { error } = await supabase.from('newsletter_subscribers').insert({ email, confirmed: false })
  if (error) {
    if (/duplicate key/i.test(error.message)) return 'Already subscribed.'
    return 'Could not subscribe. Try again.'
  }
  return null
}

/* ---- Reading history ---- */

export async function saveProgress(postId: string, userId: string, progress: number): Promise<void> {
  await supabase
    .from('reading_history')
    .upsert(
      { user_id: userId, post_id: postId, progress, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,post_id' },
    )
}

export async function fetchReadingHistory(userId: string, limit = 10): Promise<ReadingHistory[]> {
  if (!SUPABASE_CONFIGURED) return []
  const { data, error } = await supabase
    .from('reading_history')
    .select('*, posts(id, title, slug, excerpt, reading_time, cover_image_url)')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(limit)
  return error ? [] : (data as ReadingHistory[])
}

/* ---- Contributor + authoring ---- */

export async function fetchMyPosts(userId: string): Promise<Post[]> {
  if (!SUPABASE_CONFIGURED) return []
  const { data, error } = await supabase
    .from('posts')
    .select(POST_SELECT)
    .eq('author_id', userId)
    .order('updated_at', { ascending: false })
    .limit(100)
  return error ? [] : normalizePosts(data as PostRow[])
}

export async function fetchPostForEdit(id: string): Promise<Post | null> {
  if (!SUPABASE_CONFIGURED || !id) return null
  const { data } = await supabase.from('posts').select(POST_SELECT).eq('id', id).single()
  return data ? normalizePost(data as PostRow) : null
}

export interface PostInput {
  title: string
  subtitle: string | null
  slug: string
  excerpt: string | null
  content: unknown
  cover_image_url: string | null
  cover_image_alt: string | null
  post_type: Post['post_type']
  category_id: string | null
  status: Post['status']
  featured?: boolean
  seo_title: string | null
  seo_description: string | null
  reading_time: number
  tag_ids: string[]
  series_id: string | null
  series_position: number | null
  project_name: string | null
  project_url: string | null
}

/** Create or update a post; handles tags, series and project-link joins. */
export async function upsertPost(
  input: PostInput,
  authorId: string,
  postId?: string,
): Promise<{ id: string; error: string | null }> {
  const row = {
    author_id: authorId,
    title: input.title,
    subtitle: input.subtitle,
    slug: input.slug,
    excerpt: input.excerpt,
    content: input.content,
    cover_image_url: input.cover_image_url,
    cover_image_alt: input.cover_image_alt,
    post_type: input.post_type,
    category_id: input.category_id,
    status: input.status,
    featured: input.featured ?? false,
    seo_title: input.seo_title,
    seo_description: input.seo_description,
    reading_time: input.reading_time,
  }
  let id = postId ?? ''
  if (postId) {
    const { error } = await supabase.from('posts').update(row).eq('id', postId)
    if (error) return { id, error: error.message }
  } else {
    const { data, error } = await supabase.from('posts').insert(row).select('id').single()
    if (error) return { id, error: error.message }
    id = (data as { id: string }).id
  }
  await supabase.from('post_tags').delete().eq('post_id', id)
  if (input.tag_ids.length) {
    await supabase.from('post_tags').insert(input.tag_ids.map((t) => ({ post_id: id, tag_id: t })))
  }
  await supabase.from('series_posts').delete().eq('post_id', id)
  if (input.series_id) {
    await supabase
      .from('series_posts')
      .insert({ series_id: input.series_id, post_id: id, position: input.series_position ?? 1 })
  }
  await supabase.from('project_links').delete().eq('post_id', id)
  if (input.project_name) {
    await supabase
      .from('project_links')
      .insert({ post_id: id, project_name: input.project_name, project_url: input.project_url })
  }
  return { id, error: null }
}

export async function submitForReview(postId: string): Promise<string | null> {
  const { error } = await supabase.from('posts').update({ status: 'submitted' }).eq('id', postId)
  return error ? error.message : null
}

export async function deletePost(postId: string): Promise<string | null> {
  const { error } = await supabase.from('posts').delete().eq('id', postId)
  return error ? error.message : null
}

/* ---- Media ---- */

const OK_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']

export async function uploadMedia(
  file: File,
  userId: string,
  onProgress?: (pct: number) => void,
): Promise<{ url: string | null; path: string | null; error: string | null }> {
  if (!SUPABASE_CONFIGURED) return { url: null, path: null, error: 'Storage is not configured yet.' }
  if (!OK_MIME.includes(file.type)) {
    return { url: null, path: null, error: 'Only JPEG, PNG, WebP, GIF or AVIF images are allowed.' }
  }
  if (file.size > 5 * 1024 * 1024) {
    return { url: null, path: null, error: 'Image must be under 5 MB.' }
  }
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '')
  const path = userId + '/' + Date.now() + '-' + Math.random().toString(36).slice(2, 8) + '.' + ext
  onProgress?.(10)
  const { error } = await supabase.storage
    .from('journal-media')
    .upload(path, file, { cacheControl: '3600', upsert: false })
  if (error) return { url: null, path: null, error: error.message }
  onProgress?.(80)
  const { data } = supabase.storage.from('journal-media').getPublicUrl(path)
  await supabase.from('media').insert({
    owner_id: userId,
    storage_path: path,
    public_url: data.publicUrl,
    alt_text: file.name.replace(/\.[a-z0-9]+$/i, ''),
  })
  onProgress?.(100)
  return { url: data.publicUrl, path, error: null }
}

export async function fetchMyMedia(userId: string): Promise<Media[]> {
  if (!SUPABASE_CONFIGURED) return []
  const { data, error } = await supabase
    .from('media')
    .select('*')
    .eq('owner_id', userId)
    .order('created_at', { ascending: false })
    .limit(60)
  return error ? [] : (data ?? [])
}

/* ---- Contributor application ---- */

export async function submitApplication(
  payload: Omit<ContributorApplication, 'id' | 'status' | 'created_at'>,
): Promise<string | null> {
  if (!SUPABASE_CONFIGURED) return 'Applications are not open yet - Supabase is not configured.'
  const { error } = await supabase.from('contributor_applications').insert(payload)
  if (error) {
    if (/duplicate key/i.test(error.message)) return 'An application with that username already exists.'
    return error.message
  }
  return null
}

export async function fetchMyApplication(userId: string): Promise<ContributorApplication | null> {
  if (!SUPABASE_CONFIGURED) return null
  const { data } = await supabase
    .from('contributor_applications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return (data as ContributorApplication) ?? null
}

/* ---- Analytics ---- */

export interface PostAnalyticsRow {
  slug: string
  title: string
  views: number
  uniques: number
  likes: number
  comments: number
  bookmarks: number
}

export async function fetchPostAnalytics(): Promise<PostAnalyticsRow[]> {
  if (!SUPABASE_CONFIGURED) return []
  const { data, error } = await supabase.rpc('post_analytics')
  if (error) return []
  return (data ?? []) as PostAnalyticsRow[]
}

export interface AdminAnalytics {
  totals: {
    posts: number
    published: number
    drafts: number
    review: number
    users: number
    comments: number
    reports: number
    views: number
  }
  traffic: { day: string; views: number }[]
}

export async function fetchAdminAnalytics(): Promise<AdminAnalytics | null> {
  if (!SUPABASE_CONFIGURED) return null
  const [totals, traffic] = await Promise.all([
    supabase.rpc('admin_analytics'),
    supabase.rpc('traffic_trend', { p_days: 14 }),
  ])
  if (totals.error) return null
  return {
    totals: (totals.data ?? {}) as AdminAnalytics['totals'],
    traffic: (traffic.data ?? []) as AdminAnalytics['traffic'],
  }
}

/* ---- Dashboard lists ---- */

export async function fetchMyBookmarks(userId: string): Promise<Post[]> {
  if (!SUPABASE_CONFIGURED) return []
  const { data, error } = await supabase
    .from('bookmarks')
    .select('posts(' + POST_SELECT + ')')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) return []
  return ((data ?? []) as unknown as { posts: PostRow | null }[])
    .map((r) => r.posts)
    .filter((p): p is PostRow => Boolean(p))
    .map(normalizePost)
}

export async function fetchMyLikedPosts(userId: string): Promise<Post[]> {
  if (!SUPABASE_CONFIGURED) return []
  const { data, error } = await supabase
    .from('likes')
    .select('posts(' + POST_SELECT + ')')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) return []
  return ((data ?? []) as unknown as { posts: PostRow | null }[])
    .map((r) => r.posts)
    .filter((p): p is PostRow => Boolean(p))
    .map(normalizePost)
}

export async function fetchMyFollowing(userId: string): Promise<Profile[]> {
  if (!SUPABASE_CONFIGURED) return []
  const { data, error } = await supabase
    .from('follows')
    .select('profiles:following_id(id, username, display_name, avatar_url, bio, role, verified)')
    .eq('follower_id', userId)
  if (error) return []
  return ((data ?? []) as unknown as { profiles: Profile }[]).map((r) => r.profiles).filter(Boolean)
}

export async function updateProfile(userId: string, patch: Partial<Profile>): Promise<string | null> {
  const { error } = await supabase.from('profiles').update(patch).eq('id', userId)
  return error ? error.message : null
}
