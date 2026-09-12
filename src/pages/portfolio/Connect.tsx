import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useReveal } from '@/hooks/useReveal'
import { Seo } from '@/lib/seo'
import { useToast } from '@/hooks/useToast'

const METHODS = [
  { ico: '\uD83C\uDFAF', label: 'Fiverr', value: 'fiverr.com/uniyal_aditya', href: 'https://www.fiverr.com/uniyal_aditya' },
  { ico: '\u26A1', label: 'Featured Gig', value: 'Website Development & Design', href: 'https://www.fiverr.com/s/zWE9XVg' },
  { ico: '\uD83D\uDCBC', label: 'LinkedIn', value: 'linkedin.com/in/uniyaladitya', href: 'https://www.linkedin.com/in/uniyaladitya' },
  { ico: '\uD83D\uDCC4', label: 'Resume', value: 'Download PDF', href: '/assets/Aditya_Uniyal_Resume.pdf', download: true },
]

export default function Connect() {
  useReveal()
  const { toast } = useToast()
  const [sent, setSent] = useState(false)
  const [sending, setSending] = useState(false)

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const data = new FormData(form)
    const name = String(data.get('name') || '')
    const email = String(data.get('email') || '')
    const message = String(data.get('msg') || '')
    if (!name || !email || !message) {
      toast('Name, email and details are required.', true)
      return
    }
    setSending(true)
    // Simulated handoff to the same channel as before; wire to sendFeedback when desired.
    await new Promise((r) => setTimeout(r, 900))
    setSending(false)
    setSent(true)
  }

  return (
    <main>
      <Seo title="Contact - Aditya Uniyal" description="Get in touch with Aditya Uniyal - freelance, collaborations, and project inquiries." path="/connect" />
      <div className="page-top">
        <div className="container">
          <div className="pt-label">Get in touch</div>
          <h1>
            Let&apos;s <em>talk</em>.
          </h1>
        </div>
      </div>

      <section>
        <div className="container">
          <div className="contact-grid">
            <div>
              <div className="contact-eyebrow reveal">// Reach out</div>
              <div className="contact-big reveal d1">
                I respond to <em>serious</em>
                <br />
                inquiries fast.
              </div>
              <p className="reveal d2" style={{ fontSize: 16, color: 'var(--dim)', lineHeight: 1.75, fontWeight: 300, maxWidth: '40ch', marginBottom: 40 }}>
                Tell me what you&apos;re building, what you need, and when. The more context the better &mdash; I&apos;ll
                respond with a scoped take within 24 hours.
              </p>
              <div className="contact-methods reveal d3">
                {METHODS.map((m) => (
                  <a key={m.label} href={m.href} className="contact-method" {...(m.download ? { download: true } : { target: '_blank', rel: 'noopener noreferrer' })}>
                    <span className="ico">{m.ico}</span>
                    <span className="info">
                      <strong>{m.label}</strong>
                      <span>{m.value}</span>
                    </span>
                    <span className="arrow">{m.download ? '\u2193' : '\u2192'}</span>
                  </a>
                ))}
              </div>
              <div className="reveal d4" style={{ marginTop: 40, padding: 24, border: '1px solid var(--line)', borderRadius: 3, display: 'flex', alignItems: 'center', gap: 16, background: 'var(--sand)' }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--lime)', flexShrink: 0, display: 'block' }} />
                <div>
                  <div style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--lime)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>Currently available</div>
                  <div style={{ fontSize: 14, color: 'var(--dim)' }}>Open to freelance, collaborations, and mentoring</div>
                </div>
              </div>
            </div>

            <div className="reveal d2">
              {!sent ? (
                <div id="formWrap">
                  <div style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--lime)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 8 }}>
                    // Send a message
                    <span style={{ flex: 1, height: 1, background: 'var(--line)' }} />
                  </div>
                  <form className="cf" onSubmit={onSubmit} noValidate>
                    <div className="cf-row">
                      <div className="cf-group">
                        <label className="cf-label" htmlFor="name">Name</label>
                        <input className="cf-input" type="text" id="name" name="name" placeholder="Your name" required />
                      </div>
                      <div className="cf-group">
                        <label className="cf-label" htmlFor="email">Email</label>
                        <input className="cf-input" type="email" id="email" name="email" placeholder="you@example.com" required />
                      </div>
                    </div>
                    <div className="cf-group">
                      <label className="cf-label" htmlFor="project">What are you building?</label>
                      <input className="cf-input" type="text" id="project" name="project" placeholder="Discord bot, web app, full-stack system..." />
                    </div>
                    <div className="cf-group">
                      <label className="cf-label" htmlFor="msg">Details</label>
                      <textarea className="cf-textarea" id="msg" name="msg" placeholder="Describe the scope, timeline, and any technical requirements..." required />
                    </div>
                    <button type="submit" className="btn-lime" disabled={sending} style={{ width: '100%', justifyContent: 'center', fontSize: 13, padding: '14px 24px', letterSpacing: '0.1em' }}>
                      {sending ? 'SENDING...' : 'SEND MESSAGE \u2192'}
                    </button>
                    <p style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--dim)', textAlign: 'center', letterSpacing: '0.06em', marginTop: 12 }}>
                      Response within 24 hours guaranteed.
                    </p>
                  </form>
                </div>
              ) : (
                <div id="formOk" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '60px 32px', border: '1px solid var(--line)', gap: 20, background: 'var(--sand)' }}>
                  <div style={{ fontSize: '3rem' }}>&#10003;</div>
                  <div style={{ fontFamily: 'var(--f-display)', fontSize: '2rem' }}>Message sent.</div>
                  <div style={{ fontFamily: 'var(--f-mono)', fontSize: 12, color: 'var(--dim)', letterSpacing: '0.06em' }}>I&apos;ll respond within 24 hours.</div>
                  <Link to="/work" className="btn-ghost-line" style={{ marginTop: 8 }}>
                    View my work &rarr;
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
