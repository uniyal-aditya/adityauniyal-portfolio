import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Seo } from '@/lib/seo'
import { searchJournal, fetchCategories } from '@/lib/journal-api'
import { SUPABASE_CONFIGURED } from '@/lib/supabase'
import { PostRow, EmptyState, Skeletons } from '@/components/journal/bits'
import { useDebounce } from '@/hooks/useDebounce'
import { useReveal } from '@/hooks/useReveal'

const TYPES = [
  ['', 'All types'],
  ['article', 'Article'],
  ['tutorial', 'Tutorial'],
  ['guide', 'Guide'],
  ['build_log', 'Build Log'],
  ['note', 'Note'],
  ['case_study', 'Case Study'],
  ['project_journal', 'Project Journal'],
]

const SORTS = [
  ['relevance', 'Relevance'],
  ['newest', 'Newest'],
  ['views', 'Most viewed'],
  ['likes', 'Most liked'],
  ['bookmarks', 'Most bookmarked'],
]

export default function SearchPage() {
  useReveal()
  const [params, setParams] = useSearchParams()
  const [q, setQ] = useState(params.get('q') ?? '')
  const dq = useDebounce(q, 350)
  const category = params.get('category') ?? ''
  const type = params.get('type') ?? ''
  const sort = params.get('sort') ?? 'newest'

  useEffect(() => {
    const next = new URLSearchParams(params)
    if (dq) next.set('q', dq)
    else next.delete('q')
    if (next.toString() !== params.toString()) setParams(next, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dq])

  const { data, isLoading } = useQuery({
    queryKey: ['search', dq, category, type, sort],
    queryFn: () =>
      searchJournal({ q: dq, category: category || undefined, type: type || undefined, sort: sort as never }),
    enabled: SUPABASE_CONFIGURED,
  })

  const { data: cats } = useQuery({ queryKey: ['categories'], queryFn: fetchCategories, enabled: SUPABASE_CONFIGURED })

  function set(key: string, value: string) {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next, { replace: true })
  }

  const results = data ?? []
  return (
    <div>
      <Seo title="Search - AU_ / JOURNAL" description="Search articles, authors, tags and topics across the journal." path="/blog/search" />
      <div className="page-top" style={{ paddingBottom: 36 }}>
        <div className="container">
          <div className="pt-label">Find anything</div>
          <h1>
            Search the <em>journal</em>
          </h1>
        </div>
      </div>

      <section style={{ paddingTop: 24 }}>
        <div className="container">
          <form className="blog-search" style={{ marginBottom: 24 }} role="search" onSubmit={(e) => e.preventDefault()}>
            <span className="bs-prompt">&gt;_</span>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search articles, authors, tags..."
              aria-label="Search the journal"
              autoFocus
            />
          </form>

          <div className="filter-bar meta">
            <select value={category} onChange={(e) => set('category', e.target.value)} aria-label="Filter by topic">
              <option value="">All topics</option>
              {(cats ?? []).map((c) => (
                <option key={c.id} value={c.slug}>{c.name}</option>
              ))}
            </select>
            <select value={type} onChange={(e) => set('type', e.target.value)} aria-label="Filter by type">
              {TYPES.map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
            <select value={sort} onChange={(e) => set('sort', e.target.value)} aria-label="Sort results">
              {SORTS.map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
            <span style={{ marginLeft: 'auto' }}>{isLoading ? '...' : results.length + ' results'}</span>
          </div>

          <div style={{ marginTop: 28 }}>
            {!SUPABASE_CONFIGURED ? (
              <EmptyState note="The journal backend is not connected yet." />
            ) : isLoading ? (
              <Skeletons n={4} />
            ) : results.length === 0 ? (
              <EmptyState title="Nothing found." note="Try a different search or clear the filters." />
            ) : (
              <div className="post-list">
                {results.map((p, i) => (
                  <PostRow key={p.id} post={p} num={i + 1} viewsLikes />
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
