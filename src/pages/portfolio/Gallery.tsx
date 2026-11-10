import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useReveal } from '@/hooks/useReveal'
import { Seo } from '@/lib/seo'
import { AppIcon } from '@/components/icons/AppIcon'
import { Lightbox } from '@/components/system/Lightbox'
import { GALLERY, GALLERY_TAGS } from '@/data/gallery'
import { MILESTONES, milestoneTiming } from '@/data/milestones'
import { fetchPublicGallery } from '@/lib/gallery-api'

type Filter = string // 'All' or a tag

export default function Gallery() {
  useReveal()
  const [filter, setFilter] = useState<Filter>('All')
  const [openIdx, setOpenIdx] = useState<number | null>(null)

  // Photos uploaded from Admin -> Gallery (newest first), then the built-in ones.
  // If Supabase isn't set up or migration 18 hasn't run, this is just [] and the
  // page shows the built-in photos.
  const remote = useQuery({
    queryKey: ['gallery-public'],
    queryFn: fetchPublicGallery,
    staleTime: 5 * 60_000,
    retry: false,
  })
  const all = useMemo(() => [...(remote.data ?? []), ...GALLERY], [remote.data])

  // Only offer tags that actually have photos (known tags first, then any extras).
  const tags = useMemo(() => {
    const present = new Set(all.map((g) => g.tag))
    const known = GALLERY_TAGS.filter((t) => present.has(t))
    const extra = [...present].filter((t) => !(GALLERY_TAGS as readonly string[]).includes(t))
    return [...known, ...extra]
  }, [all])
  const items = useMemo(() => (filter === 'All' ? all : all.filter((g) => g.tag === filter)), [filter, all])

  const openProof = (id: string) => {
    setFilter('All')
    const i = all.findIndex((g) => g.id === id)
    if (i >= 0) setOpenIdx(i)
  }

  return (
    <main>
      <Seo
        title="Gallery & Milestones - Aditya Uniyal"
        description="Hackathons, certificates and moments from Aditya Uniyal's journey: Solve-a-Thon, CodeSprint 2026, Hacktoberfest Hack Day Dehradun and Smart India Hackathon."
        path="/gallery"
      />
      <div className="page-top">
        <div className="container">
          <div className="pt-label">Moments</div>
          <h1>
            Gallery &amp; <em>milestones</em>
          </h1>
        </div>
      </div>

      <section style={{ paddingTop: 56 }}>
        <div className="container">
          <div className="gal-eyebrow reveal">Hackathons &amp; milestones</div>
          <div className="ms-list">
            {MILESTONES.map((m, i) => {
              const timing = milestoneTiming(m)
              return (
                <article key={m.id} className={'ms-card reveal d' + Math.min(i + 1, 3)}>
                  <div className="ms-when">
                    <span className="ms-date">{m.dateLabel}</span>
                    {timing && (
                      <span className={'ms-status ' + timing}>{timing === 'upcoming' ? 'Upcoming' : 'Completed'}</span>
                    )}
                  </div>
                  <div className="ms-main">
                    <h2 className="ms-title">{m.title}</h2>
                    <div className="ms-event">{m.event}</div>
                    <div className="ms-result">{m.result}</div>
                    <div className="ms-project">
                      <strong>{m.project}</strong>
                      <span>{m.projectLine}</span>
                    </div>
                    <p className="ms-sum">{m.summary}</p>
                    {m.highlights.length > 0 && (
                      <ul className="ms-hl">
                        {m.highlights.map((h) => (
                          <li key={h}>{h}</li>
                        ))}
                      </ul>
                    )}
                    <div className="ms-foot">
                      <span className="ms-role">{m.role}</span>
                      <ul className="ms-tags" aria-label="Topics">
                        {m.tags.map((t) => (
                          <li key={t}>{t}</li>
                        ))}
                      </ul>
                      {m.proofId && (
                        <button type="button" className="ms-proof" onClick={() => openProof(m.proofId as string)}>
                          View certificate
                          <AppIcon name="arrowUpRight" size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        </div>
      </section>

      <section style={{ paddingTop: 72 }}>
        <div className="container">
          <div className="gal-eyebrow reveal">Photos &amp; certificates</div>

          {tags.length > 1 && (
            <div className="gal-filters" role="group" aria-label="Filter gallery">
              {['All', ...tags].map((t) => (
                <button
                  key={t}
                  type="button"
                  className={'gal-chip' + (filter === t ? ' on' : '')}
                  aria-pressed={filter === t}
                  onClick={() => setFilter(t)}
                >
                  {t}
                </button>
              ))}
            </div>
          )}

          <div className="gal-grid">
            {items.map((g, i) => (
              <button
                key={g.id}
                type="button"
                className="gal-tile"
                onClick={() => setOpenIdx(i)}
                aria-label={'Open image: ' + g.title}
              >
                <img
                  src={g.src}
                  alt={g.alt}
                  width={g.width}
                  height={g.height}
                  loading="lazy"
                  decoding="async"
                />
                <span className="gal-cap">
                  <strong>{g.title}</strong>
                  {g.caption && <span>{g.caption}</span>}
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <Lightbox items={items} index={openIdx} onIndex={setOpenIdx} onClose={() => setOpenIdx(null)} />
    </main>
  )
}
