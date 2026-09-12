import { useState, type FormEvent } from 'react'
import emailjs from '@emailjs/browser'
import { useReveal } from '@/hooks/useReveal'
import { Seo } from '@/lib/seo'

const EMAILJS_SERVICE = 'aditya_uniyal_portfolio'
const EMAILJS_TEMPLATE = 'portfolio_template'
const EMAILJS_PUBLIC_KEY = 'xPYwrcIVmeLYO2V6a'

const RATING_STYLES = `
  .star-rating { display: flex; flex-direction: row-reverse; gap: 4px; margin-top: 6px; }
  .star-rating button {
    font-size: 28px; color: var(--dim-3); background: none; border: none;
    cursor: pointer; transition: color .15s, transform .15s; line-height: 1; padding: 0 2px;
  }
  .star-rating button.on { color: #f59e0b; }
  .star-rating button:hover { transform: scale(1.15); color: #fbbf24; }
`

export default function Feedback() {
  useReveal()
  const [rating, setRating] = useState(0)
  const [sending, setSending] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    if (!rating) {
      setError('Please select a rating.')
      return
    }
    const form = e.currentTarget
    const data = new FormData(form)
    setSending(true)
    try {
      // Same EmailJS service/template as the legacy page.
      const params = {
        name: String(data.get('name') || 'Anonymous'),
        email: String(data.get('email') || ''),
        rating: String(rating),
        message: String(data.get('message') || ''),
        project: String(data.get('project') || ''),
      }
      await emailjs.send(EMAILJS_SERVICE, EMAILJS_TEMPLATE, params, { publicKey: EMAILJS_PUBLIC_KEY })
      setDone(true)
    } catch (err) {
      console.error(err)
      setError('Failed to send. Try again.')
    } finally {
      setSending(false)
    }
  }

  if (done) {
    return (
      <main>
        <Seo title="Feedback - Aditya Uniyal" path="/feedback" />
        <div style={{ minHeight: '70dvh', display: 'grid', placeItems: 'center' }}>
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center' }}>
            <div style={{ fontSize: '3rem', color: 'var(--lime)' }}>&#10003;</div>
            <div style={{ fontFamily: 'var(--f-display)', fontSize: '2.2rem' }}>Feedback sent.</div>
            <div style={{ fontFamily: 'var(--f-mono)', fontSize: 12, color: 'var(--dim)' }}>Thank you - it lands straight in my inbox.</div>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main>
      <style>{RATING_STYLES}</style>
      <Seo title="Feedback - Aditya Uniyal" description="Send feedback to Aditya Uniyal - share your experience with projects or the site." path="/feedback" />
      <div className="page-top">
        <div className="container">
          <div className="pt-label">Tell me honestly</div>
          <h1>
            Feed<em>back</em>
          </h1>
        </div>
      </div>
      <section style={{ paddingTop: 60 }}>
        <div className="container" style={{ maxWidth: 720 }}>
          <p style={{ color: 'var(--dim)', marginBottom: 32, fontSize: 15 }}>
            Your feedback helps me improve my projects and this site. Email is optional - add it only if you want a reply.
          </p>
          <form className="cf" onSubmit={onSubmit} noValidate>
            <div className="cf-row">
              <div className="cf-group">
                <label className="cf-label" htmlFor="fb-name">Name</label>
                <input className="cf-input" id="fb-name" name="name" type="text" placeholder="Your name" />
              </div>
              <div className="cf-group">
                <label className="cf-label" htmlFor="fb-email">Email (optional)</label>
                <input className="cf-input" id="fb-email" name="email" type="email" placeholder="you@example.com" />
              </div>
            </div>
            <div className="cf-group">
              <span className="cf-label">Rating</span>
              <div className="star-rating" role="radiogroup" aria-label="Rating out of 5">
                {[5, 4, 3, 2, 1].map((n) => (
                  <button
                    type="button"
                    key={n}
                    className={rating >= n ? 'on' : ''}
                    onClick={() => setRating(n)}
                    aria-checked={rating === n}
                    role="radio"
                    aria-label={n + ' stars'}
                  >
                    &#9733;
                  </button>
                ))}
              </div>
            </div>
            <div className="cf-group">
              <label className="cf-label" htmlFor="fb-msg">Message</label>
              <textarea className="cf-textarea" id="fb-msg" name="message" rows={6} required placeholder="Write your feedback..." />
            </div>
            <div className="cf-group">
              <label className="cf-label" htmlFor="fb-project">Related project (optional)</label>
              <select className="cf-input" id="fb-project" name="project" defaultValue="">
                <option value="">- none -</option>
                <option value="numexa">Numexa</option>
                <option value="music-bot-zero">Music Bot Zero</option>
                <option value="delight-restaurant">Delight Restaurant</option>
                <option value="raftarfun">RaftarFun</option>
                <option value="aichat">AI Chatbot</option>
              </select>
            </div>
            {error && <p style={{ color: 'var(--rust)', fontFamily: 'var(--f-mono)', fontSize: 12 }}>{error}</p>}
            <button type="submit" className="btn-lime" disabled={sending} style={{ justifyContent: 'center' }}>
              {sending ? 'SENDING...' : 'SEND FEEDBACK \u2192'}
            </button>
          </form>
        </div>
      </section>
    </main>
  )
}
