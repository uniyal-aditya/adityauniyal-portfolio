import { useReveal } from '@/hooks/useReveal'
import { Seo } from '@/lib/seo'
import { motion } from 'framer-motion'
import { useReducedMotion } from '@/hooks/useReducedMotion'

const SKILL_BARS = [
  ['Python', 90],
  ['HTML / CSS', 90],
  ['JavaScript', 82],
  ['Backend (SQL / Firebase)', 80],
  ['Flutter / Dart', 75],
] as const

const TOOLS = ['GitHub', 'VS Code', 'Figma', 'Firebase', 'Sololearn', 'Replit', 'Netlify', 'Postman']

export default function Skills() {
  useReveal()
  const reduced = useReducedMotion()
  return (
    <main>
      <Seo title="Skills - Aditya Uniyal" description="Technical skills and tools used by Aditya Uniyal - Python, JavaScript, Flutter, and more." path="/skills" />
      <div className="page-top">
        <div className="container">
          <div className="pt-label">Capabilities</div>
          <h1>
            Technical <em>skills</em>
          </h1>
        </div>
      </div>

      <section style={{ paddingTop: 60 }}>
        <div className="container" style={{ maxWidth: 860 }}>
          {SKILL_BARS.map(([name, pct], i) => (
            <div key={name} className="skill" style={{ marginBottom: 28 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontFamily: 'var(--f-mono)', fontSize: 13, color: 'var(--bone)' }}>{name}</span>
                <span style={{ fontFamily: 'var(--f-mono)', fontSize: 12, color: 'var(--lime)' }}>{pct}%</span>
              </div>
              <div style={{ height: 3, background: 'var(--line)', borderRadius: 2, overflow: 'hidden' }}>
                <motion.div
                  initial={{ width: 0 }}
                  whileInView={{ width: pct + '%' }}
                  viewport={{ once: true }}
                  transition={{ duration: reduced ? 0 : 0.9, delay: reduced ? 0 : i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                  style={{ height: '100%', background: 'var(--lime)' }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section style={{ borderTop: '1px solid var(--line)', paddingTop: 60 }}>
        <div className="container" style={{ maxWidth: 860 }}>
          <div className="skills-eyebrow reveal" style={{ padding: 0, marginBottom: 24 }}>Tools</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {TOOLS.map((t) => (
              <span className="skill-pill" key={t}>
                {t}
              </span>
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}
