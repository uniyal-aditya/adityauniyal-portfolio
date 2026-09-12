import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Seo, articleJsonLd } from '@/lib/seo'
import { ArticleContent } from '@/lib/content'
import {
  fetchPostBySlug,
  fetchRelatedPosts,
  fetchComments,
  addComment,
  recordView,
  fetchLikeState,
  toggleLike,
  fetchBookmarkState,
  toggleBookmark,
  fetchIsFollowing,
  toggleFollow,
  saveProgress,
  reportContent,
} from '@/lib/journal-api'
import { SUPABASE_CONFIGURED } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/useToast'
import { Avatar, VerifiedBadge, PostCard, EmptyState } from '@/components/journal/bits'
import { fmtDate, fmtNum, timeAgo, mdToText, readingTime } from '@/lib/sanitize'
import type { Comment } from '@/lib/types'

function useReadingProgress() {
  const [pct, setPct] = useState(0)
  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement
      const max = h.scrollHeight - h.clientHeight
      setPct(max > 0 ? Math.min(100, Math.round((h.scrollTop / max) * 100)) : 0)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  return pct
}

function CommentItem({ c, postId, all }: { c: Comment; postId: string; all: Comment[] }) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [replyOpen, setReplyOpen] = useState(false)
  const [body, setBody] = useState('')
  const replies = all.filter((x) => x.parent_id === c.id)
  async function sendReply() {
    if (!user || !body.trim()) return
    await addComment(postId, user.id, body.trim(), c.id)
    setBody('')
    setReplyOpen(false)
    toast('Reply posted.')
  }
  return (
    <div className="comment">
      <div className="comment-head">
        <Avatar profile={c.profiles} />
        <strong>{c.profiles?.display_name || c.profiles?.username || 'reader'}</strong>
        {c.profiles?.verified && <VerifiedBadge />}
        <span className="dot-sep">&middot;</span>
        <span className="meta">{timeAgo(c.created_at)}</span>
      </div>
      <p className="comment-body">{c.body}</p>
      <div className="comment-actions meta">
        {user && (
          <button onClick={() => setReplyOpen((v) => !v)}>{replyOpen ? 'Cancel' : 'Reply'}</button>
        )}
        <button
          onClick={() => {
            void reportContent(user?.id ?? null, { comment_id: c.id, reason: 'inappropriate' })
            toast('Reported. Thank you.')
          }}
        >
          Report
        </button>
      </div>
      {replyOpen && user && (
        <div className="reply-box">
          <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write a reply..." rows={2} />
          <button className="btn-lime btn-small" onClick={() => void sendReply()} disabled={!body.trim()}>
            Reply
          </button>
        </div>
      )}
      {replies.length > 0 && (
        <div className="comment-replies">
          {replies.map((r) => (
            <CommentItem key={r.id} c={r} postId={postId} all={all.filter((x) => x.parent_id !== c.id)} />
          ))}
        </div>
      )}
    </div>
  )
}

export default function PostPage() {
  const { slug = '' } = useParams()
  const { user } = useAuth()
  const { toast } = useToast()
  const qc = useQueryClient()
  const pct = useReadingProgress()
  const lastSaved = useRef(0)

  const { data: post, isLoading } = useQuery({
    queryKey: ['post', slug],
    queryFn: () => fetchPostBySlug(slug),
    enabled: SUPABASE_CONFIGURED && Boolean(slug),
  })

  const { data: related } = useQuery({
    queryKey: ['related', post?.id],
    queryFn: () => fetchRelatedPosts(post!),
    enabled: Boolean(post),
  })

  const { data: comments } = useQuery({
    queryKey: ['comments', post?.id],
    queryFn: () => fetchComments(post!.id),
    enabled: Boolean(post),
  })

  const { data: liked } = useQuery({
    queryKey: ['liked', post?.id, user?.id],
    queryFn: () => fetchLikeState(post!.id, user!.id),
    enabled: Boolean(post && user),
  })
  const { data: marked } = useQuery({
    queryKey: ['marked', post?.id, user?.id],
    queryFn: () => fetchBookmarkState(post!.id, user!.id),
    enabled: Boolean(post && user),
  })
  const { data: following } = useQuery({
    queryKey: ['following-author', post?.profiles?.id, user?.id],
    queryFn: () => fetchIsFollowing(user!.id, post!.profiles!.id),
    enabled: Boolean(post?.profiles?.id && user),
  })

  // View + reading history
  useEffect(() => {
    if (!post || !SUPABASE_CONFIGURED) return
    void recordView(post.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- record once per loaded post, not on every object identity change
  }, [post?.id])

  useEffect(() => {
    if (!post || !user || pct < 10) return
    if (pct - lastSaved.current >= 10) {
      lastSaved.current = pct
      void saveProgress(post.id, user.id, pct)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- progress saving is keyed on scroll position and ids
  }, [pct, post?.id, user?.id])

  const toc = useMemo(() => {
    if (!post) return [] as { id: string; text: string }[]
    const c = post.content
    if (c && typeof c === 'object' && 'content' in (c as Record<string, unknown>)) {
      const out: { id: string; text: string }[] = []
      const walk = (n: { type?: string; content?: { text?: string; content?: unknown }[]; attrs?: { level?: number } }) => {
        if (n.type === 'heading') {
          const text = (n.content ?? []).map((x) => x.text ?? '').join('')
          out.push({ id: text.toLowerCase().replace(/[^a-z0-9]+/g, '-'), text })
        }
        if (n.content) for (const ch of n.content as never[]) walk(ch as never)
      }
      walk(c as never)
      return out
    }
    return []
  }, [post])

  const series = post?.series_posts?.[0]?.series
  const seriesPosition = post?.series_posts?.[0]?.position

  const [commentBody, setCommentBody] = useState('')

  async function sendComment() {
    if (!user || !post || !commentBody.trim()) return
    await addComment(post.id, user.id, commentBody.trim(), null)
    setCommentBody('')
    toast('Comment posted.')
    void qc.invalidateQueries({ queryKey: ['comments', post.id] })
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href)
      toast('Link copied.')
    } catch {
      toast('Could not copy.', true)
    }
  }

  if (!SUPABASE_CONFIGURED) {
    return (
      <div className="container" style={{ paddingTop: 120 }}>
        <EmptyState title="The journal is not connected yet." note="Supabase environment variables are missing, so articles cannot load." />
        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <Link to="/blog" className="btn-ghost-line">Back to the journal</Link>
        </div>
      </div>
    )
  }
  if (isLoading) {
    return (
      <div className="container" style={{ paddingTop: 120 }}>
        <div className="skeleton skel-card" style={{ height: 300 }} />
      </div>
    )
  }
  if (!post) {
    return (
      <div className="container" style={{ paddingTop: 120 }}>
        <EmptyState title="Article not found." note="It may be unpublished or the link is wrong." />
        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <Link to="/blog" className="btn-ghost-line">Back to the journal</Link>
        </div>
      </div>
    )
  }

  const words = typeof post.content === 'string' ? mdToText(post.content) : post.excerpt || ''
  const minutes = post.reading_time ?? readingTime(words)
  const projectLink = post.project_links?.[0]

  return (
    <article className="post-page">
      <Seo
        title={post.seo_title || post.title + ' - AU_ / JOURNAL'}
        description={post.seo_description || post.excerpt || undefined}
        path={'/blog/post/' + post.slug}
        image={post.cover_image_url}
        type="article"
        jsonLd={articleJsonLd({
          title: post.title,
          description: post.excerpt || '',
          path: '/blog/post/' + post.slug,
          image: post.cover_image_url,
          authorName: post.profiles?.display_name || post.profiles?.username || 'Aditya Uniyal',
          authorUrl: window.location.origin + '/blog/author/' + (post.profiles?.username ?? ''),
          publishedIso: post.published_at,
          modifiedIso: post.updated_at,
        })}
      />
      <div className="reading-progress" style={{ width: pct + '%' }} aria-hidden="true" />
      <div className="container post-layout">
        <div className="post-main">
          <div className="post-meta-top meta">
            {post.categories && (
              <Link className="cat-chip" to={'/blog/topic/' + post.categories.slug}>{post.categories.name}</Link>
            )}
            {post.post_type && <span className="type-chip">{post.post_type.replace('_', ' ')}</span>}
          </div>
          <h1 className="post-title">{post.title}</h1>
          {post.subtitle && <div className="post-subtitle">{post.subtitle}</div>}
          <div className="post-byline meta">
            <Avatar profile={post.profiles} size={34} />
            <div>
              <Link to={'/blog/author/' + (post.profiles?.username ?? '')} className="pb-name">
                {post.profiles?.display_name || post.profiles?.username}
                {post.profiles?.verified && <VerifiedBadge />}
              </Link>
              <div className="pb-sub">
                {fmtDate(post.published_at)} &middot; {minutes} min read &middot; {fmtNum(post.view_count)} views
                {post.updated_at && post.updated_at !== post.published_at && <span> &middot; updated {fmtDate(post.updated_at)}</span>}
              </div>
            </div>
          </div>
          {post.cover_image_url && (
            <figure className="post-cover">
              <img src={post.cover_image_url} alt={post.cover_image_alt || post.title} />
              {post.cover_image_alt && <figcaption>{post.cover_image_alt}</figcaption>}
            </figure>
          )}

          <div className="post-actions meta">
            <button
              onClick={async () => {
                if (!user) return toast('Sign in to like articles.', true)
                await toggleLike(post.id, user.id, Boolean(liked))
                void qc.invalidateQueries({ queryKey: ['liked', post.id, user.id] })
              }}
              className={liked ? 'on' : ''}
              aria-pressed={Boolean(liked)}
            >
              &#9825; {fmtNum(post.like_count)} {liked ? 'liked' : 'like'}
            </button>
            <button
              onClick={async () => {
                if (!user) return toast('Sign in to bookmark articles.', true)
                await toggleBookmark(post.id, user.id, Boolean(marked))
                void qc.invalidateQueries({ queryKey: ['marked', post.id, user.id] })
              }}
              className={marked ? 'on' : ''}
              aria-pressed={Boolean(marked)}
            >
              &#9825; {marked ? 'bookmarked' : 'bookmark'}
            </button>
            <button onClick={() => void copyLink()}>copy link</button>
            <button
              onClick={() => {
                const url = window.location.href
                if (navigator.share) void navigator.share({ title: post.title, url }).catch(() => undefined)
                else void copyLink()
              }}
            >
              share
            </button>

            {post.profiles && user && user.id !== post.profiles.id && (
              <button
                onClick={async () => {
                  await toggleFollow(user.id, post.profiles!.id, Boolean(following))
                  void qc.invalidateQueries({ queryKey: ['following-author', post.profiles!.id, user.id] })
                  toast(following ? 'Unfollowed.' : 'Following.')
                }}
                className={following ? 'on' : ''}
              >
                {following ? 'following' : 'follow author'}
              </button>
            )}
          </div>

          <ArticleContent content={post.content} />

          {post.profiles && (
            <aside className="author-card">
              <Avatar profile={post.profiles} size={56} />
              <div>
                <div className="ac-name">
                  Written by {post.profiles.display_name || post.profiles.username}
                  {post.profiles.verified && <VerifiedBadge />}
                </div>
                {post.profiles.bio && <p className="ac-bio">{post.profiles.bio}</p>}
                <Link className="btn-ghost-line btn-small" to={'/blog/author/' + post.profiles.username}>
                  More from this author &rarr;
                </Link>
              </div>
            </aside>
          )}

          <section className="comments-section">
            <h3 className="comments-title">Discussion ({comments?.length ?? 0})</h3>
            {user ? (
              <div className="comment-compose">
                <Avatar profile={undefined} size={32} />
                <textarea
                  value={commentBody}
                  onChange={(e) => setCommentBody(e.target.value)}
                  placeholder="Add to the discussion..."
                  rows={3}
                />
                <button className="btn-lime btn-small" onClick={() => void sendComment()} disabled={!commentBody.trim()}>
                  Post
                </button>
              </div>
            ) : (
              <p className="meta" style={{ marginBottom: 20 }}>
                <Link to="/blog/login" className="text-link">Sign in</Link> to join the discussion.
              </p>
            )}
            <div className="comments-list">
              {(comments ?? []).filter((c) => !c.parent_id).map((c) => (
                <CommentItem key={c.id} c={c} postId={post.id} all={comments ?? []} />
              ))}
              {comments && comments.filter((c) => !c.parent_id).length === 0 && (
                <EmptyState compact title="No comments yet." note="Be the first to say something." />
              )}
            </div>
          </section>
        </div>

        <aside className="post-aside">
          {toc.length > 1 && (
            <nav className="toc" aria-label="Table of contents">
              <div className="toc-label">On this page</div>
              {toc.map((t) => (
                <a key={t.id} href={'#' + t.id} className="toc-link">
                  {t.text}
                </a>
              ))}
            </nav>
          )}
          {series && (
            <div className="aside-box">
              <div className="toc-label">Series</div>
              <Link to={'/blog/series/' + series.slug} className="series-link">{series.title}</Link>
              {seriesPosition && <div className="meta">Chapter {seriesPosition}</div>}
            </div>
          )}
          {projectLink && (
            <div className="aside-box related-project">
              <div className="toc-label">Related project</div>
              <div className="rp-name">{projectLink.project_name}</div>
              {projectLink.project_url && (
                <a href={projectLink.project_url} target="_blank" rel="noopener noreferrer" className="btn-lime btn-small">
                  View project &rarr;
                </a>
              )}
            </div>
          )}
        </aside>
      </div>

      {related && related.length > 0 && (
        <section style={{ borderTop: '1px solid var(--line)', paddingTop: 60 }}>
          <div className="container">
            <div className="section-label">Related articles</div>
            <div className="post-grid">
              {related.map((p) => (
                <PostCard key={p.id} post={p} />
              ))}
            </div>
          </div>
        </section>
      )}
    </article>
  )
}
