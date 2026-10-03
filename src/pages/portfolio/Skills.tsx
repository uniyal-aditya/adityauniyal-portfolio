import { useReveal } from '@/hooks/useReveal'
import { Seo } from '@/lib/seo'

/**
 * Grouped capability lists — honest and bar-free. Everything here is real:
 * React/TypeScript/Supabase power this site, FastAPI/Supabase power Enroute,
 * Python/discord.py power the bots. Former percentage bars implied precision
 * that self-assessed numbers can't have.
 */
const SKILL_GROUPS: [string, string[]][] = [
  ['Languages', ['Python', 'JavaScript', 'TypeScript', 'HTML / CSS', 'SQL']],
  ['Frameworks & Libraries', ['React', 'FastAPI', 'Tailwind CSS', 'Flutter / Dart', 'discord.py']],
  ['Data & Platforms', ['Supabase', 'Firebase']],
]

const TOOLS = ['GitHub', 'VS Code', 'Figma', 'Postman', 'Vercel']

export default function Skills() {
  useReveal()
  return (
    <main>
      <Seo title="Skills - Aditya Uniyal" description="Technical skills and tools used by Aditya Uniyal - React, TypeScript, Python, Supabase, and more." path="/skills" />
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
          {SKILL_GROUPS.map(([group, items]) => (
            <div key={group} className="reveal" style={{ marginBottom: 32 }}>
              <div className="skills-eyebrow" style={{ padding: 0, marginBottom: 14 }}>
                {group}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                {items.map((s) => (
                  <span className="skill-pill" key={s}>
                    {s}
                  </span>
                ))}
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
