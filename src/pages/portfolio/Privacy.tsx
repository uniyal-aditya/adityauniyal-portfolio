import { Link } from 'react-router-dom'
import { Seo } from '@/lib/seo'

const SECTIONS = [
  ['Data Collection', 'This website does not collect, store, or share personal data beyond what users voluntarily provide through the feedback and contact forms.'],
  ['Email Usage', 'Email addresses submitted via the forms are used only for reply purposes and are never shared with third parties.'],
  ['Cookies & Tracking', 'No analytics or advertising trackers are used. Journal sign-in sessions are stored by Supabase Auth in your browser only.'],
  ['Third-Party Services', 'The feedback form uses EmailJS to deliver messages. The Journal uses Supabase (database, auth, storage). No other third-party data processors are active on this site.'],
  ['Journal Accounts', 'If you create a Journal account, your username, display name and profile details you choose to publish are visible to other readers. You can request deletion at any time.'],
]

export default function Privacy() {
  return (
    <main>
      <Seo title="Privacy Policy - Aditya Uniyal" description="Privacy policy for adityauniyal.vercel.app - no tracking, no ads." path="/privacy" />
      <div className="page-top">
        <div className="container">
          <div className="pt-label">Legal</div>
          <h1>
            Privacy <em>policy</em>
          </h1>
        </div>
      </div>
      <section style={{ paddingTop: 60 }}>
        <div className="container" style={{ maxWidth: 760 }}>
          <p style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--dim)', letterSpacing: '0.08em', marginBottom: 32 }}>LAST UPDATED: 2026</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {SECTIONS.map(([t, d]) => (
              <div key={t} style={{ border: '1px solid var(--line)', borderRadius: 4, background: 'var(--sand)', padding: '24px 28px' }}>
                <h3 style={{ fontFamily: 'var(--f-display)', fontSize: '1.4rem', letterSpacing: '0.01em', marginBottom: 8 }}>{t}</h3>
                <p style={{ fontSize: 15, color: 'var(--dim)', lineHeight: 1.7 }}>{d}</p>
              </div>
            ))}
          </div>
          <p style={{ marginTop: 28, fontSize: 15 }}>
            Questions?{' '}
            <Link to="/connect" className="text-link">
              Get in touch.
            </Link>
          </p>
        </div>
      </section>
    </main>
  )
}
