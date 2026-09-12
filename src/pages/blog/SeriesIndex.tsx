import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Seo } from '@/lib/seo'
import { supabase, SUPABASE_CONFIGURED } from '@/lib/supabase'
import { EmptyState, Skeletons } from '@/components/journal/bits'
import type { Series } from '@/lib/types'

export default function SeriesIndex() {
  const { data: series, isLoading } = useQuery({
    queryKey: ['series-index'],
    enabled: SUPABASE_CONFIGURED,
    queryFn: async (): Promise<Series[]> => {
      const { data, error } = await supabase.from('series').select('*').order('title')
      if (error) throw error
      return (data ?? []) as Series[]
    },
  })

  return (
    <div>
      <Seo title="Series - AU_ / JOURNAL" path="/blog/series" />
      <div className="page-top">
        <div className="container">
          <div className="pt-label">Collections</div>
          <h1>
            <em>Series</em>
          </h1>
          <p className="topic-desc">Multi-part stories and deep dives, ordered chapter by chapter.</p>
        </div>
      </div>
      <section style={{ paddingTop: 46, paddingBottom: 100 }}>
        <div className="container">
          {isLoading && <Skeletons n={3} />}
          {!isLoading && !SUPABASE_CONFIGURED && (
            <EmptyState title="No data yet." note="Series appear once the backend is connected." />
          )}
          {!isLoading && SUPABASE_CONFIGURED && series && series.length === 0 && (
            <EmptyState title="No series yet." note="Authors can group related articles into a series from the editor." />
          )}
          {series && series.length > 0 && (
            <div className="series-list">
              {series.map((s, i) => (
                <Link key={s.id} to={'/blog/series/' + s.slug} className="series-chapter reveal">
                  <span className="sc-num">{String(i + 1).padStart(2, '0')}</span>
                  <span className="sc-title">{s.title}</span>
                  {s.description && <span className="pr-desc">{s.description.slice(0, 90)}</span>}
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
