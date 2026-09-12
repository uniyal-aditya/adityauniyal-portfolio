import { Link, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Seo } from '@/lib/seo'
import { useAuth } from '@/hooks/useAuth'
import { fetchAuthorPage, fetchFollowerCount, fetchFollowers, fetchFollowing, fetchFollowingCount, fetchIsFollowing, toggleFollow } from '@/lib/journal-api'
import { SUPABASE_CONFIGURED, OWNER_USERNAME } from '@/lib/supabase'
import { Avatar, VerifiedBadge, PostCard, EmptyState, Skeletons } from '@/components/journal/bits'
import { useReveal } from '@/hooks/useReveal'

export default function AuthorPage() {
  useReveal()
  const { username = '' } = useParams()
  const { user, profile } = useAuth()
  const qc = useQueryClient()
  const [followBusy, setFollowBusy] = useState(false)
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
  const { data: followerList } = useQuery({
    queryKey: ['follower-list', data?.profile?.id],
    queryFn: () => fetchFollowers(data!.profile!.id),
    enabled: Boolean(data?.profile),
  })
  const { data: followingCount } = useQuery({
    queryKey: ['following-count', data?.profile?.id],
    queryFn: () => fetchFollowingCount(data!.profile!.id),
    enabled: Boolean(data?.profile),
  })
  const { data: followingList } = useQuery({
    queryKey: ['following-list', data?.profile?.id],
    queryFn: () => fetchFollowing(data!.profile!.id),
    enabled: Boolean(data?.profile),
  })
  const { data: followingThis } = useQuery({
    queryKey: ['is-following', user?.id, data?.profile?.id],
    queryFn: () => fetchIsFollowing(user!.id, data!.profile!.id),
    enabled: Boolean(user && data?.profile) && !isMe,
  })

  async function onFollowClick() {
    if (!user || !data?.profile) return
    setFollowBusy(true)
    try {
      await toggleFollow(user.id, data.profile.id, Boolean(followingThis))
      void qc.invalidateQueries({ queryKey: ['is-following', user.id, data.profile.id] })
      void qc.invalidateQueries({ queryKey: ['followers', data.profile.id] })
    } finally {
      setFollowBusy(false)
    }
  }

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
            <span>{followingCount ?? 0} following</span>
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
          {!isMe && (
            <div style={{ marginTop: 18 }}>
              {user ? (
                <button
                  className={followingThis ? 'btn-ghost-line btn-small' : 'btn-lime btn-small'}
                  disabled={followBusy}
                  onClick={() => void onFollowClick()}
                  aria-pressed={Boolean(followingThis)}
                >
                  {followingThis ? 'FOLLOWING \u2713 - CLICK TO UNFOLLOW' : 'FOLLOW AUTHOR +'}
                </button>
              ) : (
                <Link to="/blog/login" className="btn-ghost-line btn-small" title="Sign in to follow">
                  SIGN IN TO FOLLOW
                </Link>
              )}
            </div>
          )}
        </div>
      </header>
      <section>
        <div className="container">
          {(followerList ?? []).length > 0 && (
            <>
              <div className="section-label reveal">Followed by</div>
              <div className="writers-grid reveal d1" style={{ marginBottom: 72 }}>
                {followerList!.map((f) => (
                  <Link key={f.id} to={'/blog/author/' + f.username} className="writer-card">
                    <Avatar profile={f} size={56} />
                    <h4>{f.display_name || f.username}</h4>
                    <div className="meta">{f.role.replace('_', ' ')}{f.verified ? ' · verified' : ''}</div>
                  </Link>
                ))}
              </div>
            </>
          )}
          {(followingList ?? []).length > 0 && (
            <>
              <div className="section-label reveal">Following</div>
              <div className="writers-grid reveal d1" style={{ marginBottom: 72 }}>
                {followingList!.map((f) => (
                  <Link key={f.id} to={'/blog/author/' + f.username} className="writer-card">
                    <Avatar profile={f} size={56} />
                    <h4>{f.display_name || f.username}</h4>
                    <div className="meta">{f.role.replace('_', ' ')}{f.verified ? ' · verified' : ''}</div>
                  </Link>
                ))}
              </div>
            </>
          )}
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
