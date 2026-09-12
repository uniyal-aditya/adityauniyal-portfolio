import { useState, useRef } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Seo } from '@/lib/seo'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/useToast'
import {
  fetchMyBookmarks,
  fetchMyLikedPosts,
  fetchMyFollowing,
  fetchReadingHistory,
  fetchMyPosts,
  fetchMyApplication,
  updateProfile,
  uploadMedia,
} from '@/lib/journal-api'
import { slugify } from '@/lib/sanitize'
import { Avatar, EmptyState, Skeletons } from '@/components/journal/bits'
import { fmtNum, fmtDate } from '@/lib/sanitize'
import type { Post } from '@/lib/types'

const STATUS_LABEL: Record<string, string> = {
  draft: 'DRAFT',
  submitted: 'SUBMITTED',
  review: 'IN REVIEW',
  approved: 'APPROVED',
  published: 'PUBLISHED',
  rejected: 'REJECTED',
  archived: 'ARCHIVED',
}

function PostListMini({ posts, empty }: { posts: Post[]; empty: string }) {
  if (!posts.length) return <EmptyState compact title={empty} />
  return (
    <div className="mini-list">
      {posts.map((p) => (
        <Link key={p.id} to={'/blog/post/' + p.slug} className="mini-row">
          <div>
            <div style={{ fontWeight: 500 }}>{p.title}</div>
            <div className="meta">{fmtDate(p.published_at || p.created_at)} &middot; {p.reading_time || 1} min</div>
          </div>
          <span className="meta">{fmtNum(p.view_count)} views</span>
        </Link>
      ))}
    </div>
  )
}

export default function Dashboard() {
  const { user, profile, loading, configured, isAdmin, refreshProfile } = useAuth()
  const { toast } = useToast()
  const qc = useQueryClient()
  const [params, setParams] = useSearchParams()
  const tabParam = params.get('tab')
  const [tab, setTabState] = useState<'overview' | 'bookmarks' | 'likes' | 'following' | 'history' | 'articles' | 'profile'>(
    tabParam === 'profile' ? 'profile' : 'overview',
  )
  const setTab = (t: typeof tab) => {
    setTabState(t)
    if (t === 'profile') params.set('tab', 'profile')
    else params.delete('tab')
    setParams(params, { replace: true })
  }
  const avatarRef = useRef<HTMLInputElement>(null)
  const uid = user?.id

  const { data: bookmarks } = useQuery({ queryKey: ['my-bookmarks', uid ?? ""], queryFn: () => fetchMyBookmarks(uid!), enabled: tab === 'bookmarks' })
  const { data: likes } = useQuery({ queryKey: ['my-likes', uid ?? ""], queryFn: () => fetchMyLikedPosts(uid!), enabled: tab === 'likes' })
  const { data: following } = useQuery({ queryKey: ['my-following', uid ?? ""], queryFn: () => fetchMyFollowing(uid!), enabled: tab === 'following' })
  const { data: history } = useQuery({ queryKey: ['reading-history', uid ?? ""], queryFn: () => fetchReadingHistory(uid!, 12), enabled: tab === 'history' || tab === 'overview' })
  const { data: myPosts } = useQuery({ queryKey: ['my-posts', uid ?? ""], queryFn: () => fetchMyPosts(uid!), enabled: tab === 'articles' || tab === 'overview' })
  const { data: application } = useQuery({ queryKey: ['my-application', uid ?? ""], queryFn: () => fetchMyApplication(uid!), enabled: tab === 'articles' })

  if (loading) return <div className="container" style={{ paddingTop: 140 }}><span className="au-loader">AU_</span></div>
  if (!configured) {
    return (
      <div className="container" style={{ paddingTop: 140 }}>
        <EmptyState title="The dashboard needs Supabase." note="Create a free project (supabase.com/dashboard), run the supabase/*.sql files, then add VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY to .env.local and restart the dev server. Full steps: readme.md → Setup." />
      </div>
    )
  }
  if (!user) return <Navigate to="/blog/login" replace />

  const TABS: [typeof tab, string][] = [
    ['overview', 'Overview'],
    ['bookmarks', 'Bookmarks'],
    ['likes', 'Likes'],
    ['following', 'Following'],
    ['history', 'History'],
    ['articles', 'My articles'],
    ['profile', 'Profile'],
  ]

  return (
    <div>
      <Seo title="Dashboard - AU_ / JOURNAL" path="/blog/dashboard" noindex />
      <div className="container" style={{ paddingTop: 48 }}>
        <div className="dash-head">
          <div>
            <div className="pt-label">Your space</div>
            <h1 style={{ fontFamily: 'var(--f-display)', fontSize: 'clamp(2.4rem,6vw,4rem)', lineHeight: 1 }}>
              {profile?.display_name || 'Reader'}<span style={{ color: 'var(--lime)' }}>_</span>
            </h1>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {(profile?.role === 'contributor' || profile?.role === 'verified_author' || isAdmin) && (
              <Link to="/blog/dashboard/editor" className="btn-lime">Write a new article &rarr;</Link>
            )}
            {isAdmin && <Link to="/blog/admin" className="btn-ghost-line">Admin console</Link>}
          </div>
        </div>

        <nav className="dash-tabs meta" role="tablist">
          {TABS.map(([k, label]) => (
            <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'active' : ''} onClick={() => setTab(k)}>
              {label}
            </button>
          ))}
        </nav>

        <div style={{ padding: '36px 0 80px' }}>
          {tab === 'overview' && (
            <div className="dash-grid">
              <div className="dash-card">
                <div className="toc-label">Continue reading</div>
                {(history ?? []).filter((h) => h.posts && h.progress > 2 && h.progress < 90).slice(0, 3).map((h) => (
                  <Link key={h.post_id} to={'/blog/post/' + (h.posts as Post).slug} className="mini-row">
                    <div>
                      <div style={{ fontWeight: 500 }}>{(h.posts as Post).title}</div>
                      <div className="sp-bar" style={{ marginTop: 8 }}><div style={{ width: h.progress + '%' }} /></div>
                    </div>
                    <span className="meta">{h.progress}%</span>
                  </Link>
                ))}
                {!(history ?? []).some((h) => h.posts && h.progress > 2 && h.progress < 90) && <EmptyState compact title="Nothing in progress." note="Articles you start reading appear here." />}
              </div>
              <div className="dash-card">
                <div className="toc-label">Your articles</div>
                {(myPosts ?? []).slice(0, 5).map((p) => (
                  <Link key={p.id} to={'/blog/dashboard/editor?id=' + p.id} className="mini-row">
                    <div>
                      <div style={{ fontWeight: 500 }}>{p.title}</div>
                      <div className="meta">{STATUS_LABEL[p.status] ?? p.status}</div>
                    </div>
                    <span className="meta">{fmtNum(p.view_count)} views</span>
                  </Link>
                ))}
                {!(myPosts ?? []).length && <EmptyState compact title="No articles yet." note="Apply to become a contributor to start writing." />}
              </div>
            </div>
          )}

          {tab === 'bookmarks' && (bookmarks ? <PostListMini posts={bookmarks} empty="No bookmarks yet." /> : <Skeletons n={2} />)}
          {tab === 'likes' && (likes ? <PostListMini posts={likes} empty="No likes yet." /> : <Skeletons n={2} />)}

          {tab === 'following' && (
            following && following.length ? (
              <div className="writers-grid">
                {following.map((f) => (
                  <Link key={f.id} to={'/blog/author/' + f.username} className="writer-card">
                    <Avatar profile={f} size={56} />
                    <h4>{f.display_name || f.username}</h4>
                    <div className="meta">{f.role.replace('_', ' ')}</div>
                  </Link>
                ))}
              </div>
            ) : (
              <EmptyState title="Not following anyone yet." note="Follow authors from their articles." />
            )
          )}

          {tab === 'history' && (
            (history ?? []).length ? (
              <div className="mini-list">
                {(history ?? []).filter((h) => h.posts).map((h) => (
                  <Link key={h.post_id} to={'/blog/post/' + (h.posts as Post).slug} className="mini-row">
                    <div>
                      <div style={{ fontWeight: 500 }}>{(h.posts as Post).title}</div>
                      <div className="sp-bar" style={{ marginTop: 8, maxWidth: 320 }}><div style={{ width: h.progress + '%' }} /></div>
                    </div>
                    <span className="meta">{h.progress}% read</span>
                  </Link>
                ))}
              </div>
            ) : (
              <EmptyState title="No reading history." note="Articles you read will be tracked here." />
            )
          )}

          {tab === 'articles' && (
            <div>
              {profile?.role === 'reader' && (
                <div className="dash-card" style={{ marginBottom: 24 }}>
                  <div className="toc-label">Want to write?</div>
                  {application ? (
                    <div className="meta">Your application is <strong style={{ color: 'var(--lime)' }}>{application.status.toUpperCase()}</strong>. The editor reviews weekly.</div>
                  ) : (
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      <span className="meta">Applications are open.</span>
                      <Link to="/blog/apply" className="btn-lime btn-small">Apply now &rarr;</Link>
                    </div>
                  )}
                </div>
              )}
              {myPosts && myPosts.length ? (
                <div className="mini-list">
                  {myPosts.map((p) => (
                    <Link key={p.id} to={'/blog/dashboard/editor?id=' + p.id} className="mini-row">
                      <div>
                        <div style={{ fontWeight: 500 }}>{p.title}</div>
                        <div className="meta">{STATUS_LABEL[p.status] ?? p.status} &middot; updated {fmtDate(p.updated_at)}</div>
                      </div>
                      <span className="meta">{fmtNum(p.view_count)} views</span>
                    </Link>
                  ))}
                </div>
              ) : (
                profile?.role !== 'reader' && <EmptyState title="No articles yet." note="Start your first draft." />
              )}
            </div>
          )}

          {tab === 'profile' && profile && (
            <>
            <div className="dash-card" style={{ marginBottom: 28, display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => avatarRef.current?.click()}
                title="Change avatar"
                style={{ background: 'none', border: 0, padding: 0, cursor: 'pointer', borderRadius: '50%' }}
              >
                <Avatar profile={profile} size={64} />
              </button>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontWeight: 500 }}>{profile.display_name || profile.username}</div>
                <div className="meta">
                  {profile.role.replace('_', ' ')}{profile.verified ? ' · verified' : ''} ·
                  {' '}<Link to={'/blog/author/' + profile.username} style={{ color: 'var(--lime)' }}>view public profile &rarr;</Link>
                </div>
              </div>
              <input
                ref={avatarRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
                hidden
                onChange={async (e) => {
                  const f = e.target.files?.[0]
                  e.target.value = ''
                  if (!f || !uid) return
                  const res = await uploadMedia(f, uid)
                  if (res.error) return toast(res.error, true)
                  if (res.url) {
                    const err = await updateProfile(uid, { avatar_url: res.url })
                    if (err) return toast(err, true)
                    await refreshProfile()
                    toast('Avatar updated.')
                  }
                }}
              />
            </div>
            <form
              className="cf" style={{ maxWidth: 560 }}
              onSubmit={async (e) => {
                e.preventDefault()
                const d = new FormData(e.currentTarget)
                const uname = slugify(String(d.get('username') || ''))
                if (!uname) return toast('Username cannot be empty.', true)
                const err = await updateProfile(uid!, {
                  username: uname,
                  display_name: String(d.get('display_name') || ''),
                  bio: String(d.get('bio') || ''),
                  website: String(d.get('website') || ''),
                  github_url: String(d.get('github') || ''),
                  linkedin_url: String(d.get('linkedin') || ''),
                })
                if (err) {
                  if (/unique|duplicate/i.test(err)) return toast('That username is taken - try another.', true)
                  return toast(err, true)
                }
                await refreshProfile()
                void qc.invalidateQueries({ queryKey: ['author', uname] })
                toast('Profile saved.')
              }}
            >
              <div className="cf-group">
                <label className="cf-label" htmlFor="pf-user">Username (your profile URL)</label>
                <input className="cf-input" id="pf-user" name="username" defaultValue={profile.username} aria-describedby="pf-user-hint" />
                <div className="meta" id="pf-user-hint" style={{ marginTop: 6 }}>/blog/author/{profile.username}</div>
              </div>
              <div className="cf-group">
                <label className="cf-label" htmlFor="pf-name">Display name</label>
                <input className="cf-input" id="pf-name" name="display_name" defaultValue={profile.display_name ?? ''} />
              </div>
              <div className="cf-group">
                <label className="cf-label" htmlFor="pf-bio">Bio</label>
                <textarea className="cf-textarea" id="pf-bio" name="bio" defaultValue={profile.bio ?? ''} rows={3} />
              </div>
              <div className="cf-group">
                <label className="cf-label" htmlFor="pf-web">Website</label>
                <input className="cf-input" id="pf-web" name="website" type="url" defaultValue={profile.website ?? ''} />
              </div>
              <div className="cf-row">
                <div className="cf-group">
                  <label className="cf-label" htmlFor="pf-gh">GitHub</label>
                  <input className="cf-input" id="pf-gh" name="github" type="url" defaultValue={profile.github_url ?? ''} />
                </div>
                <div className="cf-group">
                  <label className="cf-label" htmlFor="pf-li">LinkedIn</label>
                  <input className="cf-input" id="pf-li" name="linkedin" type="url" defaultValue={profile.linkedin_url ?? ''} />
                </div>
              </div>
              <button className="btn-lime" type="submit" style={{ justifyContent: 'center' }}>SAVE PROFILE &rarr;</button>
            </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
