import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Seo } from '@/lib/seo'
import { Reveal } from '@/components/system/Reveal'
import { fetchBuilding } from '@/lib/github'
import { CURRENT_PROJECT, GITHUB_USERNAME } from '@/data/building'
import type { BuildingEvent } from '@/types/building'
import {
  GitCommitHorizontal, GitPullRequest, CircleDot, Tag, FolderGit2, Star,
  Activity, ArrowUpRight, TriangleAlert, CalendarDays, Flame, TrendingUp,
} from 'lucide-react'
import { GithubIcon } from '@/components/icons/GithubIcon'

/* ---- helpers ---------------------------------------------------- */

function timeAgo(iso: string): string {
  const s = Math.max(1, (Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 3600) return Math.round(s / 60) + ' min ago'
  if (s < 86400) return Math.round(s / 3600) + ' hr ago'
  return Math.round(s / 86400) + 'd ago'
}

type Filter = 'all' | 'commits' | 'prs' | 'issues' | 'releases' | 'repos'
const FILTERS: { key: Filter; label: string; types: string[] }[] = [
  { key: 'all', label: 'All', types: [] },
  { key: 'commits', label: 'Commits', types: ['PushEvent'] },
  { key: 'prs', label: 'Pull Requests', types: ['PullRequestEvent'] },
  { key: 'issues', label: 'Issues', types: ['IssuesEvent'] },
  { key: 'releases', label: 'Releases', types: ['ReleaseEvent'] },
  { key: 'repos', label: 'Repositories', types: ['CreateEvent', 'WatchEvent', 'ForkEvent'] },
]

function describeEvent(e: BuildingEvent): { kind: string; title: string; icon: typeof GitCommitHorizontal } {
  const p = e.payload || {}
  switch (e.type) {
    case 'PushEvent': {
      const c = p.commits?.length ?? 0
      const msg = p.commits?.[0]?.message?.split('\n')[0] || 'Pushed changes'
      return { kind: c > 1 ? c + ' commits' : 'Commit', title: msg, icon: GitCommitHorizontal }
    }
    case 'PullRequestEvent':
      return { kind: 'Pull Request', title: p.pull_request?.title || (p.action || 'updated'), icon: GitPullRequest }
    case 'IssuesEvent':
      return { kind: 'Issue', title: p.issue?.title || (p.action || 'updated'), icon: CircleDot }
    case 'ReleaseEvent':
      return { kind: 'Release', title: p.release?.tag_name || p.release?.name || 'tagged', icon: Tag }
    case 'CreateEvent':
      return { kind: 'Repository', title: 'Created ' + (p.ref_type || 'repo') + (p.ref ? ' · ' + p.ref : ''), icon: FolderGit2 }
    case 'WatchEvent':
      return { kind: 'Repository', title: 'Starred ' + (e.repo || ''), icon: Star }
    case 'ForkEvent':
      return { kind: 'Repository', title: 'Forked ' + (e.repo || ''), icon: FolderGit2 }
    default:
      return { kind: 'Activity', title: e.type.replace('Event', ''), icon: Activity }
  }
}

/* ---- activity status (task #60: inference, never presence) ------ */
function activityStatus(lastEventAt?: string): { label: string; tone: string } {
  if (!lastEventAt) return { label: 'NO RECENT ACTIVITY', tone: 'var(--dim-3)' }
  const days = (Date.now() - new Date(lastEventAt).getTime()) / 86400e3
  if (days < 3) return { label: 'ACTIVE DEVELOPMENT', tone: 'var(--lime)' }
  if (days < 14) return { label: 'RECENTLY ACTIVE', tone: 'var(--bone)' }
  return { label: 'NO RECENT ACTIVITY', tone: 'var(--dim-3)' }
}

/* ---- contribution heatmap --------------------------------------- */
function Heatmap({ days, total }: { days: Record<string, number>; total: number }) {
  const cells = useMemo(() => {
    const out: { date: string; n: number }[] = []
    const start = new Date()
    start.setDate(start.getDate() - 363)
    for (let i = 0; i < 364; i++) {
      const d = new Date(start)
      d.setDate(start.getDate() + i)
      const key = d.toISOString().slice(0, 10)
      out.push({ date: key, n: days[key] ?? 0 })
    }
    return out
  }, [days])
  const level = (n: number) => (n === 0 ? 0 : n < 3 ? 1 : n < 6 ? 2 : 3)
  const bg = ['rgba(240,237,230,0.05)', 'rgba(200,241,53,0.25)', 'rgba(200,241,53,0.55)', 'rgba(200,241,53,0.9)']
  return (
    <div>
      <div className="meta" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
        <span>{total.toLocaleString()} contributions · last 12 months</span>
        <span style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>
          less
          {bg.map((b, i) => <span key={i} style={{ width: 9, height: 9, background: b, display: 'inline-block' }} />)}
          more
        </span>
      </div>
      <div style={{ display: 'grid', gridTemplateRows: 'repeat(7, 1fr)', gridAutoFlow: 'column', gap: 3, overflowX: 'auto', paddingBottom: 4 }}>
        {cells.map((c) => (
          <span
            key={c.date}
            title={c.date + ' — ' + c.n + ' contribution' + (c.n === 1 ? '' : 's')}
            aria-label={c.date + ': ' + c.n + ' contributions'}
            style={{ width: 11, height: 11, background: bg[level(c.n)], flex: 'none' }}
          />
        ))}
      </div>
    </div>
  )
}

/* ---- page -------------------------------------------------------- */
export default function Building() {
  const [filter, setFilter] = useState<Filter>('all')
  const q = useQuery({ queryKey: ['github-building'], queryFn: fetchBuilding, staleTime: 10 * 60_000, retry: 1 })

  const filtered = useMemo(() => {
    const evs = q.data?.events ?? []
    const f = FILTERS.find((x) => x.key === filter)!
    return f.types.length ? evs.filter((e) => f.types.includes(e.type)) : evs
  }, [q.data, filter])

  const status = activityStatus(q.data?.events?.[0]?.createdAt)
  const lastUpdate = q.data?.events?.[0]

  return (
    <main style={{ paddingTop: 120 }}>
      <Seo title="Building - Aditya Uniyal" path="/building" description="A live snapshot of what Aditya is building, coding and contributing to." />

      {/* ── HERO ── */}
      <header className="container work-header reveal" style={{ paddingTop: 40 }}>
        <p className="terminal-line" style={{ color: 'var(--dim-3)', fontFamily: 'var(--f-mono)', fontSize: 13 }} aria-hidden="true">
          ~/au/building $
        </p>
        <h1 style={{ fontSize: 'clamp(3rem, 8vw, 6.5rem)', lineHeight: 0.95, margin: '10px 0 18px' }}>
          CURRENTLY<br />BUILDING<span style={{ color: 'var(--lime)' }}>.</span>
        </h1>
        <div className="work-header-meta">
          <span>
            {q.data ? (
              <>Last updated {timeAgo(q.data.cachedAt)} · live from GitHub</>
            ) : (
              <>A live snapshot of what I'm building and learning.</>
            )}
          </span>
          <a href={'https://github.com/' + GITHUB_USERNAME} target="_blank" rel="noreferrer" style={{ color: 'var(--lime)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <GithubIcon size={14} /> VIEW GITHUB <ArrowUpRight size={13} aria-hidden />
          </a>
        </div>
      </header>

      {/* ── CURRENTLY BUILDING + STATUS ── */}
      <section className="container" style={{ paddingTop: 60 }}>
        <Reveal>
          <div className="dash-card" style={{ padding: '28px 30px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 20, flexWrap: 'wrap' }}>
              <div>
                <div className="toc-label">Currently building</div>
                <h2 style={{ fontFamily: 'var(--f-display)', fontSize: '2.4rem', margin: '6px 0 4px' }}>
                  {CURRENT_PROJECT.name}
                </h2>
                <p style={{ color: 'var(--dim-2)', maxWidth: 560 }}>{CURRENT_PROJECT.description}</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="toc-label">Development status</div>
                <div style={{ fontFamily: 'var(--f-mono)', fontSize: 13, color: status.tone, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: status.tone, display: 'inline-block' }} aria-hidden />
                  {status.label}
                </div>
                <div className="meta" style={{ marginTop: 6 }}>inferred from public GitHub activity</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 40, flexWrap: 'wrap', marginTop: 22, borderTop: '1px solid var(--line)', paddingTop: 18 }}>
              <div>
                <div className="toc-label">Stack</div>
                <div className="meta" style={{ fontFamily: 'var(--f-mono)' }}>{CURRENT_PROJECT.stack.join(' · ')}</div>
              </div>
              <div>
                <div className="toc-label">Last update</div>
                <div className="meta">{lastUpdate ? describeEvent(lastUpdate).title.slice(0, 44) + ' · ' + timeAgo(lastUpdate.createdAt) : 'no public activity yet'}</div>
              </div>
              <div style={{ display: 'flex', gap: 10, marginLeft: 'auto', alignItems: 'flex-end' }}>
                <a className="btn btn-sm" style={{ padding: '9px 16px' }} href={'https://github.com/' + GITHUB_USERNAME + '/' + CURRENT_PROJECT.repo} target="_blank" rel="noreferrer">
                  VIEW GITHUB
                </a>
                <Link className="btn btn-sm" style={{ padding: '9px 16px' }} to="/blog">VIEW JOURNAL</Link>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ── ERROR STATE (task #70) ── */}
      {q.isError && (
        <section className="container" style={{ paddingTop: 40 }}>
          <div className="dash-card" style={{ borderColor: 'rgba(232,89,58,0.4)' }}>
            <TriangleAlert size={18} color="var(--rust)" aria-hidden />
            <h3 style={{ fontFamily: 'var(--f-mono)', margin: '10px 0 4px', fontSize: 14 }}>GITHUB ACTIVITY UNAVAILABLE</h3>
            <p className="meta">The latest development activity could not be retrieved{(q.error as Error)?.message ? ' — ' + (q.error as Error).message : ''}.</p>
            <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
              <button className="btn btn-sm" onClick={() => void q.refetch()}>RETRY</button>
              <a className="btn btn-sm" href={'https://github.com/' + GITHUB_USERNAME} target="_blank" rel="noreferrer">VIEW GITHUB</a>
            </div>
          </div>
        </section>
      )}

      {/* ── TIMELINE + STATS ── */}
      {q.data && (
        <section className="container" style={{ paddingTop: 70, display: 'grid', gridTemplateColumns: 'minmax(0,1.5fr) minmax(0,1fr)', gap: 40 }}>
          <Reveal>
            <div className="toc-label" style={{ marginBottom: 14 }}>Recent activity</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 18 }}>
              {FILTERS.map((f) => (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  aria-pressed={filter === f.key}
                  className="filter-chip"
                  style={{
                    fontFamily: 'var(--f-mono)', fontSize: 11, padding: '7px 12px', cursor: 'pointer',
                    border: '1px solid ' + (filter === f.key ? 'var(--lime)' : 'var(--line)'),
                    color: filter === f.key ? 'var(--lime)' : 'var(--dim-2)',
                    background: 'transparent',
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>
            {filtered.length === 0 ? (
              <div className="dash-card" style={{ textAlign: 'center', padding: '40px 20px' }}>
                <Activity size={20} color="var(--dim-3)" aria-hidden />
                <p className="meta" style={{ marginTop: 10 }}>No {filter === 'all' ? '' : FILTERS.find((f) => f.key === filter)?.label.toLowerCase() + ' '}activity in the recent public feed.</p>
              </div>
            ) : (
              <ol style={{ listStyle: 'none', padding: 0, margin: 0, borderLeft: '1px solid var(--line)', marginLeft: 6 }}>
                {filtered.slice(0, 14).map((e) => {
                  const d = describeEvent(e)
                  const Icon = d.icon
                  return (
                    <li key={e.id} style={{ position: 'relative', padding: '0 0 22px 26px' }}>
                      <span style={{ position: 'absolute', left: -10, top: 0, width: 19, height: 19, background: 'var(--bg)', border: '1px solid var(--line)', display: 'grid', placeItems: 'center' }} aria-hidden>
                        <Icon size={11} color="var(--lime)" />
                      </span>
                      <div className="meta" style={{ fontFamily: 'var(--f-mono)', fontSize: 12 }}>
                        {new Date(e.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {d.kind} · {e.repo}
                      </div>
                      <div style={{ color: 'var(--bone)', marginTop: 2 }}>{d.title}</div>
                      <div className="meta" style={{ fontSize: 12 }}>{timeAgo(e.createdAt)}</div>
                    </li>
                  )
                })}
              </ol>
            )}
          </Reveal>

          <div style={{ display: 'grid', gap: 24, alignContent: 'start' }}>
            <Reveal>
              <div className="dash-card">
                <div className="toc-label" style={{ marginBottom: 12 }}>Developer statistics</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  {[
                    { icon: CalendarDays, label: 'Contributions (12mo)', value: q.data.calendar.total.toLocaleString() },
                    { icon: Flame, label: 'Current streak', value: q.data.calendar.streak + 'd' },
                    { icon: TrendingUp, label: 'Longest streak', value: q.data.calendar.longest + 'd' },
                    { icon: FolderGit2, label: 'Public repos', value: String(q.data.user.public_repos) },
                  ].map((s) => (
                    <div key={s.label} style={{ border: '1px solid var(--line)', padding: '12px 14px' }}>
                      <s.icon size={14} color="var(--lime)" aria-hidden />
                      <div style={{ fontFamily: 'var(--f-display)', fontSize: '1.6rem', margin: '6px 0 0' }}>{s.value}</div>
                      <div className="meta" style={{ fontSize: 11 }}>{s.label}</div>
                    </div>
                  ))}
                </div>
                {q.data.calendar.unavailable && (
                  <p className="meta" style={{ marginTop: 10, fontSize: 11 }}>Streaks need a GitHub token — configure GITHUB_TOKEN server-side.</p>
                )}
              </div>
            </Reveal>
            <Reveal>
              <div className="dash-card">
                <div className="toc-label" style={{ marginBottom: 12 }}>Languages (recent repos)</div>
                {q.data.languages.map((l) => (
                  <div key={l.name} style={{ marginBottom: 10 }}>
                    <div className="meta" style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--f-mono)', fontSize: 12 }}>
                      <span>{l.name}</span><span>{l.pct}%</span>
                    </div>
                    <div style={{ height: 4, background: 'rgba(240,237,230,0.07)' }}>
                      <div style={{ height: '100%', width: l.pct + '%', background: 'var(--lime)', opacity: 0.75 }} />
                    </div>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        </section>
      )}

      {/* ── CONTRIBUTION GRAPH ── */}
      {q.data && !q.data.calendar.unavailable && (
        <section className="container" style={{ paddingTop: 60 }}>
          <Reveal>
            <div className="dash-card">
              <div className="toc-label" style={{ marginBottom: 14 }}>Contribution graph</div>
              <Heatmap days={q.data.calendar.days} total={q.data.calendar.total} />
            </div>
          </Reveal>
        </section>
      )}

      {/* ── RECENT REPOSITORIES ── */}
      {q.data && q.data.repos.length > 0 && (
        <section className="container" style={{ paddingTop: 60, paddingBottom: 110 }}>
          <Reveal>
            <div className="toc-label" style={{ marginBottom: 14 }}>Recent repositories</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
              {q.data.repos.map((r) => (
                <a key={r.name} href={r.url} target="_blank" rel="noreferrer" className="dash-card" style={{ display: 'block', textDecoration: 'none', transition: 'border-color .2s' }}
                  onMouseOver={(e) => (e.currentTarget.style.borderColor = 'var(--lime)')}
                  onMouseOut={(e) => (e.currentTarget.style.borderColor = 'var(--line)')}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontFamily: 'var(--f-mono)', fontSize: 13, color: 'var(--bone)' }}>{r.name}</span>
                    <ArrowUpRight size={14} color="var(--dim-3)" aria-hidden />
                  </div>
                  <p className="meta" style={{ margin: '8px 0 12px', minHeight: 32 }}>{r.description || 'No description.'}</p>
                  <div className="meta" style={{ display: 'flex', gap: 14, fontFamily: 'var(--f-mono)', fontSize: 11 }}>
                    {r.language && <span>{r.language}</span>}
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Star size={11} aria-hidden /> {r.stars}</span>
                    <span>updated {timeAgo(r.updated_at)}</span>
                  </div>
                </a>
              ))}
            </div>
          </Reveal>
        </section>
      )}
    </main>
  )
}
