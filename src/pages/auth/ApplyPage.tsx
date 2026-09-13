import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Seo } from '@/lib/seo'
import { submitApplication } from '@/lib/journal-api'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/useToast'
import { useReveal } from '@/hooks/useReveal'

const applySchema = z
  .object({
    name: z.string().trim().min(2, 'At least 2 characters'),
    username: z
      .string()
      .trim()
      .toLowerCase()
      .regex(/^[a-z0-9_-]{3,24}$/, '3\u201324 chars: a-z, 0-9, _ or -'),
    bio: z.string().trim().max(280, 'Keep it under 280 characters').optional().or(z.literal('')),
    portfolio: z.string().trim().url('Must be a valid URL').optional().or(z.literal('')),
    github_url: z.string().trim().url('Must be a valid URL').optional().or(z.literal('')),
    linkedin_url: z.string().trim().url('Must be a valid URL').optional().or(z.literal('')),
    topics: z.string().trim().min(3, 'Tell us what you want to write about'),
    reason: z.string().trim().min(20, 'At least 20 characters \u2014 a sentence or two'),
    sample_work: z.string().trim().optional().or(z.literal('')),
  })
  .refine((d) => d.portfolio || d.github_url || d.linkedin_url || d.sample_work, {
    message: 'Add at least one link \u2014 portfolio, GitHub, LinkedIn or sample work',
    path: ['sample_work'],
  })

type ApplyValues = z.infer<typeof applySchema>

export default function ApplyPage() {
  useReveal()
  const { user, profile } = useAuth()
  const { toast } = useToast()
  const [done, setDone] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ApplyValues>({
    resolver: zodResolver(applySchema),
    defaultValues: {
      name: profile?.display_name ?? '',
      username: profile?.username ?? '',
      bio: '',
      portfolio: '',
      github_url: '',
      linkedin_url: '',
      topics: '',
      reason: '',
      sample_work: '',
    },
  })

  async function onSubmit(values: ApplyValues) {
    const err = await submitApplication({
      ...values,
      bio: values.bio ?? null,
      portfolio: values.portfolio ?? null,
      github_url: values.github_url ?? null,
      linkedin_url: values.linkedin_url ?? null,
      sample_work: values.sample_work ?? null,
      user_id: user?.id ?? null,
    })
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
            <form className="cf reveal" onSubmit={handleSubmit(onSubmit)} noValidate>
              <div className="cf-row">
                <div className="cf-group">
                  <label className="cf-label" htmlFor="ap-name">Name</label>
                  <input className="cf-input" id="ap-name" aria-invalid={!!errors.name} {...register('name')} />
                  {errors.name && <p className="cf-error" role="alert">{errors.name.message}</p>}
                </div>
                <div className="cf-group">
                  <label className="cf-label" htmlFor="ap-user">Preferred username</label>
                  <input className="cf-input" id="ap-user" aria-invalid={!!errors.username} placeholder="lowercase, no spaces" {...register('username')} />
                  {errors.username && <p className="cf-error" role="alert">{errors.username.message}</p>}
                </div>
              </div>
              <div className="cf-group">
                <label className="cf-label" htmlFor="ap-bio">Short bio</label>
                <textarea className="cf-textarea" id="ap-bio" rows={2} aria-invalid={!!errors.bio} placeholder="Who are you, what do you build?" {...register('bio')} />
                {errors.bio && <p className="cf-error" role="alert">{errors.bio.message}</p>}
              </div>
              <div className="cf-row">
                <div className="cf-group">
                  <label className="cf-label" htmlFor="ap-portfolio">Portfolio</label>
                  <input className="cf-input" id="ap-portfolio" type="url" aria-invalid={!!errors.portfolio} placeholder="https://..." {...register('portfolio')} />
                  {errors.portfolio && <p className="cf-error" role="alert">{errors.portfolio.message}</p>}
                </div>
                <div className="cf-group">
                  <label className="cf-label" htmlFor="ap-github">GitHub</label>
                  <input className="cf-input" id="ap-github" type="url" aria-invalid={!!errors.github_url} placeholder="https://github.com/..." {...register('github_url')} />
                  {errors.github_url && <p className="cf-error" role="alert">{errors.github_url.message}</p>}
                </div>
              </div>
              <div className="cf-group">
                <label className="cf-label" htmlFor="ap-linkedin">LinkedIn</label>
                <input className="cf-input" id="ap-linkedin" type="url" aria-invalid={!!errors.linkedin_url} placeholder="https://linkedin.com/in/..." {...register('linkedin_url')} />
                {errors.linkedin_url && <p className="cf-error" role="alert">{errors.linkedin_url.message}</p>}
              </div>
              <div className="cf-group">
                <label className="cf-label" htmlFor="ap-topics">Topics you want to write about</label>
                <input className="cf-input" id="ap-topics" aria-invalid={!!errors.topics} placeholder="e.g. Discord bots, systems design, web performance" {...register('topics')} />
                {errors.topics && <p className="cf-error" role="alert">{errors.topics.message}</p>}
              </div>
              <div className="cf-group">
                <label className="cf-label" htmlFor="ap-reason">Why do you want to write for AU Journal?</label>
                <textarea className="cf-textarea" id="ap-reason" rows={3} aria-invalid={!!errors.reason} {...register('reason')} />
                {errors.reason && <p className="cf-error" role="alert">{errors.reason.message}</p>}
              </div>
              <div className="cf-group">
                <label className="cf-label" htmlFor="ap-sample">Sample work (links)</label>
                <textarea className="cf-textarea" id="ap-sample" rows={2} aria-invalid={!!errors.sample_work} placeholder="Posts, repos, or projects that show your writing and building." {...register('sample_work')} />
                {errors.sample_work && <p className="cf-error" role="alert">{errors.sample_work.message}</p>}
              </div>
              <button className="btn-lime" type="submit" disabled={isSubmitting} style={{ justifyContent: 'center' }}>
                {isSubmitting ? '...' : 'SUBMIT APPLICATION \u2192'}
              </button>
            </form>
          )}
        </div>
      </section>
    </div>
  )
}
