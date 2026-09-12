import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Seo } from '@/lib/seo'
import { useAuth } from '@/hooks/useAuth'
import { fetchAuthorPage, fetchFollowerCount } from '@/lib/journal-api'
import { SUPABASE_CONFIGURED, OWNER_USERNAME } from '@/lib/supabase'
import { Avatar, VerifiedBadge, PostCard, EmptyState, Skeletons } from '@/components/journal/bits'
import { useReveal } from '@/hooks/useReveal'

export default function AuthorPage() {
  useReveal()
  const { username = '' } = useParams()
  const { user, profile } = useAuth()
  const isMe = Boolean(user && profile?.username === username)
  const enabled = SUPABASE_CONFIGURED && Boolean(username)
  const { data, isLoading } = useQuery({
    queryKey: ['author', username],
    queryFn: () => fetchAuthorPage(username),
    enabled,
  })
  const { data: followers } = useQuery({
    queryKey: ['followers', data?.profile?.id],
    queryFn: () => fetchFollowerCount(data!.profile!.id),
    enabled: Boolean(data?.profile),
  })

  if (!enabled) {
    return <div className="container" style={{ paddingTop: 120 }}><EmptyState note="The journal backend is not connected yet." /></div>
  }
  if (isLoading) return <Skeletons n={3} />
  if (!data?.profile) {
    return (
      <div className="container" style={{ paddingTop: 120 }}>
        <EmptyState title="Author not found." />
        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <Link to="/blog" className="btn-ghost-line">Back to the journal</Link>
        </div>
      </div>
    )
  }
  const p = data.profile
  const isOwner = p.username === OWNER_USERNAME
  return (
    <div>
      <Seo
        title={(p.display_name || p.username) + ' - AU_ / JOURNAL'}
        description={p.bio || 'Author on AU_ / JOURNAL'}
        path={'/blog/author/' + p.username}
        image={p.avatar_url}
      />
      <header className="author-hero">
        <div className="container">
          <Avatar profile={p} size={96} />
          <h1>
            {p.display_name || p.username}
            {p.verified && <VerifiedBadge />}
          </h1>
          {isOwner && <div className="meta" style={{ color: 'var(--lime)' }}>OWNER - ADITYA UNIYAL</div>}
          {!isOwner && p.role !== 'reader' && <div className="meta" style={{ color: 'var(--lime)' }}>{p.role.replace('_', ' ').toUpperCase()}</div>}
          {p.bio && <p className="author-bio">{p.bio}</p>}
          <div className="author-stats meta">
            <span>{followers ?? 0} followers</span>
            <span className="dot-sep">&middot;</span>
            <span>{data.posts.length} articles</span>
          </div>
          <div className="author-socials meta">
            {p.website && <a href={p.website} target="_blank" rel="noopener noreferrer">website &#8599;</a>}
            {p.github_url && <a href={p.github_url} target="_blank" rel="noopener noreferrer">github &#8599;</a>}
            {p.linkedin_url && <a href={p.linkedin_url} target="_blank" rel="noopener noreferrer">linkedin &#8599;</a>}
          </div>
          {isMe && (
            <div style={{ marginTop: 18 }}>
              <Link to="/blog/dashboard?tab=profile" className="btn-ghost-line btn-small">Edit profile &rarr;</Link>
            </div>
          )}
        </div>
      </header>
      <section>
        <div className="container">
          <div className="section-label reveal">Latest articles</div>
          {data.posts.length === 0 ? (
            <EmptyState note="No published articles yet." />
          ) : (
            <div className="post-grid reveal d1">
              {data.posts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
