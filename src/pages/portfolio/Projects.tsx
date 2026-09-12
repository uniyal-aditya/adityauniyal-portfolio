import { useReveal } from '@/hooks/useReveal'
import { Seo } from '@/lib/seo'
import { Tilt } from '@/components/ui/primitives'
import { Link } from 'react-router-dom'

interface Proj {
  id: string
  name: string
  type: string
  desc: string
  stack: string[]
  links: { label: string; href: string; primary?: boolean }[]
}

const PROJECTS: Proj[] = [
  {
    id: 'numexa',
    name: 'Numexa',
    type: 'Discord Bot',
    desc: 'Scientific calculator bot for Discord with advanced math parsing, expression evaluation, and a clean command architecture built for accuracy at scale.',
    stack: ['Python', 'discord.py', 'Math Parsing'],
    links: [
      { label: 'Add', href: 'https://discord.com/oauth2/authorize?client_id=1460289617264775333&permissions=5629501681765440&scope=bot+applications.commands', primary: true },
      { label: 'Source', href: 'https://github.com/uniyal-aditya/Numexa' },
      { label: 'Live', href: 'https://numexa.vercel.app', primary: true },
    ],
  },
  {
    id: 'music',
    name: 'Music Bot Zero',
    type: 'Discord Bot',
    desc: 'High-performance music bot with queue management, streaming integration, and optimized real-time playback architecture for Discord servers.',
    stack: ['Python', 'discord.py', 'FFmpeg', 'yt-dlp'],
    links: [
      { label: 'Add', href: 'https://discord.com/oauth2/authorize?client_id=1462040223872581797&permissions=8845475720850496&response_type=code&redirect_uri=https%3A%2F%2Fdiscord.gg%2FUAd3waUyD3&integration_type=0&scope=voice+applications.commands+bot', primary: true },
      { label: 'Source', href: 'https://github.com/uniyal-aditya/zero' },
    ],
  },
  {
    id: 'delight',
    name: 'Delight Restaurant',
    type: 'Web App',
    desc: 'Interactive restaurant website with dynamic menu display, table reservation system, and a fully responsive layout built for real-world use.',
    stack: ['HTML', 'CSS', 'JavaScript'],
    links: [{ label: 'Live', href: 'https://delight-restro.vercel.app', primary: true }],
  },
]

const ACCENTS: Record<string, string> = {
  numexa: '#0ea5e9',
  music: '#8b5cf6',
  delight: '#10b981',
}

export default function Projects() {
  useReveal()
  return (
    <main>
      <Seo title="Projects - Aditya Uniyal" description="Projects by Aditya Uniyal - Discord bots, web apps and interactive systems." path="/projects" />
      <div className="page-top">
        <div className="container">
          <div className="pt-label">Archive</div>
          <h1>
            Pro<em>jects</em>
          </h1>
        </div>
      </div>

      <section style={{ paddingTop: 60 }}>
        <div className="container">
          <div className="post-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
            {PROJECTS.map((p, i) => (
              <div key={p.id} className="reveal" style={{ transitionDelay: i * 0.08 + 's' }}>
                <Tilt max={4}>
                  <article
                    className="proj-card"
                    style={{
                      background: 'var(--sand)',
                      border: '1px solid var(--line)',
                      borderRadius: 6,
                      overflow: 'hidden',
                      height: '100%',
                      position: 'relative',
                    }}
                  >
                    <div style={{ height: 3, width: '100%', background: ACCENTS[p.id] ?? 'var(--lime)', opacity: 0.85 }} />
                    <div style={{ padding: '22px 22px 0', flex: 1, display: 'flex', flexDirection: 'column' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
                        <div>
                          <h3 style={{ fontFamily: 'var(--f-display)', fontSize: '1.7rem', letterSpacing: '0.01em', marginBottom: 2 }}>{p.name}</h3>
                          <span style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{p.type}</span>
                        </div>
                        <span className="status-live" style={{ fontFamily: 'var(--f-mono)', fontSize: 10 }}>
                          SHIPPED
                        </span>
                      </div>
                      <p style={{ fontSize: 14, color: 'var(--dim)', lineHeight: 1.65, marginBottom: 18, flex: 1 }}>{p.desc}</p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 20 }}>
                        {p.stack.map((s) => (
                          <span className="tag" key={s}>
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div style={{ padding: '14px 22px 20px', display: 'flex', gap: 8, borderTop: '1px solid var(--line)', flexWrap: 'wrap' }}>
                      {p.links.map((l) => (
                        <a
                          key={l.label}
                          href={l.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={l.primary ? 'btn-lime btn-small' : 'btn-ghost-line btn-small'}
                        >
                          {l.label}
                        </a>
                      ))}
                    </div>
                  </article>
                </Tilt>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 40 }} className="reveal d2">
            <Link to="/blog/search" className="btn-ghost-line">
              Read the build journals &rarr;
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
