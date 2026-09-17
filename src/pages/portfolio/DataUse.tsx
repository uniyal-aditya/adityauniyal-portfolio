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

function Row({ what, why, keep }: { what: string; why: string; keep: string }) {
  return (
    <div style={{ borderTop: '1px solid var(--line)', paddingTop: 12 }}>
      <div style={{ fontFamily: 'var(--f-mono)', fontSize: 12, color: 'var(--bone)', marginBottom: 6 }}>{what}</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 4 }}>
        <span><strong style={{ color: 'var(--lime)', fontFamily: 'var(--f-mono)', fontSize: 11, letterSpacing: '0.06em' }}>WHY →</strong> {why}</span>
        <span><strong style={{ color: 'var(--lime)', fontFamily: 'var(--f-mono)', fontSize: 11, letterSpacing: '0.06em' }}>KEPT →</strong> {keep}</span>
      </div>
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

export default function DataUse() {
  return (
    <main>
      <Seo
        title="How Your Data Is Used - Aditya Uniyal"
        description="A plain-language walkthrough of every piece of data this site holds, why it exists, who can see it, and how to get it removed."
        path="/data-use"
      />
      <div className="page-top">
        <div className="container">
          <div className="pt-label">Legal · Plain language</div>
          <h1>
            What happens to <em>your data</em>
          </h1>
        </div>
      </div>
      <section style={{ paddingTop: 60 }}>
        <div className="container" style={{ maxWidth: 760 }}>
          <p style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--dim)', letterSpacing: '0.08em', marginBottom: 32 }}>
            LAST UPDATED: SEPTEMBER 17, 2026 · THE HUMAN-READABLE COMPANION TO THE{' '}
            <Link to="/privacy" style={{ color: 'var(--lime)' }}>FULL PRIVACY POLICY</Link>
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            <Card title="Read this in 30 seconds" note="~/au $ data --explain">
              <p>
                Everything this site stores, why it exists, who can see it, and how to get it erased — in one page,
                no lawyer words. The short of it: <strong style={{ color: 'var(--bone)' }}>nothing is sold, nothing
                is tracked, your email is never public</strong>, and one message from you erases all of it.
              </p>
            </Card>

            <Card title="Every piece of data, item by item">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <Row
                  what="Contact & feedback form messages (name, email, message, rating)"
                  why="Delivered straight to Aditya's inbox via EmailJS so he can reply. Never stored in the site's database, never added to any list."
                  keep="Until answered and no longer needed — then it lives (and ages out) like any normal email."
                />
                <Row
                  what="Account email + password (or GitHub / Google / Discord link)"
                  why="One purpose: letting you sign in. Passwords are hashed by Supabase Auth — even the admin can't read them."
                  keep="Until you ask for deletion. Never shown publicly, never shared, never emailed marketing."
                />
                <Row
                  what="Profile fields you fill in (display name, username, avatar, bio, website, GitHub, LinkedIn, location, interests)"
                  why="To show who wrote what and power your public author page. Empty fields stay empty — nothing is inferred."
                  keep="Until you clear or change them; deletable with the account."
                />
                <Row
                  what="Your articles, drafts and uploads"
                  why="The core feature — your writing, stored so the editor can version it and readers can read it."
                  keep="Until you delete them or ask for account deletion (which cascades everything)."
                />
                <Row
                  what="Comments, likes, bookmarks, follows"
                  why="The discussion and personalization features. Likes/bookmarks/follows are tied to your account; comments are public by nature."
                  keep="Until you remove them in the UI, or delete the account."
                />
                <Row
                  what="Reading progress & history"
                  why="Purely for your continue-reading list. Only meaningful when signed in; anonymous readers leave nothing."
                  keep="Until cleared by deletion request."
                />
                <Row
                  what="Article view counts"
                  why="Honest traffic numbers for trending and stats. Anonymous views are a bare timestamp — no IP, no cookie, no fingerprint, nothing personal."
                  keep="As aggregate counts; individual rows are not linked to visitors."
                />
                <Row
                  what="Contributor application (name, username, bio, links, topics, motivation, sample work)"
                  why="So the admin can review write-access requests. Visible only to the site admin."
                  keep="Until decided; rejected applications are deleted on request."
                />
                <Row
                  what="Newsletter address"
                  why="Only the AU Weekly digest. One click to unsubscribe; never shared or sold."
                  keep="Until you unsubscribe or ask for removal."
                />
                <Row
                  what="Session token in your browser's local storage"
                  why="Keeps you signed in across visits. Not a tracking cookie; no third party reads it."
                  keep="Until you sign out (removed immediately)."
                />
              </div>
            </Card>

            <Card title="What is NEVER done with your data" note="hard rules">
              <UL items={[
                <>Sold, rented or traded — to anyone, ever. There are no ads and no data brokers in this stack.</>,
                <>Your email shown publicly or exposed through the site&apos;s API. It lives only in the authentication system.</>,
                <>Tracked across the internet. No analytics service, no ad pixels, no fingerprinting, no cross-site cookies.</>,
                <>Used to train AI models. Nothing you write here feeds any model.</>,
                <>Shared with authorities voluntarily. Legal valid requests would be the only exception, and you&apos;d know if it happened where legally allowed.</>,
              ]} />
            </Card>

            <Card title="Who can see what">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 10 }}>
                <span><strong style={{ color: 'var(--bone)' }}>The public</strong> sees: published articles, your public profile fields, and your comments. Nothing else.</span>
                <span><strong style={{ color: 'var(--bone)' }}>The admin (Aditya)</strong> additionally sees: contributor applications, reported content, and role assignments — the minimum needed to run the platform. Not your password (hashed), not your reading history unless you show it.</span>
                <span><strong style={{ color: 'var(--bone)' }}>Third-party processors</strong>: Supabase (stores the data), EmailJS (delivers form emails), Vercel (hosts), Google Fonts (typefaces). Each processes only what its job requires. Full list in the privacy policy.</span>
              </div>
            </Card>

            <Card title="Your controls" note="no hoops">
              <UL items={[
                <>Edit or clear anything in your profile, anytime.</>,
                <>Delete your own comments, likes, bookmarks and follows directly in the interface.</>,
                <><strong style={{ color: 'var(--bone)' }}>Erase everything:</strong> one message via the{' '}
                  <Link to="/connect" className="text-link">contact form</Link> — account, posts, comments, likes,
                  bookmarks, follows, reading history — all deleted from the database, confirmed back to you.</>,
                <>Export: want a copy of your posts or data first? Ask and you&apos;ll get a machine-readable file.</>,
                <>Newsletter: say the word and the address is removed.</>,
              ]} />
            </Card>

            <Card title="Why this page exists">
              <p>
                Privacy policies are legally necessary but rarely readable. This page is the honest summary — the same
                facts as the <Link to="/privacy" className="text-link">full policy</Link>, written the way I&apos;d want
                them explained to me. If anything here is ever unclear or seems to contradict the policy, the
                contradiction is a bug: <Link to="/connect" className="text-link">tell me</Link> and it gets fixed.
              </p>
            </Card>

          </div>
        </div>
      </section>
    </main>
  )
}
