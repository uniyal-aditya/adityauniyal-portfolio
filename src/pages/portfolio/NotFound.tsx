import { Link } from 'react-router-dom'
import { Seo } from '@/lib/seo'

export default function NotFound() {
  return (
    <main>
      <Seo title="404 - Not Found" path="/404" noindex />
      <div style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', textAlign: 'center', padding: 24 }}>
        <div>
          <div style={{ fontFamily: 'var(--f-display)', fontSize: 'clamp(6rem,20vw,12rem)', lineHeight: 1, color: 'var(--bone)' }}>
            4<span style={{ color: 'var(--lime)' }}>0</span>4
          </div>
          <div style={{ fontFamily: 'var(--f-mono)', fontSize: 12, color: 'var(--dim)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 32 }}>
            // page not found in this system
          </div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/" className="btn-lime">
              Back home &rarr;
            </Link>
            <Link to="/blog" className="btn-ghost-line">
              Read the journal
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}
