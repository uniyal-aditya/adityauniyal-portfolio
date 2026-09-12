import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useReveal } from '@/hooks/useReveal'
import { Seo } from '@/lib/seo'
import { fetchProjectJournal } from '@/lib/journal-api'
import { SUPABASE_CONFIGURED } from '@/lib/supabase'
import { BuilderCell } from '@/components/journal/bits'

const NUMEXA_METRICS = [
  { num: '\u221E', label: 'Calculations served' },
  { num: '<1ms', label: 'Target response' },
  { num: '0', label: 'Downtime target' },
]

function BuildJournal({ project, title }: { project: string; title: string }) {
  const enabled = SUPABASE_CONFIGURED
  const { data: posts } = useQuery({
    queryKey: ['build-journal', project],
    queryFn: () => fetchProjectJournal(project),
    enabled,
  })
  if (!enabled || !posts?.length) return null
  return (
    <section id="build-journal">
      <div className="container">
        <div className="work-header reveal">
          <h2>
            Build
            <br />
            <em>journal</em>.
          </h2>
          <div className="work-header-meta">
            <Link to="/blog" style={{ color: 'var(--lime)', display: 'block', marginBottom: 6 }}>
              AU_ / JOURNAL &rarr;
            </Link>
            The stories behind {title}.
          </div>
        </div>
        <div className="builder-grid reveal d1">
          {posts.map((p, i) => (
            <BuilderCell key={p.id} post={p} num={i + 1} />
          ))}
        </div>
      </div>
    </section>
  )
}

export default function Work() {
  useReveal()
  return (
    <main>
      <Seo title="Work - Aditya Uniyal" description="Projects by Aditya Uniyal - Discord bots, web platforms, and interactive systems." path="/work" />
      <div className="page-top">
        <div className="container">
          <div className="pt-label">Selected work</div>
          <h1>
            Projects &amp; <em>Builds</em>
          </h1>
        </div>
      </div>

      {/* Featured: Numexa */}
      <section style={{ paddingBottom: 0 }}>
        <div className="container">
          <div className="project-featured-card reveal">
            <div>
              <div className="pf-eyebrow">// 01 &middot; Flagship &middot; Discord Bot</div>
              <h2 className="pf-title">Numexa</h2>
              <p className="pf-desc">
                A production-grade scientific Discord calculator bot. Advanced math expression parsing, multi-operation
                support, and a modular command architecture engineered for sub-millisecond response times &mdash; built
                for real users at scale.
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 24 }}>
                {['Python', 'discord.py', 'Math Parser', 'Command Architecture', 'Performance'].map((t) => (
                  <span className="tag" key={t}>
                    {t}
                  </span>
                ))}
              </div>
              <div className="pf-actions">
                <a href="https://numexa.vercel.app" target="_blank" rel="noopener noreferrer" className="status-live">
                  Live in production
                </a>
              </div>
            </div>
            <div className="pf-side">
              {NUMEXA_METRICS.map((m) => (
                <div className="pf-metric" key={m.label}>
                  <div className="pf-metric-num">{m.num}</div>
                  <div className="pf-metric-label">{m.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* All projects */}
      <section>
        <div className="container">
          <div className="project-list reveal">
            <a
              className="project-row"
              href="https://numexa.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
            >
              <div className="project-num">01</div>
              <div className="project-main">
                <div className="project-title">Numexa</div>
                <div className="project-desc">
                  Scientific calculator bot for Discord with advanced math parsing, expression evaluation, and a clean
                  command architecture built for accuracy at scale.
                </div>
              </div>
              <div className="project-tags">
                <span className="tag">Bot</span>
                <span className="tag">Math</span>
              </div>
              <div className="project-status">
                <span className="status-live">Live</span>
              </div>
            </a>
            <a
              className="project-row"
              href="https://github.com/uniyal-aditya/zero"
              target="_blank"
              rel="noopener noreferrer"
            >
              <div className="project-num">02</div>
              <div className="project-main">
                <div className="project-title">Music Bot Zero</div>
                <div className="project-desc">
                  High-performance Discord music bot with queue management, real-time streaming, skip/pause/resume
                  controls, and optimized playback for uninterrupted audio delivery.
                </div>
              </div>
              <div className="project-tags">
                <span className="tag">Bot</span>
                <span className="tag">Audio</span>
              </div>
              <div className="project-status">
                <span className="status-live">Live</span>
              </div>
            </a>
            <a
              className="project-row"
              href="https://delight-restro.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
            >
              <div className="project-num">03</div>
              <div className="project-main">
                <div className="project-title">Delight Restaurant</div>
                <div className="project-desc">
                  Full interactive restaurant website - dynamic menu display, table reservation flow, image gallery,
                  and fully responsive layout balancing elegant visual design with practical UX.
                </div>
              </div>
              <div className="project-tags">
                <span className="tag">Web</span>
                <span className="tag">UI</span>
              </div>
              <div className="project-status">
                <span className="status-live">Live</span>
              </div>
            </a>
            <div className="project-row" style={{ opacity: 0.55 }}>
              <div className="project-num">04</div>
              <div className="project-main">
                <div className="project-title">Next Project</div>
                <div className="project-desc">
                  Something new is in active development. Reach out if you want to collaborate on the next build.
                </div>
              </div>
              <div className="project-tags" />
              <div className="project-status">
                <span className="status-dev">In progress</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <BuildJournal project="Numexa" title="Numexa" />

      {/* CTA */}
      <section className="cta-band">
        <div className="eyebrow">
          <span />Open to projects
        </div>
        <h2>
          WANT SOMETHING
          <br />
          <em>built</em>?
        </h2>
        <p>I scope projects fast and build even faster. Let&apos;s talk about what you need.</p>
        <div className="actions">
          <Link to="/connect" className="btn-lime" style={{ fontSize: 13, padding: '14px 32px' }}>
            Start a conversation &rarr;
          </Link>
          <Link to="/connect" className="btn-ghost-line" style={{ fontSize: 13, padding: '14px 28px' }}>
            Hire options
          </Link>
        </div>
        <div className="respond-note">
          Responds within <span>24 hours</span>
        </div>
      </section>
    </main>
  )
}
