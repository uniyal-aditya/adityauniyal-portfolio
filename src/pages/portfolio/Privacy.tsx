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

function UL({ items }: { items: (string | ReactNode)[] }) {
  return (
    <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {items.map((it, i) => (
        <li key={i}>{it}</li>
      ))}
    </ul>
  )
}

export default function Privacy() {
  return (
    <main>
      <Seo
        title="Privacy Policy - Aditya Uniyal"
        description="How adityauniyal.is-a.dev handles your data: what is collected, what is never collected, third-party services, and your rights."
        path="/privacy"
      />
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
          <p style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--dim)', letterSpacing: '0.08em', marginBottom: 32 }}>
            LAST UPDATED: SEPTEMBER 17, 2026 · APPLIES TO ADITYAUNIYAL.IS-A.DEV
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            <Card title="The short version" note="~/au $ cat privacy.txt">
              <p>
                This site runs with no ads, no analytics trackers and no fingerprinting. The only personal data
                it holds is what you hand it directly: a message you send, an account you create, or a profile
                you choose to fill in. Emails are never public. You can ask for any of it to be deleted at any time.
              </p>
            </Card>

            <Card title="What this site collects">
              <UL items={[
                <>
                  <strong>Feedback &amp; contact forms</strong> — your name, email, message and (for feedback) your
                  rating. These are delivered to Aditya&apos;s inbox by EmailJS and are <em>not</em> stored in this
                  site&apos;s database.
                </>,
                <>
                  <strong>Journal account</strong> — an email address and password, or a linked GitHub / Google /
                  Discord login. Your email is stored only in Supabase Auth&apos;s private account tables and is
                  never shown publicly or shared.
                </>,
                <>
                  <strong>Profile</strong> — only the fields you choose to write: display name, username, avatar,
                  bio, website, GitHub, LinkedIn, location and interests. Leave a field empty and it stays empty.
                </>,
                <>
                  <strong>Content you create</strong> — articles, drafts, comments, likes, bookmarks, follows,
                  image uploads and reading progress, tied to your account so the features work.
                </>,
                <>
                  <strong>Contributor application</strong> — if you apply to write, the form fields (name, username,
                  bio, portfolio, GitHub, LinkedIn, topics, motivation, sample work) are visible only to the
                  site&apos;s admin.
                </>,
                <>
                  <strong>Newsletter</strong> — an email address, used only for the AU Weekly digest.
                </>,
              ]} />
            </Card>

            <Card title="View counting & analytics" note="no ips, no fingerprints">
              <p>
                Articles count views so trending and read-time stats stay honest. For anonymous visitors a view is
                just a row saying &ldquo;this article was opened at this time&rdquo; — no IP address, no cookie, no
                identifier of any kind is stored. If you are signed in, the view is linked to your account solely to
                mark articles as read and power your continue-reading list.
              </p>
              <p>
                There is no Google Analytics, no ad network and no third-party tracker anywhere on this site. The
                dashboard and admin pages you may see screenshots of are built entirely from these own-hosted counts.
              </p>
            </Card>

            <Card title="Cookies & local storage">
              <UL items={[
                <>No tracking or advertising cookies are set.</>,
                <>
                  When you sign in to the Journal, Supabase Auth stores your session token in your browser&apos;s
                  local storage so you stay signed in. Sign out and it is removed.
                </>,
              ]} />
            </Card>

            <Card title="What is public">
              <p>
                Articles, your public profile fields, and the comments you post are visible to other visitors.
                Everything else — your email address, reading history, bookmarks, drafts and contributor application
                — is private to you and the site admin. User email addresses are not exposed through the public
                site data at all (they live only in the authentication system).
              </p>
            </Card>

            <Card title="Third-party services" note="the complete list">
              <UL items={[
                <><strong>Supabase</strong> — authentication, database and image storage (Journal accounts and content).</>,
                <><strong>EmailJS</strong> — delivery for the feedback and contact forms.</>,
                <><strong>Vercel</strong> — static hosting and CDN; like any host, it keeps standard infrastructure request logs.</>,
                <><strong>Google Fonts</strong> — loads the site&apos;s typefaces; your browser connects directly to Google for them.</>,
                <><strong>GitHub API</strong> — the /building page reads Aditya&apos;s own public GitHub activity server-side; visitors&apos; data is not involved.</>,
                <><strong>GitHub / Google / Discord</strong> — only if you use one of them to sign in; then that provider&apos;s terms also apply to the sign-in flow.</>,
              ]} />
            </Card>

            <Card title="Your choices & rights">
              <UL items={[
                <>Edit or clear your profile anytime from your profile page.</>,
                <>Delete your own comments, likes, bookmarks and follows directly in the interface.</>,
                <>
                  Want your account, content or newsletter subscription removed, or a copy of your data? Use the{' '}
                  <Link to="/connect" className="text-link">contact form</Link> and it will be handled — accounts are
                  deleted with all their content, and requests are processed promptly.
                </>,
                <>To unsubscribe from the newsletter, mention it via the contact form.</>,
              ]} />
            </Card>

            <Card title="Data retention">
              <p>
                Form messages live in Aditya&apos;s inbox like any other email. Journal data persists until you ask
                for it to be deleted; deleting an account removes its profile, posts, comments, likes, bookmarks,
                follows and reading history from the database. Article view rows are kept as anonymous aggregates.
              </p>
            </Card>

            <Card title="Security">
              <p>
                The site talks to Supabase with public, read-scoped keys only; administrative actions run behind
                database-level row-security rules that check roles server-side, so nothing sensitive ships to the
                browser. Uploaded images are type- and size-checked, and article content is stored as structured
                data rather than raw HTML to prevent script injection.
              </p>
            </Card>

            <Card title="Children">
              <p>This site is not directed at children under 13, and no accounts are knowingly created for them.</p>
            </Card>

            <Card title="Companion pages">
              <p>
                Prefer plain language? Read <Link to="/data-use" className="text-link">What happens to your data</Link>{' '}
                — every data item, its purpose and its lifetime in one page. The rules of using the platform live in
                the <Link to="/terms" className="text-link">Terms of Service</Link>.
              </p>
            </Card>

            <Card title="Changes to this policy">
              <p>
                If data practices ever change, this page changes with them and the date above moves. Material
                changes will also be announced in the Journal.
              </p>
            </Card>

            <Card title="Questions">
              <p>
                The point of this page is honesty, not lawyer-speak. If anything here is unclear or you want to
                know exactly what is stored about you,{' '}
                <Link to="/connect" className="text-link">get in touch</Link> — you will get a straight answer.
              </p>
            </Card>

          </div>
        </div>
      </section>
    </main>
  )
}
