import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Seo } from '@/lib/seo'
import { useAuth } from '@/hooks/useAuth'
import { supabase, SUPABASE_CONFIGURED } from '@/lib/supabase'
import type { Category, Comment, ContributorApplication, Post, Profile, Report, Tag, Media, NewsletterSubscriber, PostStatus, Role } from '@/lib/types'
import {
  fetchAdminAnalytics, fetchPostAnalytics,
} from '@/lib/journal-api'
import { EmptyState, Avatar, VerifiedBadge } from '@/components/journal/bits'

/* ── small helpers ─────────────────────────────────────────────── */

function useGuard() {
  const { profile, loading } = useAuth()
  if (!loading && !SUPABASE_CONFIGURED) return 'noconfig' as const
  if (!loading && (!profile || !['admin', 'owner'].includes(profile.role))) return 'denied' as const
  return { profile: profile! }
}

function Stat({ n, label, tone }: { n: string | number; label: string; tone?: string }) {
  return (
    <div className="stat-card">
      <div className="sc-num" style={tone ? { color: tone } : undefined}>{n}</div>
      <div className="sc-label">{label}</div>
    </div>
  )
}

function SectionHead({ title, note, right }: { title: string; note?: string; right?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', margin: '0 0 14px', gap: 16, flexWrap: 'wrap' }}>
      <div>
        <h2 style={{ fontFamily: 'var(--f-display)', fontSize: '1.7rem', lineHeight: 1.05 }}>{title}</h2>
        {note && <div className="meta" style={{ marginTop: 4 }}>{note}</div>}
      </div>
      {right}
    </div>
  )
}

const err = (e: unknown) => { console.error(e); alert(e instanceof Error ? e.message : String(e)) }
const fmt = (d?: string | null) => (d ? new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '—')
const STATUS_PILL: Record<string, string> = {
  published: 'var(--lime)', approved: 'var(--lime)', visible: 'var(--lime)',
  submitted: 'var(--bone)', review: 'var(--bone)', draft: 'var(--dim)',
  rejected: 'var(--rust)', hidden: 'var(--rust)', deleted: 'var(--rust)', archived: 'var(--dim)', open: 'var(--rust)', resolved: 'var(--dim)',
}
function Pill({ s }: { s: string }) {
  return <span className="pill" style={{ color: STATUS_PILL[s] ?? 'var(--dim)', borderColor: 'currentColor' }}>{s}</span>
}

/* ── gate screens ──────────────────────────────────────────────── */

function Gate({ kind }: { kind: 'noconfig' | 'denied' }) {
  return (
    <div className="admin-shell">
      <div className="container" style={{ paddingTop: 'calc(var(--nav-h) + 60px)', paddingBottom: 120, textAlign: 'center' }}>
        <div className="pt-label">~/au/journal/admin</div>
        <h1 style={{ fontFamily: 'var(--f-display)', fontSize: 'clamp(2.6rem,7vw,4.6rem)', lineHeight: 1 }}>
          {kind === 'noconfig' ? 'SYSTEM OFFLINE_' : 'ACCESS DENIED_'}
        </h1>
        <p className="meta" style={{ marginTop: 14 }}>
          {kind === 'noconfig'
            ? 'Configure Supabase in .env.local — see README. This console unlocks once the backend answers.'
            : 'This console is restricted to admin and owner roles. Log in with an elevated account.'}
        </p>
        <Link to="/blog/login" className="btn-lime" style={{ marginTop: 26, display: 'inline-block' }}>Go to login →</Link>
      </div>
    </div>
  )
}

/* ── Overview ──────────────────────────────────────────────────── */

function Overview() {
  const { data: analytics } = useQuery({ queryKey: ['admin-analytics'], queryFn: fetchAdminAnalytics, enabled: SUPABASE_CONFIGURED })
  const t = analytics?.totals
  const maxViews = Math.max(1, ...(analytics?.traffic ?? []).map((d) => d.views))
  return (
    <>
      <div className="admin-grid">
        <Stat n={t?.published ?? '—'} label="Published articles" />
        <Stat n={t?.drafts ?? '—'} label="Drafts" />
        <Stat n={t?.review ?? '—'} label="Review queue" tone={t && t.review > 0 ? 'var(--lime)' : undefined} />
        <Stat n={t?.views ?? '—'} label="Total views" />
        <Stat n={t?.users ?? '—'} label="Users" />
        <Stat n={t?.comments ?? '—'} label="Comments" />
        <Stat n={t?.reports ?? '—'} label="Open reports" tone={t && t.reports > 0 ? 'var(--rust)' : undefined} />
        <Stat n={SUPABASE_CONFIGURED ? 'ONLINE' : 'OFFLINE'} label="Backend" tone={SUPABASE_CONFIGURED ? 'var(--lime)' : 'var(--rust)'} />
      </div>

      <div className="dash-card" style={{ marginTop: 24 }}>
        <div className="toc-label">Traffic — last 14 days</div>
        {(analytics?.traffic ?? []).length === 0 && <EmptyState compact title="No data yet." note="Views appear as readers visit articles." />}
        {(analytics?.traffic ?? []).length > 0 && (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 120, paddingTop: 12 }}>
            {analytics!.traffic.map((d) => (
              <div key={d.day} title={d.day + ' — ' + d.views + ' views'} style={{ flex: 1, height: Math.max(3, (d.views / maxViews) * 100) + '%', background: 'linear-gradient(to top, rgba(200,241,53,0.65), rgba(200,241,53,0.15))', minHeight: 2 }} />
            ))}
          </div>
        )}
      </div>
    </>
  )
}

/* ── Review queue ──────────────────────────────────────────────── */

function ReviewQueue({ qc }: { qc: ReturnType<typeof useQueryClient> }) {
  const [busy, setBusy] = useState<string | null>(null)
  const q = useQuery({
    queryKey: ['admin-review'],
    enabled: SUPABASE_CONFIGURED,
    queryFn: async (): Promise<Post[]> => {
      const { data, error } = await supabase
        .from('posts')
        .select('id, title, slug, status, post_type, created_at, updated_at, author:profiles!posts_author_id_fkey(id, username, display_name, verified, role)')
        .in('status', ['submitted', 'review', 'approved'])
        .order('updated_at', { ascending: true })
      if (error) throw error
      return (data ?? []) as unknown as Post[]
    },
  })
  const setStatus = async (id: string, status: PostStatus) => {
    setBusy(id)
    const { error } = await supabase.rpc('admin_set_post_status', { p_post: id, p_status: status })
    setBusy(null)
    if (error) return err(error)
    void qc.invalidateQueries({ queryKey: ['admin-review'] })
    void qc.invalidateQueries({ queryKey: ['admin-posts'] })
  }
  return (
    <div className="admin-table-compact">
      <SectionHead title="Review queue" note="Submitted → reviewed → approved → published. Verified authors publish directly." />
      {q.isLoading && <p className="meta">Loading queue…</p>}
      {q.data && q.data.length === 0 && <EmptyState title="Queue is clear." note="Nothing waiting for moderation." />}
      {q.data && q.data.length > 0 && (
        <table className="data">
          <thead><tr><th>Article</th><th>Author</th><th>Status</th><th style={{ width: 240 }}>Actions</th></tr></thead>
          <tbody>
            {q.data.map((p) => (
              <tr key={p.id}>
                <td><Link to={'/blog/post/' + p.slug}>{p.title}</Link></td>
                <td>{(p as any).author?.display_name ?? '—'}</td>
                <td><Pill s={p.status} /></td>
                <td>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {p.status !== 'approved' && <button className="mini-btn" disabled={busy === p.id} onClick={() => setStatus(p.id, 'approved')}>approve</button>}
                    <button className="mini-btn" disabled={busy === p.id} onClick={() => setStatus(p.id, 'published')}>publish</button>
                    <button className="mini-btn danger" disabled={busy === p.id} onClick={() => { if (confirm('Reject "' + p.title + '" back to draft?')) setStatus(p.id, 'rejected') }}>reject</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

/* ── Posts management ──────────────────────────────────────────── */

function PostsAdmin({ qc }: { qc: ReturnType<typeof useQueryClient> }) {
  const [search, setSearch] = useState('')
  const [statusF, setStatusF] = useState('')
  const q = useQuery({
    queryKey: ['admin-posts', search, statusF],
    enabled: SUPABASE_CONFIGURED,
    queryFn: async (): Promise<Post[]> => {
      let req = supabase
        .from('posts')
        .select('id, title, slug, status, featured, post_type, updated_at, published_at, author:profiles!posts_author_id_fkey(username, display_name)')
        .order('updated_at', { ascending: false })
        .limit(100)
      if (search.trim()) req = req.ilike('title', '%' + search.trim() + '%')
      if (statusF) req = req.eq('status', statusF)
      const { data, error } = await req
      if (error) throw error
      return (data ?? []) as unknown as Post[]
    },
  })
  const act = async (fn: () => PromiseLike<{ error: { message: string } | null }>) => {
    const { error } = await fn()
    if (error) return err(error)
    void qc.invalidateQueries({ queryKey: ['admin-posts'] })
  }
  return (
    <div className="admin-table-compact">
      <SectionHead title="Posts" note="Feature, archive, restore, or jump into the editor." right={
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input className="filterbar" style={{ width: 220 }} placeholder="search titles…" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search posts" />
          <select className="filterbar" value={statusF} onChange={(e) => setStatusF(e.target.value)} aria-label="Filter by status">
            <option value="">all statuses</option>
            {['draft', 'submitted', 'review', 'approved', 'published', 'rejected', 'archived'].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      } />
      {q.isLoading && <p className="meta">Loading posts…</p>}
      {q.data && q.data.length === 0 && <EmptyState title="No posts yet." />}
      {q.data && q.data.length > 0 && (
        <table className="data">
          <thead><tr><th>Article</th><th>Author</th><th>Status</th><th>Updated</th><th style={{ width: 220 }}>Actions</th></tr></thead>
          <tbody>
            {q.data.map((p) => (
              <tr key={p.id}>
                <td>
                  <Link to={'/blog/post/' + p.slug}>{p.title}</Link>
                  {p.featured && <span style={{ color: 'var(--lime)', marginLeft: 8 }} title="Featured">★</span>}
                </td>
                <td>{(p as any).author?.display_name ?? '—'}</td>
                <td><Pill s={p.status} /></td>
                <td className="meta">{fmt(p.updated_at)}</td>
                <td>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <button className="mini-btn" onClick={() => act(() => supabase.rpc('admin_set_post_status', { p_post: p.id, p_status: 'published' }))}>publish</button>
                    <button className="mini-btn" onClick={() => act(() => supabase.rpc('admin_set_post_status', { p_post: p.id, p_status: 'archived' }))}>archive</button>
                    <button className="mini-btn" onClick={() => act(() => supabase.from('posts').update({ featured: !p.featured }).eq('id', p.id))}>{p.featured ? 'unfeature' : 'feature'}</button>
                    <button className="mini-btn danger" onClick={() => { if (confirm('Delete "' + p.title + '" permanently?')) act(() => supabase.from('posts').delete().eq('id', p.id)) }}>delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

/* ── Users & Authors ───────────────────────────────────────────── */

function UsersAdmin({ qc, rolesOnly }: { qc: ReturnType<typeof useQueryClient>; rolesOnly?: boolean }) {
  const [search, setSearch] = useState('')
  const q = useQuery({
    queryKey: ['admin-users', search],
    enabled: SUPABASE_CONFIGURED,
    queryFn: async (): Promise<Profile[]> => {
      let req = supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(200)
      if (search.trim()) req = req.or('display_name.ilike.%' + search.trim() + '%,username.ilike.%' + search.trim() + '%,email.ilike.%' + search.trim() + '%')
      const { data, error } = await req
      if (error) throw error
      return (data ?? []) as Profile[]
    },
  })
  const setRole = async (id: string, role: Role) => {
    const { error } = await supabase.rpc('admin_set_user_role', { p_user: id, p_role: role })
    if (error) return err(error)
    void qc.invalidateQueries({ queryKey: ['admin-users'] })
  }
  const setVerified = async (id: string, v: boolean) => {
    const { error } = await supabase.rpc('admin_set_verified', { p_user: id, p_verified: v })
    if (error) return err(error)
    void qc.invalidateQueries({ queryKey: ['admin-users'] })
  }
  return (
    <div className="admin-table-compact">
      <SectionHead title={rolesOnly ? 'Authors' : 'Users'} note={rolesOnly ? 'Contributors, verified authors and admins.' : 'Roles, verification and contributor status.'} right={
        <input className="filterbar" style={{ width: 240 }} placeholder="search people…" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search users" />
      } />
      {q.isLoading && <p className="meta">Loading…</p>}
      {q.data && q.data.length === 0 && <EmptyState title="No users yet." note="Users appear after their first login." />}
      {q.data && q.data.length > 0 && (
        <table className="data">
          <thead><tr><th>Person</th><th>Role</th><th>Joined</th><th style={{ width: 260 }}>Actions</th></tr></thead>
          <tbody>
            {q.data.filter((u) => (rolesOnly ? ['contributor', 'verified_author', 'admin', 'owner'].includes(u.role) : true)).map((u) => (
              <tr key={u.id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Avatar profile={u} size={26} />
                    <div>
                      <div>{u.display_name || u.username || '—'} {u.verified && <VerifiedBadge />}</div>
                      <div className="meta">{u.username ? '@' + u.username : u.email}</div>
                    </div>
                  </div>
                </td>
                <td><span className={'role-chip ' + u.role}>{u.role}</span></td>
                <td className="meta">{fmt(u.created_at)}</td>
                <td>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {u.role !== 'owner' && (
                      <select className="filterbar" value={u.role} onChange={(e) => setRole(u.id, e.target.value as Role)} aria-label="Set role">
                        {['reader', 'contributor', 'verified_author', 'admin', 'owner'].map((r) => <option key={r} value={r}>{r}</option>)}
                      </select>
                    )}
                    <button className="mini-btn" onClick={() => setVerified(u.id, !u.verified)}>{u.verified ? 'unverify' : 'verify'}</button>
                    <Link className="mini-btn" to={'/blog/author/' + (u.username || u.id)}>view</Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

/* ── Comments & Reports ────────────────────────────────────────── */

function CommentsAdmin({ qc }: { qc: ReturnType<typeof useQueryClient> }) {
  const [filter, setFilter] = useState('visible')
  const q = useQuery({
    queryKey: ['admin-comments', filter],
    enabled: SUPABASE_CONFIGURED,
    queryFn: async (): Promise<Comment[]> => {
      let req = supabase
        .from('comments')
        .select('id, post_id, body, status, created_at, user:profiles!comments_user_id_fkey(username, display_name), posts(slug, title)')
        .order('created_at', { ascending: false })
        .limit(100)
      if (filter) req = req.eq('status', filter)
      const { data, error } = await req
      if (error) throw error
      return (data ?? []) as unknown as Comment[]
    },
  })
  const setSt = async (id: string, status: Comment['status']) => {
    const { error } = await supabase.rpc('admin_set_comment_status', { p_comment: id, p_status: status })
    if (error) return err(error)
    void qc.invalidateQueries({ queryKey: ['admin-comments'] })
  }
  return (
    <div className="admin-table-compact">
      <SectionHead title="Comments" note="Moderate reader discussion." right={
        <select className="filterbar" value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filter comments">
          {['visible', 'pending', 'hidden', 'deleted', ''].map((s) => <option key={s || 'all'} value={s}>{s || 'all'}</option>)}
        </select>
      } />
      {q.isLoading && <p className="meta">Loading…</p>}
      {q.data && q.data.length === 0 && <EmptyState title="No comments here." />}
      {q.data && q.data.length > 0 && (
        <table className="data">
          <thead><tr><th>Comment</th><th>On</th><th>Status</th><th style={{ width: 200 }}>Actions</th></tr></thead>
          <tbody>
            {q.data.map((c) => (
              <tr key={c.id}>
                <td style={{ maxWidth: 380 }}>
                  <div>{(c as any).user?.display_name ?? '—'} <span className="meta">· {fmt(c.created_at)}</span></div>
                  <div className="meta" style={{ color: 'var(--bone)', marginTop: 2 }}>{c.body.slice(0, 120)}{c.body.length > 120 ? '…' : ''}</div>
                </td>
                <td><Link to={'/blog/post/' + ((c as any).posts?.slug ?? '')}>{((c as any).posts?.title ?? '—').slice(0, 40)}</Link></td>
                <td><Pill s={c.status} /></td>
                <td>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {c.status !== 'visible' && <button className="mini-btn" onClick={() => setSt(c.id, 'visible')}>show</button>}
                    {c.status === 'visible' && <button className="mini-btn" onClick={() => setSt(c.id, 'hidden')}>hide</button>}
                    <button className="mini-btn danger" onClick={() => setSt(c.id, 'deleted')}>delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

function ReportsAdmin({ qc }: { qc: ReturnType<typeof useQueryClient> }) {
  const q = useQuery({
    queryKey: ['admin-reports'],
    enabled: SUPABASE_CONFIGURED,
    queryFn: async (): Promise<Report[]> => {
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100)
      if (error) throw error
      return (data ?? []) as Report[]
    },
  })
  const resolve = async (id: string, status: 'resolved' | 'dismissed') => {
    const { error } = await supabase.from('reports').update({ status }).eq('id', id)
    if (error) return err(error)
    void qc.invalidateQueries({ queryKey: ['admin-reports'] })
  }
  return (
    <div className="admin-table-compact">
      <SectionHead title="Reports" note="Reader flags on posts and comments." />
      {q.isLoading && <p className="meta">Loading…</p>}
      {q.data && q.data.length === 0 && <EmptyState title="No reports." note="All quiet." />}
      {q.data && q.data.length > 0 && (
        <table className="data">
          <thead><tr><th>Reason</th><th>Details</th><th>Status</th><th style={{ width: 180 }}>Actions</th></tr></thead>
          <tbody>
            {q.data.map((r) => (
              <tr key={r.id}>
                <td><span style={{ color: 'var(--rust)' }}>{r.reason}</span></td>
                <td className="meta" style={{ maxWidth: 320 }}>{r.details?.slice(0, 100) ?? '—'}</td>
                <td><Pill s={r.status} /></td>
                <td>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="mini-btn" onClick={() => resolve(r.id, 'resolved')}>resolve</button>
                    <button className="mini-btn" onClick={() => resolve(r.id, 'dismissed')}>dismiss</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

/* ── Categories & Tags ─────────────────────────────────────────── */

function TaxonomyAdmin({ kind, qc }: { kind: 'categories' | 'tags'; qc: ReturnType<typeof useQueryClient> }) {
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const q = useQuery({
    queryKey: ['admin-tax', kind],
    enabled: SUPABASE_CONFIGURED,
    queryFn: async (): Promise<(Category | Tag)[]> => {
      const { data, error } = await supabase.from(kind).select('*').order('name')
      if (error) throw error
      return (data ?? []) as (Category | Tag)[]
    },
  })
  const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  const add = async () => {
    if (!name.trim()) return
    const row: Record<string, string | null> = kind === 'categories'
      ? { name: name.trim(), slug: slugify(name), description: desc.trim() || null }
      : { name: name.trim(), slug: slugify(name) }
    const { error } = await supabase.from(kind).insert(row)
    if (error) return err(error)
    setName(''); setDesc('')
    void qc.invalidateQueries({ queryKey: ['admin-tax'] })
  }
  const remove = async (id: string, label: string) => {
    if (!confirm('Delete ' + label + '? Existing articles keep their references but lose this label.')) return
    const { error } = await supabase.from(kind).delete().eq('id', id)
    if (error) return err(error)
    void qc.invalidateQueries({ queryKey: ['admin-tax'] })
  }
  return (
    <div className="admin-table-compact">
      <SectionHead title={kind === 'categories' ? 'Categories' : 'Tags'} note={kind === 'categories' ? 'Top-level topics (Engineering, AI, Web…).' : 'Freeform labels on articles.'} />
      <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
        <input className="filterbar" style={{ width: 220 }} placeholder={kind === 'categories' ? 'category name…' : 'tag name…'} value={name} onChange={(e) => setName(e.target.value)} aria-label="Name" />
        {kind === 'categories' && <input className="filterbar" style={{ flex: 1, minWidth: 200 }} placeholder="description (optional)" value={desc} onChange={(e) => setDesc(e.target.value)} aria-label="Description" />}
        <button className="mini-btn" onClick={add}>+ add</button>
      </div>
      {q.isLoading && <p className="meta">Loading…</p>}
      {q.data && q.data.length === 0 && <EmptyState title="None yet." note={kind === 'categories' ? 'Seed the eleven topics from supabase/01-schema.sql or add them here.' : 'Tags are created while writing articles.'} />}
      {q.data && q.data.length > 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {q.data.map((t) => (
            <span key={t.id} className="pill" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              {t.name}
              <button onClick={() => remove(t.id, t.name)} aria-label={'Delete ' + t.name} style={{ background: 'none', border: 'none', color: 'var(--rust)', cursor: 'pointer', fontFamily: 'var(--f-mono)', fontSize: 11 }}>×</button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── Media, Analytics, Newsletter, Applications, Settings ─────── */

function MediaAdmin() {
  const q = useQuery({
    queryKey: ['admin-media'],
    enabled: SUPABASE_CONFIGURED,
    queryFn: async (): Promise<Media[]> => {
      const { data, error } = await supabase.from('media').select('*').order('created_at', { ascending: false }).limit(60)
      if (error) throw error
      return (data ?? []) as Media[]
    },
  })
  return (
    <div>
      <SectionHead title="Media" note="Every uploaded image across the journal." />
      {q.isLoading && <p className="meta">Loading…</p>}
      {q.data && q.data.length === 0 && <EmptyState title="No media yet." note="Images uploaded in the editor land here." />}
      {q.data && q.data.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 }}>
          {q.data.map((m) => (
            <figure key={m.id} style={{ border: '1px solid var(--line)', padding: 8, margin: 0 }}>
              <img src={m.public_url} alt={m.alt_text || 'media'} loading="lazy" style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', display: 'block' }} />
              <figcaption className="meta" style={{ marginTop: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.alt_text || m.storage_path.split('/').pop()}</figcaption>
            </figure>
          ))}
        </div>
      )}
    </div>
  )
}

function AnalyticsAdmin() {
  const { data: rows } = useQuery({ queryKey: ['post-analytics'], queryFn: fetchPostAnalytics, enabled: SUPABASE_CONFIGURED })
  return (
    <div className="admin-table-compact">
      <SectionHead title="Analytics" note="Views, engagement and reading completion per article." />
      {rows && rows.length === 0 && <EmptyState title="No data yet." note="Analytics populate as articles collect readers." />}
      {rows && rows.length > 0 && (
        <table className="data">
          <thead><tr><th>Article</th><th>Views</th><th>Uniques</th><th>Likes</th><th>Comments</th><th>Bookmarks</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.slug}>
                <td>{r.title}</td>
                <td>{r.views}</td>
                <td>{r.uniques}</td>
                <td>{r.likes}</td>
                <td>{r.comments}</td>
                <td>{r.bookmarks}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

function NewsletterAdmin() {
  const q = useQuery({
    queryKey: ['admin-newsletter'],
    enabled: SUPABASE_CONFIGURED,
    queryFn: async (): Promise<NewsletterSubscriber[]> => {
      const { data, error } = await supabase.from('newsletter_subscribers').select('*').order('created_at', { ascending: false }).limit(500)
      if (error) throw error
      return (data ?? []) as NewsletterSubscriber[]
    },
  })
  const confirmed = (q.data ?? []).filter((s) => s.confirmed).length
  return (
    <div>
      <SectionHead title="Newsletter" note={'AU Weekly — ' + confirmed + ' confirmed of ' + (q.data ?? []).length + ' subscribers.'} />
      {q.data && q.data.length === 0 && <EmptyState title="No subscribers yet." note="Signups from the AU Weekly form appear here." />}
      {q.data && q.data.length > 0 && (
        <table className="data">
          <thead><tr><th>Email</th><th>Status</th><th>Joined</th></tr></thead>
          <tbody>
            {q.data.map((s) => (
              <tr key={s.id}><td>{s.email}</td><td><Pill s={s.confirmed ? 'approved' : 'pending'} /></td><td className="meta">{fmt(s.created_at)}</td></tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

/* ── Contributor applications ──────────────────────────────────── */

function ApplicationsAdmin({ qc }: { qc: ReturnType<typeof useQueryClient> }) {
  const q = useQuery({
    queryKey: ['admin-applications'],
    enabled: SUPABASE_CONFIGURED,
    queryFn: async (): Promise<ContributorApplication[]> => {
      const { data, error } = await supabase.from('contributor_applications').select('*').order('created_at', { ascending: false }).limit(100)
      if (error) throw error
      return (data ?? []) as ContributorApplication[]
    },
  })
  const decide = async (a: ContributorApplication, status: 'approved' | 'rejected') => {
    if (status === 'approved' && !confirm('Approve ' + a.name + ' as a contributor? They get the contributor role on their next login.')) return
    const { error } = await supabase.from('contributor_applications').update({ status }).eq('id', a.id)
    if (error) return err(error)
    if (status === 'approved' && a.user_id) {
      const { error: e2 } = await supabase.rpc('admin_set_user_role', { p_user: a.user_id, p_role: 'contributor' })
      if (e2) console.warn('role grant failed (user may not have logged in yet):', e2.message)
    }
    void qc.invalidateQueries({ queryKey: ['admin-applications'] })
  }
  return (
    <div className="admin-table-compact">
      <SectionHead title="Contributor applications" note="Writers asking to publish in the journal." />
      {q.isLoading && <p className="meta">Loading…</p>}
      {q.data && q.data.length === 0 && <EmptyState title="No applications." note="Submissions from /blog/apply land here." />}
      {q.data && q.data.length > 0 && (
        <table className="data">
          <thead><tr><th>Applicant</th><th>Why</th><th>Status</th><th style={{ width: 170 }}>Actions</th></tr></thead>
          <tbody>
            {q.data.map((a) => (
              <tr key={a.id}>
                <td>
                  <div>{a.name} <span className="meta">@{a.username}</span></div>
                  <div className="meta" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 2 }}>
                    {a.portfolio && <a href={a.portfolio} target="_blank" rel="noreferrer">portfolio</a>}
                    {a.github_url && <a href={a.github_url} target="_blank" rel="noreferrer">github</a>}
                    {a.linkedin_url && <a href={a.linkedin_url} target="_blank" rel="noreferrer">linkedin</a>}
                  </div>
                </td>
                <td className="meta" style={{ maxWidth: 340 }}>{a.reason.slice(0, 110)}{a.reason.length > 110 ? '…' : ''}</td>
                <td><Pill s={a.status === 'pending' ? 'submitted' : a.status} /></td>
                <td>
                  {a.status === 'pending' ? (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="mini-btn" onClick={() => decide(a, 'approved')}>approve</button>
                      <button className="mini-btn danger" onClick={() => decide(a, 'rejected')}>reject</button>
                    </div>
                  ) : <span className="meta">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

/* ── Settings (read-only system status) ────────────────────────── */

function SettingsAdmin() {
  const { data: cats } = useQuery({ queryKey: ['admin-tax', 'categories'], enabled: SUPABASE_CONFIGURED, queryFn: async () => (await supabase.from('categories').select('id')).data ?? [] })
  return (
    <div>
      <SectionHead title="Settings" note="System status — secrets stay in environment variables, never in the client." />
      <div className="dash-grid">
        <div className="dash-card">
          <div className="toc-label">Backend</div>
          <div className="mini-row" style={{ display: 'block' }}>
            <div>Supabase: <span style={{ color: SUPABASE_CONFIGURED ? 'var(--lime)' : 'var(--rust)' }}>{SUPABASE_CONFIGURED ? 'connected' : 'not configured'}</span></div>
            <div className="meta" style={{ marginTop: 4 }}>Anon key only on the client. Service role key lives in Netlify env vars for sitemap/RSS functions.</div>
          </div>
        </div>
        <div className="dash-card">
          <div className="toc-label">Categories</div>
          <div className="mini-row" style={{ display: 'block' }}>
            <div>{(cats ?? []).length} loaded</div>
            <div className="meta" style={{ marginTop: 4 }}>Manage them in the Categories tab.</div>
          </div>
        </div>
        <div className="dash-card">
          <div className="toc-label">Deployment</div>
          <div className="mini-row" style={{ display: 'block' }}>
            <div>Netlify + Vite</div>
            <div className="meta" style={{ marginTop: 4 }}>Sitemap and RSS are server functions at /blog/sitemap.xml and /blog/rss.xml.</div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Shell ─────────────────────────────────────────────────────── */

const TABS: [string, string][] = [
  ['overview', 'Overview'], ['posts', 'Posts'], ['review', 'Review'],
  ['users', 'Users'], ['authors', 'Authors'], ['comments', 'Comments'],
  ['reports', 'Reports'], ['categories', 'Categories'], ['tags', 'Tags'],
  ['media', 'Media'], ['applications', 'Applications'], ['analytics', 'Analytics'],
  ['newsletter', 'Newsletter'], ['settings', 'Settings'],
]

export default function AdminPage() {
  const guard = useGuard()
  const { section = 'overview' } = useParams()
  const qc = useQueryClient()

  if (guard === 'noconfig') return <Gate kind="noconfig" />
  if (guard === 'denied') return <Gate kind="denied" />
  const profile = guard.profile

  const valid = TABS.some(([k]) => k === section)
  if (!valid) {
    return <Gate kind='denied' /> // unknown section — fall back to overview via redirect below
  }

  return (
    <div className="admin-shell">
      <Seo title="Admin - AU_ / JOURNAL" path="/blog/admin" noindex />
      <div className="container">
        <header className="journal-top">
          <div className="jt-label meta">owner console</div>
          <h1>Admin<span style={{ color: 'var(--lime)' }}>_</span></h1>
          <p className="lede" style={{ color: 'var(--dim)', maxWidth: 560 }}>
            Operational console for AU_ / JOURNAL — moderation, users, taxonomy and analytics.
          </p>
        </header>

        <div className="admin-bar" style={{ justifyContent: 'space-between' }}>
          <span className="ab-title">~/au/journal/admin — {profile.display_name || profile.username}</span>
          <span className="ab-actions meta">
            <Link to="/blog" style={{ color: 'var(--dim)' }}>← journal</Link>
            <Link to="/blog/dashboard" style={{ color: 'var(--dim)' }}>dashboard</Link>
          </span>
        </div>

        <nav className="admin-tabs meta" aria-label="Admin sections">
          {TABS.map(([k, label]) => (
            <Link key={k} to={'/blog/admin/' + k} className={section === k ? 'active' : ''}>{label}</Link>
          ))}
        </nav>

        <div style={{ padding: '8px 0 100px' }}>
          {section === 'overview' && <Overview />}
          {section === 'posts' && <PostsAdmin qc={qc} />}
          {section === 'review' && <ReviewQueue qc={qc} />}
          {section === 'users' && <UsersAdmin qc={qc} />}
          {section === 'authors' && <UsersAdmin qc={qc} rolesOnly />}
          {section === 'comments' && <CommentsAdmin qc={qc} />}
          {section === 'reports' && <ReportsAdmin qc={qc} />}
          {section === 'categories' && <TaxonomyAdmin kind="categories" qc={qc} />}
          {section === 'tags' && <TaxonomyAdmin kind="tags" qc={qc} />}
          {section === 'media' && <MediaAdmin />}
          {section === 'applications' && <ApplicationsAdmin qc={qc} />}
          {section === 'analytics' && <AnalyticsAdmin />}
          {section === 'newsletter' && <NewsletterAdmin />}
          {section === 'settings' && <SettingsAdmin />}
        </div>
      </div>
    </div>
  )
}
