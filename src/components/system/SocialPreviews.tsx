import { useMemo } from 'react'
import { AppIcon } from '@/components/icons/AppIcon'
import type { PreviewSection } from '@/data/socials'
import type { BuildingData, BuildingRepo } from '@/types/building'

/* ── LinkedIn / X: snapshot sections (data lives in src/data/socials.ts) ── */
export function SectionList({ sections }: { sections: PreviewSection[] }) {
  return (
    <>
      {sections.map((sec) => (
        <section key={sec.heading} className="soc-sec" aria-label={sec.heading}>
          <h4 className="soc-sec-h">{sec.heading}</h4>
          <ul className="soc-list">
            {sec.items.map((it) => {
              const inner = (
                <>
                  <span className="soc-item-text">
                    <span className="t">{it.title}</span>
                    {it.sub && <span className="s">{it.sub}</span>}
                  </span>
                  {it.url && <AppIcon name="arrowUpRight" size={14} className="soc-item-go" />}
                </>
              )
              return (
                <li key={it.title + (it.url ?? '')}>
                  {it.url ? (
                    <a className="soc-item is-link" href={it.url} target="_blank" rel="noopener noreferrer">
                      {inner}
                    </a>
                  ) : (
                    <div className="soc-item">{inner}</div>
                  )}
                </li>
              )
            })}
          </ul>
        </section>
      ))}
    </>
  )
}

/* ── GitHub: live data ────────────────────────────────────────────────── */
const LANG_COLORS: Record<string, string> = {
  Python: '#3572A5',
  JavaScript: '#f1e05a',
  TypeScript: '#3178c6',
  HTML: '#e34c26',
  CSS: '#563d7c',
  Dart: '#00B4AB',
  Java: '#b07219',
  'C++': '#f34b7d',
  Shell: '#89e051',
}

function ago(iso: string): string {
  const days = (Date.now() - new Date(iso).getTime()) / 86_400_000
  if (!Number.isFinite(days) || days < 1) return 'today'
  if (days < 30) return Math.floor(days) + 'd ago'
  if (days < 365) return Math.floor(days / 30) + 'mo ago'
  return Math.floor(days / 365) + 'y ago'
}

const pad = (n: number) => String(n).padStart(2, '0')
const keyOf = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const level = (n: number) => (n <= 0 ? 0 : n <= 2 ? 1 : n <= 5 ? 2 : n <= 9 ? 3 : 4)

/** Last 26 weeks of contributions, GitHub-style (needs the calendar from your API). */
export function Heatmap({ days }: { days: Record<string, number> }) {
  const cells = useMemo(() => {
    const end = new Date()
    end.setHours(0, 0, 0, 0)
    const start = new Date(end)
    start.setDate(start.getDate() - (26 * 7 - 1))
    start.setDate(start.getDate() - start.getDay()) // start the first column on Sunday
    const out: { key: string; n: number }[] = []
    for (const d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const key = keyOf(d)
      out.push({ key, n: days[key] ?? 0 })
    }
    return out
  }, [days])

  return (
    <div className="soc-heat" role="img" aria-label="Contribution activity over the last 26 weeks">
      {cells.map((c) => (
        <i key={c.key} data-l={level(c.n)} title={`${c.n} contribution${c.n === 1 ? '' : 's'} on ${c.key}`} />
      ))}
    </div>
  )
}

function RepoRow({ repo }: { repo: BuildingRepo }) {
  return (
    <li>
      <a className="soc-repo" href={repo.url} target="_blank" rel="noopener noreferrer">
        <span className="soc-repo-name">{repo.name}</span>
        {repo.description && <span className="soc-repo-desc">{repo.description}</span>}
        <span className="soc-repo-meta">
          {repo.language && (
            <span className="soc-repo-lang">
              <i className="soc-dot" style={{ background: LANG_COLORS[repo.language] ?? 'var(--accent)' }} />
              {repo.language}
            </span>
          )}
          {repo.stars > 0 && (
            <span>
              <AppIcon name="star" size={11} className="soc-star" /> {repo.stars}
            </span>
          )}
          <span>updated {ago(repo.updated_at)}</span>
        </span>
      </a>
    </li>
  )
}

export function GithubLive({ data }: { data: BuildingData }) {
  // Tolerate partial / older-shaped responses — a popup must never crash the page.
  const days = data.calendar?.days ?? {}
  const hasHeat = !data.calendar?.unavailable && Object.keys(days).length > 0
  const repos = (data.repos ?? []).slice(0, 3)
  return (
    <>
      {hasHeat && (
        <section className="soc-sec" aria-label="Contribution activity">
          <h4 className="soc-sec-h">
            Activity <span>· last 26 weeks</span>
          </h4>
          <Heatmap days={days} />
        </section>
      )}
      {repos.length > 0 && (
        <section className="soc-sec" aria-label="Recent repositories">
          <h4 className="soc-sec-h">Recent repositories</h4>
          <ul className="soc-list soc-repos">
            {repos.map((r) => (
              <RepoRow key={r.name} repo={r} />
            ))}
          </ul>
        </section>
      )}
    </>
  )
}
