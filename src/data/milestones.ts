/**
 * Hackathons & milestones shown at the top of the Gallery page.
 * Newest / upcoming first. Dates (ISO) drive the "Upcoming / Completed" badge
 * automatically — leave `start` out if there is no exact date.
 */
export interface Milestone {
  id: string
  title: string
  /** Event · organiser line. */
  event: string
  dateLabel: string
  start?: string
  end?: string
  /** The outcome shown as the highlighted pill. */
  result: string
  project: string
  projectLine: string
  summary: string
  highlights: string[]
  role: string
  tags: string[]
  /** id of a GALLERY item (e.g. the certificate) to open from this card. */
  proofId?: string
}

export const MILESTONES: Milestone[] = [
  {
    id: 'solve-a-thon-2026',
    title: 'Solve-a-Thon: AI for SDGs',
    event: 'HIMOVATION 2026 · SRHU, Dehradun',
    dateLabel: '27–28 Nov 2026 · final round',
    start: '2026-11-27',
    end: '2026-11-28',
    result: 'Shortlisted for the final round',
    project: 'KRISHI-AI',
    projectLine: 'Personalized Farm Intelligence Platform',
    summary:
      'Using AI to make farming decisions smarter, more accessible and data-driven. Selected through the online Round 1 screening; the final round is held offline at SRHU.',
    highlights: [
      'Digital Soil Passport: a long-term record of soil health',
      'Smart Crop Recommendations from soil, season and water availability',
      'What-If Farm Simulator: compare costs, risks and returns',
      'Farmer-First Guidance: regional languages, simple explanations, offline use',
    ],
    role: 'Team Leader · Team Limitless Arise',
    tags: ['AI', 'Agriculture', 'SDGs'],
  },
  {
    id: 'codesprint-2026',
    title: 'CodeSprint 2026',
    event: 'Elite Coders · open-source buildathon',
    dateLabel: '2026',
    result: 'Semi-finalist · Top 500 of 3,000+ ideas',
    project: 'CodePreflight',
    projectLine: 'Release-readiness checks for GitHub repositories',
    summary:
      'A developer-focused tool that helps assess whether a repository is really ready for release, bringing health, security, dependency and workflow checks into one platform.',
    highlights: [
      'Repository Intelligence: finds missing docs, licenses, tests and configs',
      'Security & Dependency Analysis: vulnerabilities, exposed secrets, risky dependencies',
      'AI Remediation Assistant: plain-language explanations and next steps',
      'Readiness Dashboard and Fix Verification: rescans to track resolved and new issues',
    ],
    role: 'Team Leader · Team Limitless Arise',
    tags: ['Open source', 'Developer tools', 'AI'],
  },
  {
    id: 'hacktoberfest-2026',
    title: 'Hacktoberfest Hack Day Dehradun',
    event: 'Graphic Era Deemed to be University · AWS Student Builder Group (GEU) · Major League Hacking',
    dateLabel: '10 Oct 2026',
    start: '2026-10-10',
    end: '2026-10-10',
    result: 'Certificate of Attendance',
    project: 'NagrikPath',
    projectLine: 'A document-to-action platform',
    summary:
      'Helps people understand important information in documents and turn it into clear, actionable next steps. Presented as a first-year team among teams with much more college experience.',
    highlights: [],
    role: 'Team Limitless Arise',
    tags: ['Hackathon', 'MLH', 'AWS'],
    proofId: 'hacktoberfest-certificate',
  },
  {
    id: 'sih-2026-internal',
    title: 'Smart India Hackathon 2026: Internal Round',
    event: 'School of Technology, Dept. of Computer Science · Doon University',
    dateLabel: '22–23 Aug 2026',
    start: '2026-08-22',
    end: '2026-08-23',
    result: 'Certificate of Participation',
    project: 'Enroute',
    projectLine: 'Cheaper small-parcel delivery on routes trucks already drive',
    summary:
      'Truckers post their route and spare load capacity; people nearby browse live routes and request an on-the-way parcel drop. Direct, transparent connections, with no blind auto-matching.',
    highlights: [
      'Frontend: React 18, Vite, Tailwind CSS',
      'Backend: FastAPI, SQLAlchemy, JWT',
      'Database: Supabase (PostgreSQL)',
      'Deployed on Vercel (frontend) and Railway (backend)',
    ],
    role: 'Team AAPHAT',
    tags: ['Smart India Hackathon', 'Logistics'],
    proofId: 'sih-certificate',
  },
]

export type MilestoneTiming = 'upcoming' | 'done' | null

/** Computed from today's date so the badge never goes stale. */
export function milestoneTiming(m: Milestone, now: Date = new Date()): MilestoneTiming {
  if (!m.start) return null
  const end = new Date((m.end ?? m.start) + 'T23:59:59')
  return end.getTime() >= now.getTime() ? 'upcoming' : 'done'
}
