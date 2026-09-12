import { Link } from 'react-router-dom'
import { useReveal } from '@/hooks/useReveal'
import { Seo } from '@/lib/seo'

const PRINCIPLES = [
  { n: '01', t: 'System before syntax', d: 'Design the architecture. Map the data flows. Think through edge cases. Then open the editor.' },
  { n: '02', t: 'Readable over clever', d: 'The next developer - including future me - deserves code they can understand and extend without dread.' },
  { n: '03', t: 'Performance is a feature', d: 'Every wasted millisecond compounds. I optimize early and deliberately, not as an afterthought.' },
  { n: '04', t: 'Ship, then refine', d: 'Shipped software that works beats unfinished perfection every time. Iterate in the open.' },
  { n: '05', t: 'UI earns logic trust', d: 'Elegant interfaces and robust logic are not in conflict. Great software demands both.' },
  { n: '06', t: 'Always learning', d: 'Technology evolves. Intellectual curiosity and depth of study are not optional - they are the job.' },
]

const INTERESTS = [
  ['\uD83C\uDFAE', 'Competitive gaming'],
  ['\uD83E\uDD16', 'Exploring AI systems'],
  ['\u2699\uFE0F', 'Building automation tools'],
  ['\uD83D\uDCDA', 'Deep-diving backend architecture'],
  ['\u2615', 'Coffee & late night commits'],
]

export default function About() {
  useReveal()
  return (
    <main>
      <Seo title="About - Aditya Uniyal" description="About Aditya Uniyal - developer focused on scalable systems, bots, and web platforms." path="/about" />
      <div className="page-top">
        <div className="container">
          <div className="pt-label">Who I am</div>
          <h1>
            Aditya <em>Uniyal</em>
          </h1>
        </div>
      </div>

      <section>
        <div className="container">
          <div className="about-grid">
            <div className="about-number">03</div>
            <div className="about-copy reveal">
              <div className="eyebrow">Background</div>
              <h2>
                Building from
                <br />
                <em>first principles</em>.
              </h2>
              <p>
                My obsession with <span>how things actually work</span> - not just that they work - started early.
                What makes a bot respond in milliseconds? What separates code you can extend from code that breaks
                when you breathe on it?
              </p>
              <p>
                That curiosity hardened into a discipline: <span>design the system before touching the keyboard</span>.
                Think about the edge cases. Model the data flow. Then build.
              </p>
              <p>
                Today I work across Python, JavaScript, and the web stack - building everything from Discord bots
                handling thousands of interactions to client-facing web experiences that feel fast and intentional.
              </p>
              <div style={{ marginTop: 32, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <a href="/assets/Aditya_Uniyal_Resume.pdf" download className="btn-lime" style={{ fontSize: 11, padding: '12px 22px' }}>
                  Download Resume
                </a>
                <Link to="/connect" className="btn-ghost-line">
                  Get in touch &rarr;
                </Link>
              </div>
            </div>
            <div className="about-aside reveal d2">
              <div className="aside-block">
                <div className="label">Location</div>
                <div className="value">
                  India <small>Remote-first worldwide</small>
                </div>
              </div>
              <div className="aside-block">
                <div className="label">Available for</div>
                <div className="value">
                  Freelance &middot; Collaborations
                  <small>Mentoring &amp; open source</small>
                </div>
              </div>
              <div className="aside-block">
                <div className="label">Platforms</div>
                <div className="value">
                  <a href="https://www.fiverr.com/uniyal_aditya" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--lime)', fontFamily: 'var(--f-mono)', fontSize: 13, display: 'block', marginBottom: 6 }}>
                    Fiverr &#8599;
                  </a>
                  <a href="https://www.linkedin.com/in/uniyaladitya" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--lime)', fontFamily: 'var(--f-mono)', fontSize: 13, display: 'block' }}>
                    LinkedIn &#8599;
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section style={{ borderTop: '1px solid var(--line)' }}>
        <div className="container">
          <div style={{ marginBottom: 56 }} className="reveal">
            <div style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--lime)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
              // How I work
              <span style={{ flex: 1, height: 1, background: 'var(--line)', display: 'block' }} />
            </div>
            <h2 style={{ fontFamily: 'var(--f-display)', fontSize: 'clamp(2.5rem,5vw,4.5rem)', lineHeight: 0.95 }}>
              My <em style={{ fontFamily: 'var(--f-serif)', fontStyle: 'italic', color: 'var(--rust)' }}>principles</em>.
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px,1fr))', gap: 1, background: 'var(--line)', border: '1px solid var(--line)' }} className="reveal d1">
            {PRINCIPLES.map((p) => (
              <div key={p.n} style={{ background: 'var(--ink)', padding: '32px 28px' }}>
                <div style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--lime)', letterSpacing: '0.14em', marginBottom: 16 }}>{p.n}</div>
                <h4 style={{ fontFamily: 'var(--f-display)', fontSize: '1.5rem', marginBottom: 10 }}>{p.t}</h4>
                <p style={{ fontSize: 14, color: 'var(--dim)', lineHeight: 1.65 }}>{p.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{ borderTop: '1px solid var(--line)' }}>
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, alignItems: 'start' }}>
            <div className="reveal">
              <div style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--lime)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 20 }}>
                // Beyond code
              </div>
              <h2 style={{ fontFamily: 'var(--f-display)', fontSize: 'clamp(2rem,4vw,3.2rem)', lineHeight: 0.95, marginBottom: 24 }}>
                What I do when
                <br />
                I&apos;m not <em style={{ fontFamily: 'var(--f-serif)', fontStyle: 'italic', color: 'var(--rust)' }}>coding</em>.
              </h2>
              <p style={{ fontSize: 16, color: 'var(--dim)', lineHeight: 1.75, fontWeight: 300 }}>
                The best developers I&apos;ve met all had something that filled them outside the terminal - competitive
                gaming, music, writing, math for fun. Mine is a mix of competitive gaming, exploring AI systems, and
                building small automation tools that scratch an itch.
              </p>
            </div>
            <div className="reveal d2" style={{ display: 'flex', flexDirection: 'column', border: '1px solid var(--line)' }}>
              {INTERESTS.map(([ico, label], i) => (
                <div key={label} style={{ padding: '20px 24px', borderBottom: i < INTERESTS.length - 1 ? '1px solid var(--line)' : 'none', display: 'flex', alignItems: 'center', gap: 16, transition: 'background .2s' }}>
                  <span style={{ fontSize: 20 }}>{ico}</span>
                  <span style={{ fontSize: 15, color: 'var(--bone)' }}>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="cta-band">
        <div className="eyebrow">
          <span />Let’s connect
        </div>
        <h2>
          READY TO
          <br />
          <em>build</em>?
        </h2>
        <p>I’m open to interesting projects, serious collaborations, and anything that’s genuinely challenging.</p>
        <div className="actions">
          <Link to="/connect" className="btn-lime" style={{ fontSize: 13, padding: '14px 32px' }}>
            Get in touch →
          </Link>
          <Link to="/connect" className="btn-ghost-line" style={{ fontSize: 13, padding: '14px 28px' }}>
            Hire options
          </Link>
        </div>
      </section>
    </main>
  )
}
