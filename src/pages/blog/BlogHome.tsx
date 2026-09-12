import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useReveal } from '@/hooks/useReveal'
import { Seo } from '@/lib/seo'
import { useDebounce } from '@/hooks/useDebounce'
import {
  fetchLatestPosts,
  fetchFeaturedPost,
  fetchTrendingPosts,
  fetchBuilderPosts,
  fetchCategories,
  fetchFeaturedWriters,
} from '@/lib/journal-api'
import { SUPABASE_CONFIGURED } from '@/lib/supabase'
import { PostCard, PostRow, WriterCard, EmptyState, Skeletons, Avatar, VerifiedBadge } from '@/components/journal/bits'
import { fmtDate } from '@/lib/sanitize'
import { Tilt } from '@/components/ui/primitives'
import type { Post } from '@/lib/types'

function Hero({ onSearch, q }: { onSearch: (q: string) => void; q: string }) {
  return (
    <header className="blog-hero">
      <div className="container">
        <div className="blog-hero-tag reveal">AU_ / JOURNAL</div>
        <h1 className="blog-hero-h1 reveal d1">
          IDEAS.
          <br />
          EXPERIMENTS.
          <br />
          THINGS WORTH <em>sharing</em>.
        </h1>
        <p className="blog-hero-sub reveal d2">
          Thoughts, build logs, tutorials, experiments and stories from the things I build and learn.
        </p>
        <form
          className="blog-search reveal d3"
          role="search"
          onSubmit={(e) => {
            e.preventDefault()
            onSearch((e.currentTarget.elements.namedItem('q') as HTMLInputElement).value)
          }}
        >
          <span className="bs-prompt">&gt;_</span>
          <input
            name="q"
            defaultValue={q}
            placeholder="Search articles, authors, tags..."
            aria-label="Search the journal"
          />
          <button type="submit" className="bs-go" aria-label="Search">
            &rarr;
          </button>
        </form>
      </div>
    </header>
  )
}

function TopicPills() {
  const { data: cats } = useQuery({ queryKey: ['categories'], queryFn: fetchCategories, enabled: SUPABASE_CONFIGURED })
  return (
    <div className="topic-pills container">
      <Link to="/blog/search" className="topic-pill active">
        All
      </Link>
      {(cats ?? []).map((c) => (
        <Link key={c.id} to={'/blog/topic/' + c.slug} className="topic-pill">
          {c.name}
        </Link>
      ))}
    </div>
  )
}

function FeaturedArticle({ post }: { post: Post }) {
  const cat = post.categories
  return (
    <section className="featured-band">
      <div className="container">
        <div className="section-label reveal">Featured</div>
        <Tilt max={2}>
          <Link to={'/blog/post/' + post.slug} className="featured-card reveal d1">
            <div className="fc-media">
              {post.cover_image_url ? (
                <img src={post.cover_image_url} alt={post.cover_image_alt || post.title} loading="lazy" />
              ) : (
                <span className="fm-fallback fm-big">AU_</span>
              )}
            </div>
            <div className="fc-body">
              <div className="meta">
                {cat && (
                  <Link className="cat-chip" to={'/blog/topic/' + cat.slug}>
                    {cat.name}
                  </Link>
                )}
                {post.post_type && <span className="type-chip">{post.post_type.replace('_', ' ')}</span>}
              </div>
              <h2>{post.title}</h2>
              {post.subtitle && <div className="fc-subtitle">{post.subtitle}</div>}
              <div className="pc-excerpt">{post.excerpt}</div>
              <div className="meta" style={{ marginTop: 18 }}>
                <Avatar profile={post.profiles} />
                <span>{post.profiles?.display_name || post.profiles?.username}</span>
                {post.profiles?.verified && <VerifiedBadge />}
                <span className="dot-sep">&middot;</span>
                <span>{fmtDate(post.published_at)}</span>
                <span className="dot-sep">&middot;</span>
                <span>{post.reading_time || 1} min read</span>
              </div>
            </div>
          </Link>
        </Tilt>
      </div>
    </section>
  )
}

function TrendingSection() {
  const { data, isLoading } = useQuery({ queryKey: ['trending'], queryFn: () => fetchTrendingPosts(5), enabled: SUPABASE_CONFIGURED })
  if (!SUPABASE_CONFIGURED) return null
  if (isLoading) return <Skeletons n={3} />
  if (!data?.length) return null
  return (
    <section>
      <div className="container">
        <div className="section-label reveal">Trending now</div>
        <div className="post-list reveal d1">
          {data.map((p, i) => (
            <PostRow key={p.id} post={p} num={i + 1} viewsLikes />
          ))}
        </div>
      </div>
    </section>
  )
}

function BuilderSection() {
  const { data, isLoading } = useQuery({ queryKey: ['builder'], queryFn: () => fetchBuilderPosts(4), enabled: SUPABASE_CONFIGURED })
  if (!SUPABASE_CONFIGURED) return null
  if (isLoading) return null
  if (!data?.length) return null
  return (
    <section className="builder-band">
      <div className="container">
        <div className="work-header reveal">
          <h2>
            From the
            <br />
            <em>builder</em>.
          </h2>
          <div className="work-header-meta">Journal entries tied to my own builds.</div>
        </div>
        <div className="post-grid reveal d1">
          {data.map((p) => (
            <PostCard key={p.id} post={p} />
          ))}
        </div>
      </div>
    </section>
  )
}

function WritersSection() {
  const { data } = useQuery({ queryKey: ['writers'], queryFn: () => fetchFeaturedWriters(6), enabled: SUPABASE_CONFIGURED })
  if (!SUPABASE_CONFIGURED) return null
  if (!data?.length) return null
  return (
    <section>
      <div className="container">
        <div className="section-label reveal">Featured writers</div>
        <div className="writers-grid reveal d1">
          {data.map((w) => (
            <WriterCard key={w.id} profile={w} />
          ))}
        </div>
      </div>
    </section>
  )
}

function NewsletterBand() {
  const [email, setEmail] = useState('')
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'error'>('idle')
  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.includes('@')) {
      setState('error')
      return
    }
    setState('busy')
    const { subscribeNewsletter } = await import('@/lib/journal-api')
    const err = await subscribeNewsletter(email)
    setState(err ? 'error' : 'done')
  }
  return (
    <section className="newsletter-band">
      <div className="container newsletter-inner">
        <div className="reveal">
          <div className="section-label">AU Weekly</div>
          <h2>
            One email. <em>Every week</em>.
          </h2>
          <p style={{ color: 'var(--dim)', maxWidth: '44ch' }}>
            Build logs, lessons and links - what I shipped, broke and learned. No spam, ever.
          </p>
        </div>
        <form className="nl-form reveal d2" onSubmit={submit}>
          {state === 'done' ? (
            <div className="es-note" style={{ color: 'var(--lime)' }}>You are in. Watch your inbox.</div>
          ) : (
            <>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                aria-label="Email address"
                required
              />
              <button className="btn-lime" type="submit" disabled={state === 'busy'}>
                {state === 'busy' ? '...' : 'Subscribe \u2192'}
              </button>
              {state === 'error' && <div className="es-note" style={{ color: 'var(--rust)' }}>That did not work - check the address.</div>}
            </>
          )}
        </form>
      </div>
    </section>
  )
}

function LatestSection() {
  const [shown, setShown] = useState(6)
  const { data, isLoading } = useQuery({ queryKey: ['latest-all'], queryFn: () => fetchLatestPosts(24), enabled: SUPABASE_CONFIGURED })
  if (!SUPABASE_CONFIGURED) {
    return (
      <section>
        <div className="container">
          <div className="section-label reveal">Latest articles</div>
          <EmptyState note="The journal backend is not connected yet. Check back soon." />
        </div>
      </section>
    )
  }
  if (isLoading) return <Skeletons n={6} />
  const posts = data ?? []
  return (
    <section>
      <div className="container">
        <div className="section-label reveal">Latest articles</div>
        {posts.length === 0 ? (
          <EmptyState note="No published articles yet. The first ones are on the way." />
        ) : (
          <>
            <div className="post-grid reveal d1">
              {posts.slice(0, shown).map((p) => (
                <PostCard key={p.id} post={p} />
              ))}
            </div>
            {shown < posts.length && (
              <div style={{ marginTop: 36, textAlign: 'center' }}>
                <button className="btn-ghost-line" onClick={() => setShown((s) => s + 6)}>
                  Load more &darr;
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  )
}

function CtaBand() {
  return (
    <section className="cta-band">
      <div className="eyebrow">
        <span />Write for AU Journal
      </div>
      <h2>
        HAVE SOMETHING <em>worth sharing</em>?
      </h2>
      <p>Tutorials, build logs, case studies, notes. If it is technical and honest, it belongs here.</p>
      <div className="actions">
        <Link to="/blog/apply" className="btn-lime" style={{ fontSize: 13, padding: '14px 32px' }}>
          Become a contributor &rarr;
        </Link>
        <Link to="/blog/search" className="btn-ghost-line" style={{ fontSize: 13, padding: '14px 28px' }}>
          Browse all topics
        </Link>
      </div>
    </section>
  )
}

export default function BlogHome() {
  useReveal()
  const navigate = useNavigate()
  const [q] = useState('')
  const dq = useDebounce(q, 350)
  void dq
  const { data: featured, isLoading: featLoading } = useQuery({
    queryKey: ['featured'],
    queryFn: fetchFeaturedPost,
    enabled: SUPABASE_CONFIGURED,
  })
  const { data: latest } = useQuery({ queryKey: ['latest-top'], queryFn: () => fetchLatestPosts(1), enabled: SUPABASE_CONFIGURED })
  const feat = featured ?? latest?.[0] ?? null

  return (
    <div className="blog-home">
      <Seo title="AU_ / JOURNAL - Aditya Uniyal" description="Ideas, experiments, things worth sharing. Build logs, tutorials and notes from Aditya Uniyal." path="/blog" />
      <Hero q={q} onSearch={(v) => (v ? navigate('/blog/search?q=' + encodeURIComponent(v)) : undefined)} />
      <TopicPills />
      {SUPABASE_CONFIGURED && featLoading && <Skeletons n={3} />}
      {feat && <FeaturedArticle post={feat} />}
      <TrendingSection />
      <LatestSection />
      <BuilderSection />
      <WritersSection />
      <CtaBand />
      <NewsletterBand />
    </div>
  )
}
