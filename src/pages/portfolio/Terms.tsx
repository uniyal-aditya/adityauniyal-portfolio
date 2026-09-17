import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Seo } from '@/lib/seo'

function Card({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <div style={{ border: '1px solid var(--line)', borderRadius: 4, background: 'var(--sand)', padding: '24px 28px' }}>
      <h3 style={{ fontFamily: 'var(--f-display)', fontSize: '1.4rem', letterSpacing: '0.01em', marginBottom: 8 }}>{title}</h3>
      {note && (
        <p style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--lime)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>{note}</p>
      )}
      <div style={{ fontSize: 15, color: 'var(--dim)', lineHeight: 1.75, display: 'flex', flexDirection: 'column', gap: 10 }}>{children}</div>
    </div>
  )
}

export default function Terms() {
  return (
    <main>
      <Seo
        title="Terms of Service - Aditya Uniyal"
        description="The rules for using adityauniyal.is-a.dev and the AU_ / JOURNAL platform: accounts, content you publish, what's allowed, and liability."
        path="/terms"
      />
      <div className="page-top">
        <div className="container">
          <div className="pt-label">Legal</div>
          <h1>
            Terms of <em>service</em>
          </h1>
        </div>
      </div>
      <section style={{ paddingTop: 60 }}>
        <div className="container" style={{ maxWidth: 760 }}>
          <p style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--dim)', letterSpacing: '0.08em', marginBottom: 32 }}>
            LAST UPDATED: SEPTEMBER 17, 2026 · ADITYAUNIYAL.IS-A.DEV
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            <Card title="The deal" note="~/au $ cat terms.txt">
              <p>
                This site — the portfolio and the AU_ / JOURNAL publishing platform — is run by Aditya Uniyal
                (&ldquo;I&rdquo;, &ldquo;me&rdquo;). Using it means you agree to these terms. They are written to be
                read, not to trap anyone: be decent, don&apos;t break things, don&apos;t use the platform to harm.
              </p>
            </Card>

            <Card title="Accounts">
              <UL items={[
                <>You need an account to comment, like, bookmark, follow and publish. Provide accurate info and keep your credentials safe — you are responsible for activity under your account.</>,
                <>You must be at least 13 years old.</>,
                <>Roles (reader, contributor, verified author, admin, owner) are granted by me and may change. Contributor status is a privilege, not a right.</>,
                <>I may suspend or delete accounts that violate these terms — spam, harassment, impersonation, security abuse or anything unlawful.</>,
              ]} />
            </Card>

            <Card title="Your content">
              <UL items={[
                <>You keep ownership of everything you write and upload. Full stop.</>,
                <>By publishing on the Journal you grant me a worldwide, royalty-free license to store, display and promote your content <em>as part of running the platform</em> — rendering pages, feeds, sitemaps, share previews. When your content is deleted (by you or by moderation), the license ends except for reasonable backup/archival retention.</>,
                <>Only publish what you have the right to publish. Don&apos;t post others&apos; private information, copyrighted work you don&apos;t hold rights to, malware, or illegal content.</>,
                <>AI-generated content must be disclosed in the article body if it constitutes a substantial part of the work.</>,
              ]} />
            </Card>

            <Card title="Moderation">
              <UL items={[
                <>Contributor posts go through review before publishing (draft → submitted → review → approved → published). Trusted authors may publish directly.</>,
                <>I can edit for clarity of metadata (titles, tags, categories), reject, hide or remove any content, and pin comments — and I&apos;ll be transparent about why when asked.</>,
                <>Report content with the report action or the contact form. Genuine reports get handled.</>,
              ]} />
            </Card>

            <Card title="Acceptable use">
              <UL items={[
                <>No attacks on the service: scraping at scale, vulnerability probing without permission, automated abuse of auth or forms.</>,
                <>No spam — bulk self-promotion, link farms, comment flooding.</>,
                <>No harassment, hate speech, or content sexualizing minors. Obvious and non-negotiable.</>,
                <>No circumventing rate limits, bans, or the review workflow.</>,
              ]} />
            </Card>

            <Card title="Availability &amp; changes">
              <p>
                The site is provided as-is. I keep it online and healthy, but things break; features change; articles
                or the platform itself could pause or end. No warranty of uninterrupted service. These terms may be
                updated — the date above moves, and material changes get announced in the Journal.
              </p>
            </Card>

            <Card title="Liability">
              <p>
                To the maximum extent permitted by law, I am not liable for indirect or consequential damages arising
                from your use of the site, and the total liability for any claim is the amount you paid me to use it —
                which, for a free personal site, is zero. Content on the Journal reflects its authors&apos; views, not
                necessarily mine, and external links are not endorsements.
              </p>
            </Card>

            <Card title="Contact">
              <p>
                Questions, takedown requests, or a legal notice? Use the{' '}
                <Link to="/connect" className="text-link">contact form</Link> — it reaches me directly.
              </p>
            </Card>

          </div>
        </div>
      </section>
    </main>
  )
}

function UL({ items }: { items: (string | ReactNode)[] }) {
  return (
    <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {items.map((it, i) => (
        <li key={i}>{it}</li>
      ))}
    </ul>
  )
}
