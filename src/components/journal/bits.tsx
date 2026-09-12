import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { fetchFollowerCount } from '@/lib/journal-api'
import type { Post, Profile, Tag } from '@/lib/types'
import { fmtDate, fmtNum } from '@/lib/sanitize'
import { useReveal } from '@/hooks/useReveal'

/** Avatar with initials fallback. */
export function Avatar({ profile, size = 22 }: { profile?: Profile | null; size?: number }) {
  const name = profile?.display_name || profile?.username || '?'
  if (profile?.avatar_url) {
    return (
      <img
        src={profile.avatar_url}
        alt={name}
        width={size}
        height={size}
        loading="lazy"
        style={{ width: size, height: size }}
      />
    )
  }
  return (
    <span className="ac-fallback" style={{ width: size, height: size }}>
      {name.trim().charAt(0).toUpperCase()}
    </span>
  )
}

export function VerifiedBadge() {
  return (
    <span className="badge-verified" title="Verified author" aria-label="Verified author">
      &#10003;
    </span>
  )
}

export function CatChip({ name, slug }: { name?: string | null; slug?: string | null }) {
  if (!name) return null
  return (
    <Link className="cat-chip" to={'/blog/topic/' + (slug ?? '')}>
      {name}
    </Link>
  )
}

export function TypeChip({ type }: { type?: string | null }) {
  if (!type) return null
  return <span className="type-chip">{type.replace('_', ' ')}</span>
}

export function AuthorChip({ post }: { post: Post }) {
  const p = post.profiles ?? post.author
  if (!p) return <span className="author-chip">Unknown</span>
  return (
    <Link className="author-chip" to={'/blog/author/' + (p.username ?? '')}>
      <Avatar profile={p} />
      <span>{p.display_name || p.username}</span>
      {p.verified && <VerifiedBadge />}
    </Link>
  )
}

export function Meta({ post, showViews }: { post: Post; showViews?: boolean }) {
  return (
    <div className="meta">
      <AuthorChip post={post} />
      <span className="dot-sep">&middot;</span>
      <span>{fmtDate(post.published_at || post.created_at)}</span>
      <span className="dot-sep">&middot;</span>
      <span>{post.reading_time || 1} min read</span>
      {showViews && (
        <>
          <span className="dot-sep">&middot;</span>
          <span>{fmtNum(post.view_count)} views</span>
        </>
      )}
    </div>
  )
}

/** Cover media with AU_ fallback. */
export function CoverMedia({ post, className = 'pc-media' }: { post: Post; className?: string }) {
  if (post.cover_image_url) {
    return (
      <Link className={className} to={'/blog/post/' + post.slug} aria-hidden="true" tabIndex={-1}>
        <img src={post.cover_image_url} alt={post.cover_image_alt || post.title} loading="lazy" />
      </Link>
    )
  }
  return (
    <Link className={className} to={'/blog/post/' + post.slug} aria-hidden="true" tabIndex={-1}>
      <span className="fm-fallback">AU_</span>
    </Link>
  )
}

/** Grid card. */
export function PostCard({ post }: { post: Post }) {
  useReveal()
  const cat = post.categories
  return (
    <article className="post-card reveal">
      <CoverMedia post={post} />
      <div className="pc-body">
        <div className="meta">
          <CatChip name={cat?.name} slug={cat?.slug} />
          <TypeChip type={post.post_type} />
        </div>
        <h3>
          <Link to={'/blog/post/' + post.slug}>{post.title}</Link>
        </h3>
        <div className="pc-excerpt">{post.excerpt}</div>
        <div className="pc-foot meta">
          <AuthorChip post={post} />
          <span className="dot-sep">&middot;</span>
          <span>{fmtDate(post.published_at || post.created_at)}</span>
          <span className="dot-sep">&middot;</span>
          <span>{post.reading_time || 1} min</span>
        </div>
      </div>
    </article>
  )
}

/** Editorial numbered row. */
export function PostRow({ post, num, viewsLikes }: { post: Post; num?: number; viewsLikes?: boolean }) {
  useReveal()
  const cat = post.categories
  return (
    <article className="post-row reveal">
      <div className="pr-num">{String(num ?? 0).padStart(2, '0')}</div>
      <div>
        <div className="meta" style={{ marginBottom: 8 }}>
          <CatChip name={cat?.name} slug={cat?.slug} />
          <TypeChip type={post.post_type} />
        </div>
        <h3>
          <Link to={'/blog/post/' + post.slug}>{post.title}</Link>
        </h3>
        <div className="pr-desc">{post.excerpt}</div>
        <div className="meta" style={{ marginTop: 10 }}>
          <AuthorChip post={post} />
          <span className="dot-sep">&middot;</span>
          <span>{fmtDate(post.published_at || post.created_at)}</span>
          <span className="dot-sep">&middot;</span>
          <span>{post.reading_time || 1} min read</span>
        </div>
      </div>
      {viewsLikes && (
        <div className="pr-side meta">
          <span>{fmtNum(post.view_count)} views</span>
          <span>{fmtNum(post.like_count)} likes</span>
        </div>
      )}
    </article>
  )
}

/** Builder cell for project journal links. */
export function BuilderCell({ post, num }: { post: Post; num: number }) {
  return (
    <div className="builder-cell">
      <div className="bc-num">{String(num).padStart(2, '0')}</div>
      <h4>
        <Link to={'/blog/post/' + post.slug}>{post.title}</Link>
      </h4>
      <div className="bc-meta meta">
        <span>{fmtDate(post.published_at)}</span>
        <span className="dot-sep">&middot;</span>
        <span>{post.reading_time || 1} min</span>
      </div>
    </div>
  )
}

/** Writer card with live follower count. */
export function WriterCard({ profile, postCount }: { profile: Profile; postCount?: number }) {
  useReveal()
  const { data: followers } = useQuery({
    queryKey: ['followers', profile.id],
    queryFn: () => fetchFollowerCount(profile.id),
  })
  const role =
    profile.role === 'owner'
      ? 'OWNER'
      : profile.role === 'verified_author'
        ? 'VERIFIED AUTHOR'
        : profile.role === 'admin'
          ? 'EDITOR'
          : profile.role === 'contributor'
            ? 'CONTRIBUTOR'
            : 'READER'
  return (
    <Link className="writer-card reveal" to={'/blog/author/' + profile.username}>
      <Avatar profile={profile} size={64} />
      <h4>
        {profile.display_name || profile.username}
        {profile.verified && <VerifiedBadge />}
      </h4>
      <div className="w-role">{role}</div>
      {profile.bio && <div className="w-bio">{profile.bio}</div>}
      <div className="meta">
        <span>{postCount ?? '--'} articles</span>
        <span className="dot-sep">&middot;</span>
        <span>{followers ?? 0} followers</span>
      </div>
    </Link>
  )
}

/** Never-fake empty state. */
export function EmptyState({ title = 'No data yet.', note, compact }: { title?: string; note?: string; compact?: boolean }) {
  return (
    <div className={'empty-state' + (compact ? ' compact' : '')}>
      <div className="es-glyph">[ ]</div>
      <div className="es-title">{title}</div>
      {note && <div className="es-note">{note}</div>}
    </div>
  )
}

export function Skeletons({ n = 3 }: { n?: number }) {
  return (
    <div className="post-grid">
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className="skeleton skel-card" />
      ))}
    </div>
  )
}

export function TagList({ tags }: { tags?: Tag[] | null }) {
  if (!tags?.length) return null
  return (
    <div className="post-tags">
      {tags.map((t) => (
        <Link key={t.id} className="tag" to={'/blog/search?q=' + encodeURIComponent(t.name)}>
          {t.name}
        </Link>
      ))}
    </div>
  )
}
