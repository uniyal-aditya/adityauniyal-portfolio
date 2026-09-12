import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Seo } from '@/lib/seo'
import { submitApplication } from '@/lib/journal-api'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/useToast'
import { useReveal } from '@/hooks/useReveal'

export default function ApplyPage() {
  useReveal()
  const { user, profile } = useAuth()
  const { toast } = useToast()
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const d = new FormData(e.currentTarget)
    setBusy(true)
    const err = await submitApplication({
      user_id: user?.id ?? null,
      name: String(d.get('name') || ''),
      username: String(d.get('username') || '').toLowerCase().replace(/[^a-z0-9_-]/g, ''),
      bio: String(d.get('bio') || ''),
      portfolio: String(d.get('portfolio') || ''),
      github_url: String(d.get('github') || ''),
      linkedin_url: String(d.get('linkedin') || ''),
      topics: String(d.get('topics') || ''),
      reason: String(d.get('reason') || ''),
      sample_work: String(d.get('sample') || ''),
    })
    setBusy(false)
    if (err) return toast(err, true)
    setDone(true)
    toast('Application submitted.')
  }

  return (
    <div>
      <Seo title="Become a contributor - AU_ / JOURNAL" description="Apply to write for AU_ / JOURNAL - tutorials, build logs, case studies." path="/blog/apply" />
      <div className="page-top" style={{ paddingBottom: 40 }}>
        <div className="container">
          <div className="pt-label">Write for AU Journal</div>
          <h1>
            Have something <em>worth sharing</em>?
          </h1>
          <p className="topic-desc" style={{ maxWidth: '60ch' }}>
            Tutorials, build logs, case studies and honest notes. New contributors go through review: DRAFT {'\u2192'} SUBMITTED {'\u2192'} REVIEW {'\u2192'} APPROVED {'\u2192'} PUBLISHED.
          </p>
        </div>
      </div>
      <section style={{ paddingTop: 24 }}>
        <div className="container" style={{ maxWidth: 760 }}>
          {done ? (
            <div className="empty-state">
              <div className="es-glyph">[ OK ]</div>
              <div className="es-title">Application received.</div>
              <div className="es-note">The editor reviews applications weekly. Approved contributors get an email.</div>
              <div style={{ marginTop: 20 }}>
                <Link to="/blog" className="btn-ghost-line">Back to the journal</Link>
              </div>
            </div>
          ) : (
            <form className="cf reveal" onSubmit={submit}>
              <div className="cf-row">
                <div className="cf-group">
                  <label className="cf-label" htmlFor="ap-name">Name</label>
                  <input className="cf-input" id="ap-name" name="name" required defaultValue={profile?.display_name ?? ''} />
                </div>
                <div className="cf-group">
                  <label className="cf-label" htmlFor="ap-user">Preferred username</label>
                  <input className="cf-input" id="ap-user" name="username" required defaultValue={profile?.username ?? ''} placeholder="lowercase, no spaces" />
                </div>
              </div>
              <div className="cf-group">
                <label className="cf-label" htmlFor="ap-bio">Short bio</label>
                <textarea className="cf-textarea" id="ap-bio" name="bio" rows={2} placeholder="Who are you, what do you build?" />
              </div>
              <div className="cf-row">
                <div className="cf-group">
                  <label className="cf-label" htmlFor="ap-portfolio">Portfolio</label>
                  <input className="cf-input" id="ap-portfolio" name="portfolio" type="url" placeholder="https://..." />
                </div>
                <div className="cf-group">
                  <label className="cf-label" htmlFor="ap-github">GitHub</label>
                  <input className="cf-input" id="ap-github" name="github" type="url" placeholder="https://github.com/..." />
                </div>
              </div>
              <div className="cf-group">
                <label className="cf-label" htmlFor="ap-linkedin">LinkedIn</label>
                <input className="cf-input" id="ap-linkedin" name="linkedin" type="url" placeholder="https://linkedin.com/in/..." />
              </div>
              <div className="cf-group">
                <label className="cf-label" htmlFor="ap-topics">Topics you want to write about</label>
                <input className="cf-input" id="ap-topics" name="topics" required placeholder="e.g. Discord bots, systems design, web performance" />
              </div>
              <div className="cf-group">
                <label className="cf-label" htmlFor="ap-reason">Why do you want to write for AU Journal?</label>
                <textarea className="cf-textarea" id="ap-reason" name="reason" rows={3} required />
              </div>
              <div className="cf-group">
                <label className="cf-label" htmlFor="ap-sample">Sample work (links)</label>
                <textarea className="cf-textarea" id="ap-sample" name="sample" rows={2} placeholder="Posts, repos, or projects that show your writing and building." />
              </div>
              <button className="btn-lime" type="submit" disabled={busy} style={{ justifyContent: 'center' }}>
                {busy ? '...' : 'SUBMIT APPLICATION \u2192'}
              </button>
            </form>
          )}
        </div>
      </section>
    </div>
  )
}
