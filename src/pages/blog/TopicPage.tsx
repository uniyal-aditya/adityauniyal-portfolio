import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Seo } from '@/lib/seo'
import { fetchTopicPage } from '@/lib/journal-api'
import { SUPABASE_CONFIGURED } from '@/lib/supabase'
import { PostCard, PostRow, EmptyState, Skeletons } from '@/components/journal/bits'
import { useReveal } from '@/hooks/useReveal'

export default function TopicPage() {
  useReveal()
  const { slug = '' } = useParams()
  const enabled = SUPABASE_CONFIGURED && Boolean(slug)
  const { data, isLoading } = useQuery({
    queryKey: ['topic', slug],
    queryFn: () => fetchTopicPage(slug),
    enabled,
  })

  if (!enabled) {
    return <div className="container" style={{ paddingTop: 120 }}><EmptyState note="The journal backend is not connected yet." /></div>
  }
  if (isLoading) return <Skeletons n={3} />
  if (!data?.category) {
    return (
      <div className="container" style={{ paddingTop: 120 }}>
        <EmptyState title="Topic not found." />
        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <Link to="/blog" className="btn-ghost-line">Back to the journal</Link>
        </div>
      </div>
    )
  }
  const cat = data.category
  const [first, ...rest] = data.posts
  return (
    <div>
      <Seo title={cat.name + ' - AU_ / JOURNAL'} description={cat.description || 'Articles under ' + cat.name} path={'/blog/topic/' + cat.slug} />
      <div className="page-top" style={{ paddingBottom: 40 }}>
        <div className="container">
          <div className="pt-label">Topic</div>
          <h1>
            {cat.name.replace(/ /g, '')} <em style={{ textTransform: 'none' }}></em>
          </h1>
          <p className="topic-desc">{cat.description}</p>
          <div className="meta">{data.posts.length} articles</div>
        </div>
      </div>
      <section style={{ paddingTop: 40 }}>
        <div className="container">
          {data.posts.length === 0 ? (
            <EmptyState note="Nothing published under this topic yet." />
          ) : (
            <>
              {first && <div className="post-grid"><PostCard post={first} /></div>}
              {rest.length > 0 && (
                <div className="post-list" style={{ marginTop: 20 }}>
                  {rest.map((p, i) => (
                    <PostRow key={p.id} post={p} num={i + 2} viewsLikes />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  )
}
