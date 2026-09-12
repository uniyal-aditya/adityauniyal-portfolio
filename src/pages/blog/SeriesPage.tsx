import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Seo } from '@/lib/seo'
import { fetchSeriesPage, fetchReadingHistory } from '@/lib/journal-api'
import { SUPABASE_CONFIGURED } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { EmptyState, Skeletons } from '@/components/journal/bits'
import { fmtDate } from '@/lib/sanitize'
import { useReveal } from '@/hooks/useReveal'

export default function SeriesPage() {
  useReveal()
  const { slug = '' } = useParams()
  const { user } = useAuth()
  const enabled = SUPABASE_CONFIGURED && Boolean(slug)
  const { data, isLoading } = useQuery({
    queryKey: ['series', slug],
    queryFn: () => fetchSeriesPage(slug),
    enabled,
  })
  const { data: history } = useQuery({
    queryKey: ['reading-history', user?.id],
    queryFn: () => fetchReadingHistory(user!.id, 50),
    enabled: Boolean(user),
  })

  if (!enabled) {
    return <div className="container" style={{ paddingTop: 120 }}><EmptyState note="The journal backend is not connected yet." /></div>
  }
  if (isLoading) return <Skeletons n={3} />
  if (!data?.series) {
    return (
      <div className="container" style={{ paddingTop: 120 }}>
        <EmptyState title="Series not found." />
        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <Link to="/blog" className="btn-ghost-line">Back to the journal</Link>
        </div>
      </div>
    )
  }
  const s = data.series
  const chapters = data.chapters
  const progressFor = (postId: string) => history?.find((h) => h.post_id === postId)?.progress ?? 0
  const done = chapters.filter((c) => progressFor(c.id) >= 90).length
  const pct = chapters.length ? Math.round((done / chapters.length) * 100) : 0
  return (
    <div>
      <Seo title={s.title + ' - AU_ / JOURNAL'} description={s.description || 'A series on AU_ / JOURNAL'} path={'/blog/series/' + s.slug} />
      <div className="page-top" style={{ paddingBottom: 40 }}>
        <div className="container">
          <div className="pt-label">Series</div>
          <h1>{s.title}</h1>
          {s.description && <p className="topic-desc">{s.description}</p>}
          {user && chapters.length > 0 && (
            <div className="series-progress meta">
              <div className="sp-bar"><div style={{ width: pct + '%' }} /></div>
              {pct}% complete &middot; {chapters.length} chapters
            </div>
          )}
          {!user && chapters.length > 0 && <div className="meta">{chapters.length} chapters</div>}
        </div>
      </div>
      <section style={{ paddingTop: 40 }}>
        <div className="container">
          {chapters.length === 0 ? (
            <EmptyState note="No chapters published in this series yet." />
          ) : (
            <ol className="series-list">
              {chapters.map((c, i) => {
                const prog = progressFor(c.id)
                const isNext = i === done && prog < 90
                return (
                  <li key={c.id} className="series-chapter reveal">
                    <div className="sc-num">{String(i + 1).padStart(2, '0')}</div>
                    <div style={{ flex: 1 }}>
                      <Link to={'/blog/post/' + c.slug} className="sc-title">{c.title}</Link>
                      {c.excerpt && <div className="pr-desc">{c.excerpt}</div>}
                      <div className="meta" style={{ marginTop: 8 }}>
                        <span>{fmtDate(c.published_at)}</span>
                        <span className="dot-sep">&middot;</span>
                        <span>{c.reading_time || 1} min</span>
                        {prog > 0 && prog < 90 && <span className="dot-sep">&middot;</span>}
                        {prog > 0 && prog < 90 && <span style={{ color: 'var(--lime)' }}>{prog}% read</span>}
                      </div>
                      {prog > 0 && prog < 90 && <div className="sp-bar" style={{ marginTop: 10 }}><div style={{ width: prog + '%' }} /></div>}
                    </div>
                    {isNext && <span className="tag" style={{ borderColor: 'var(--lime)', color: 'var(--lime)' }}>NEXT UP</span>}
                  </li>
                )
              })}
            </ol>
          )}
        </div>
      </section>
    </div>
  )
}
