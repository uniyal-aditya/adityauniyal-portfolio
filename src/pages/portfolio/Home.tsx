import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTypewriter } from '@/hooks/useTypewriter'
import { useReveal } from '@/hooks/useReveal'
import { fetchLatestPosts, fetchSeriesPage } from '@/lib/journal-api'
import { Seo } from '@/lib/seo'
import { fmtDate } from '@/lib/sanitize'
import type { Post } from '@/lib/types'
import { supabase, SUPABASE_CONFIGURED, OWNER_USERNAME } from '@/lib/supabase'
import { CURRENT_PROJECT } from '@/data/building'
import { fetchBuilding } from '@/lib/github'

const PROJECTS = [
  { num: '01', title: 'Numexa', desc: 'Scientific Discord calculator bot - advanced math parsing, sub-ms response', tags: ['Python', 'discord.py', 'Bot'] },
  { num: '02', title: 'Music Bot Zero', desc: 'High-performance Discord music bot - queue, streaming, real-time playback', tags: ['Python', 'FFmpeg', 'asyncio'] },
  { num: '03', title: 'Delight Restaurant', desc: 'Interactive restaurant site - menu, reservations, responsive design', tags: ['HTML', 'CSS', 'JS'] },
]

const SKILLS = ['Python', 'JavaScript', 'discord.py', 'Node.js', 'FFmpeg', 'REST APIs', 'Git & GitHub', 'asyncio', 'Netlify', 'Responsive Design', 'System Architecture', 'WebSockets']

const TICKER = [
  ['Available', 'Freelance & Collab'],
  ['Python', 'JavaScript / Web'],
  ['Discord Bots', 'Scalable Systems'],
  ['India', 'Remote Worldwide'],
  ['24h', 'Response Time'],
]

/** ~/au/building $ — restrained live preview of the Building page (task #67). */
function BuildingPreview() {
  const { data } = useQuery({ queryKey: ['github-building'], queryFn: fetchBuilding, staleTime: 10 * 60_000, retry: 1 })
  const last = data?.events?.[0]
  const second = data?.events?.[1]
  return (
    <section style={{ borderTop: '1px solid var(--line)', padding: '90px 0' }} id="building-preview">
      <div className="container">
        <p className="terminal-line" style={{ color: 'var(--dim-3)', fontFamily: 'var(--f-mono)', fontSize: 13 }} aria-hidden="true">~/au/building $</p>
        <div className="work-header" style={{ marginBottom: 34 }}>
          <h2>
            Currently
            <br />
            <em>building</em>.
          </h2>
          <div className="work-header-meta">
            <Link to="/building" style={{ color: 'var(--lime)', textDecoration: 'none', display: 'inline-block', padding: '6px 0' }}>AU_ / BUILDING &rarr;</Link>
            <span>A live snapshot of what I'm building.</span>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
          <div className="dash-card" style={{ padding: '22px 24px' }}>
            <div className="toc-label">Now</div>
            <div style={{ fontFamily: 'var(--f-display)', fontSize: '1.7rem', margin: '6px 0 2px' }}>{CURRENT_PROJECT.name}</div>
            <div className="meta" style={{ fontFamily: 'var(--f-mono)', fontSize: 12, color: 'var(--lime)', display: 'inline-flex', alignItems: 'center', gap: 7 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--lime)', display: 'inline-block' }} aria-hidden />
              {CURRENT_PROJECT.status}
            </div>
            {last && <div className="meta" style={{ marginTop: 12 }}>Latest: {last.payload?.commits?.[0]?.message?.split('\n')[0]?.slice(0, 40) || last.type.replace('Event', '')} · {new Date(last.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}</div>}
          </div>
          <div className="dash-card" style={{ padding: '22px 24px' }}>
            <div className="toc-label">Recent activity</div>
            <ol style={{ listStyle: 'none', margin: '10px 0 0', padding: 0 }}>
              {[last, second].map((e, i) =>
                e ? (
                  <li key={e.id} className="meta" style={{ fontFamily: 'var(--f-mono)', fontSize: 12, padding: '5px 0', borderBottom: i === 0 ? '1px solid var(--line)' : 'none' }}>
                    {e.type === 'PushEvent' ? 'Commit' : e.type === 'PullRequestEvent' ? 'Pull Request' : e.type.replace('Event', '')} · {e.repo} · {new Date(e.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                  </li>
                ) : (
                  <li key={'ph' + i} className="meta" style={{ padding: '5px 0', color: 'var(--dim-3)' }}>No further recent activity</li>
                ),
              )}
            </ol>
            <Link to="/building" className="meta" style={{ display: 'inline-block', marginTop: 10, padding: '8px 0', color: 'var(--lime)', textDecoration: 'none', fontFamily: 'var(--f-mono)' }}>
              VIEW BUILDING &rarr;
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}

function TickerRow() {
  return (
    <>
      {TICKER.map(([a, b], i) => (
        <div className="hero-bar-item" key={i}>
          <strong>{a}</strong>
          <span className="sep">&middot;</span> {b}
        </div>
      ))}
    </>
  )
}

/** Latest 3 journal posts teaser for the homepage. */
function JournalTeaser() {
  useReveal()
  const { data: posts, isLoading } = useQuery({
    queryKey: ['journal-teaser'],
    queryFn: () => fetchLatestPosts(3),
    enabled: SUPABASE_CONFIGURED,
  })
  const { data: mine } = useQuery({
    queryKey: ['journal-teaser-owner'],
    queryFn: async () => {
      const { data: prof } = await supabase.from('profiles').select('id').eq('username', OWNER_USERNAME).single()
      if (!prof) return [] as Post[]
      const { data } = await supabase
        .from('posts')
        .select('*')
        .eq('status', 'published')
        .eq('author_id', prof.id)
        .order('published_at', { ascending: false })
        .limit(3)
      return (data ?? []) as Post[]
    },
    enabled: SUPABASE_CONFIGURED,
  })
  const list = (mine && mine.length ? mine : posts) ?? []
  if (isLoading) {
    return (
      <div className="post-grid">
        {[0, 1, 2].map((i) => (
          <div key={i} className="skeleton skel-card" />
        ))}
      </div>
    )
  }
  if (!SUPABASE_CONFIGURED || !list.length) {
    return (
      <div className="empty-state compact">
        <div className="es-glyph">[ ]</div>
        <div className="es-title">First entries landing soon.</div>
        <div className="es-note">The journal is being set up.</div>
      </div>
    )
  }
  return (
    <div className="post-grid">
      {list.map((p) => (
        <article key={p.id} className="post-card reveal">
          <Link className="pc-media" to={'/blog/post/' + p.slug} aria-hidden="true" tabIndex={-1}>
            {p.cover_image_url ? (
              <img src={p.cover_image_url} alt={p.cover_image_alt || p.title} loading="lazy" />
            ) : (
              <span className="fm-fallback">AU_</span>
            )}
          </Link>
          <div className="pc-body">
            <div className="meta">
              {p.post_type && <span className="type-chip">{p.post_type.replace('_', ' ')}</span>}
            </div>
            <h3>
              <Link to={'/blog/post/' + p.slug}>{p.title}</Link>
            </h3>
            <div className="pc-excerpt">{p.excerpt}</div>
            <div className="pc-foot meta">
              <span>{fmtDate(p.published_at || p.created_at)}</span>
              <span className="dot-sep">&middot;</span>
              <span>{p.reading_time || 1} min</span>
            </div>
          </div>
        </article>
      ))}
    </div>
  )
}

/** 'Building AU_ / JOURNAL' series callout - hidden until the series exists. */
const SERIES_SLUG = 'building-au-journal'
function SeriesCallout() {
  const { data } = useQuery({
    queryKey: ['home-series-callout'],
    queryFn: () => fetchSeriesPage(SERIES_SLUG),
    enabled: SUPABASE_CONFIGURED,
  })
  if (!SUPABASE_CONFIGURED || !data?.series || !data.chapters.length) return null
  const start = data.chapters[0]
  return (
    <Link to={'/blog/series/' + SERIES_SLUG} className="dash-card reveal d2" style={{ display: 'block', marginTop: 28, textDecoration: 'none' }}>
      <div className="toc-label">SERIES</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, flexWrap: 'wrap', padding: '10px 0 4px' }}>
        <span style={{ fontFamily: 'var(--f-display)', fontSize: '1.7rem', letterSpacing: '0.01em' }}>
          Building AU_<span style={{ color: 'var(--lime)' }}>_</span> / JOURNAL
        </span>
        <span className="meta" style={{ color: 'var(--lime)' }}>{data.chapters.length} CHAPTERS</span>
      </div>
      <div className="meta" style={{ marginBottom: 14 }}>{data.series.description}</div>
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        <span className="btn-ghost-line btn-small">START READING · 01 &rarr;</span>
        <span className="meta">
          {String(data.chapters.length).padStart(2, '0')}/{String(data.chapters.length).padStart(2, '0')} published
        </span>
      </div>
      <span className="sr-only">First chapter: {start?.title}</span>
    </Link>
  )
}

export default function Home() {
  useReveal()
  const typed = useTypewriter()
  return (
    <main>
      <Seo title="Aditya Uniyal - Developer" path="/" />

      {/* HERO */}
      <section className="hero">
        <div className="hero-content">
          <div className="hero-left">
            <div className="hero-tag">Aditya Uniyal &middot; Developer &middot; India</div>
            <h1 className="hero-h1">
              SYSTEMS
              <br />
              THAT <em>work</em>.
            </h1>
          </div>
          <div className="hero-right">
            <div className="hero-typed-line">
              <span className="prompt">~/au $</span>
              <span id="typed-text">{typed}</span>
              <span className="cursor-blink" />
            </div>
            <p className="hero-desc">
              I design and build <span>scalable backends</span>, intelligent Discord bots, and interactive web
              platforms &mdash; with obsessive attention to architecture and performance.
            </p>
            <div className="hero-actions">
              <Link to="/work" className="btn-lime">
                View Work &rarr;
              </Link>
              <Link to="/connect" className="btn-ghost-line">
                Hire Me
              </Link>
            </div>
          </div>
        </div>

        <div className="hero-bar">
          <div className="hero-bar-ticker">
            <TickerRow />
          </div>
          <div className="hero-bar-ticker" aria-hidden="true">
            <TickerRow />
          </div>
        </div>

        <div className="hero-bg-text">BUILD</div>
      </section>

      {/* ABOUT SNAP */}
      <section>
        <div className="container">
          <div className="about-grid">
            <div className="about-number">AU</div>
            <div className="about-copy reveal">
              <div className="eyebrow">Who I am</div>
              <h2>
                Developer
                <br />
                by <em>obsession</em>.
              </h2>
              <p>
                I build things from first principles &mdash; starting with system design before writing a single line.{' '}
                <span>Architecture first, implementation second</span>, always.
              </p>
              <p>
                From Discord bots that handle complex scientific calculations to restaurant websites with silky
                reservation flows, I build across the full stack with <span>Python, JavaScript, and modern web tools</span>.
              </p>
              <div style={{ marginTop: 28, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <Link to="/about" className="btn-ghost-line">
                  Full story &rarr;
                </Link>
                <a href="/assets/Aditya_Uniyal_Resume.pdf" download className="btn-lime" style={{ fontSize: 11, padding: '12px 22px' }}>
                  Download Resume
                </a>
              </div>
            </div>
            <div className="about-aside reveal d2">
              <div className="aside-block">
                <div className="label">Status</div>
                <div className="value">
                  Open to work
                  <small>Freelance &middot; Collab &middot; Mentoring</small>
                </div>
              </div>
              <div className="aside-block">
                <div className="label">Based in</div>
                <div className="value">
                  India <small>Remote worldwide</small>
                </div>
              </div>
              <div className="aside-block stat-row">
                <div className="stat-big">3+</div>
                <div className="stat-label">Production projects</div>
              </div>
              <div className="aside-block stat-row">
                <div className="stat-big">&#8734;</div>
                <div className="stat-label">Coffees consumed</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SELECTED WORK */}
      <section style={{ borderTop: '1px solid var(--line)' }}>
        <div className="container">
          <div className="work-header reveal">
            <h2>
              Selected
              <br />
              <em>work</em>.
            </h2>
            <div className="work-header-meta">
              <span>03</span>
              Projects shipped
            </div>
          </div>
          <div className="project-list reveal d1">
            {PROJECTS.map((p) => (
              <Link to="/work" key={p.num} className="project-row">
                <div className="project-num">{p.num}</div>
                <div className="project-main">
                  <div className="project-title">{p.title}</div>
                  <div className="project-desc">{p.desc}</div>
                </div>
                <div className="project-tags">
                  {p.tags.map((t) => (
                    <span className="tag" key={t}>
                      {t}
                    </span>
                  ))}
                </div>
                <div className="project-status">
                  <span className="status-live">Live</span>
                </div>
              </Link>
            ))}
          </div>
          <div style={{ marginTop: 40 }} className="reveal d3">
            <Link to="/work" className="btn-ghost-line">
              View all projects &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* ~/au/building $ — restrained live preview */}
      <BuildingPreview />

      {/* FROM THE JOURNAL */}
      <section id="from-the-journal" style={{ borderTop: '1px solid var(--line)', padding: '100px 0' }}>
        <div className="container">
          <div className="work-header reveal">
            <h2>
              From the
              <br />
              <em>journal</em>.
            </h2>
            <div className="work-header-meta">
              <Link to="/blog" className="text-link" style={{ color: 'var(--lime)', display: 'inline-block', marginBottom: 6, padding: '8px 0' }}>
                AU_ / JOURNAL &rarr;
              </Link>
              Ideas. Experiments.
              <br />
              Things worth sharing.
            </div>
          </div>
          <div className="reveal d1">
            <JournalTeaser />
          </div>
          <SeriesCallout />
          <div style={{ marginTop: 36 }} className="reveal d3">
            <Link to="/blog" className="btn-ghost-line">
              Read the journal &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* SKILLS MARQUEE */}
      <section style={{ borderTop: '1px solid var(--line)', padding: '80px 0' }}>
        <div className="skills-eyebrow reveal">Stack &amp; Tools</div>
        <div className="skills-marquee-wrap">
          <div className="skills-marquee">
            {[0, 1].map((dup) => (
              <div key={dup} style={{ display: 'flex', gap: 12 }}>
                {SKILLS.map((s) => (
                  <span className="skill-pill" key={dup + s}>
                    {s}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA BAND */}
      <section className="cta-band">
        <div className="eyebrow">
          <span />Currently available
        </div>
        <h2>
          GOT A <em>project</em>?
          <br />
          LET&apos;S BUILD.
        </h2>
        <p>
          Whether it&apos;s a bot, a web app, or a full system &mdash; I bring clean architecture, fast delivery, and
          genuine craft to every project.
        </p>
        <div className="actions">
          <Link to="/connect" className="btn-lime" style={{ fontSize: 13, padding: '14px 32px' }}>
            Start a conversation &rarr;
          </Link>
          <Link to="/connect" className="btn-ghost-line" style={{ fontSize: 13, padding: '14px 28px' }}>
            View hire options
          </Link>
        </div>
        <div className="respond-note">
          Responds within <span>24 hours</span> &middot; Fiverr &middot; LinkedIn &middot; Direct
        </div>
      </section>
    </main>
  )
}
