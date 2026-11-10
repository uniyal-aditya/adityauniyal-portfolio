import type { IconName } from '@/components/icons/AppIcon'

/**
 * Single source of truth for every social profile on the site.
 * Footer, About, Connect and the "Let's Connect" modal all read from here,
 * and clicking one opens the in-site profile popup (SocialModal).
 *
 * To change a link or any text in a profile popup, edit ONLY this file.
 *
 * GitHub  -> shown LIVE from your /api/github endpoint (avatar, repos, activity).
 * LinkedIn / X -> LinkedIn and X do not allow reading profiles automatically
 *   (no public API, embedding and scraping blocked), so their popups show the
 *   snapshot below. Update it whenever your profile changes.
 */
export interface PreviewItem {
  title: string
  sub?: string
  /** Makes the row a link (opens in a new tab). */
  url?: string
}

export interface PreviewSection {
  heading: string
  items: PreviewItem[]
}

export interface Social {
  id: 'github' | 'linkedin' | 'x'
  label: string
  /** Shown as the handle line in the popup. */
  handle: string
  url: string
  icon: IconName
  /** Glow / accent colour for this network inside the popup. */
  accent: string
  /** One-line description (also used as the small text in menus). */
  tagline: string
  blurb: string
  /** Small pills under the intro (GitHub / X). */
  highlights: string[]
  cta: string
  /** LinkedIn-style headline + location lines under the name. */
  headline?: string
  location?: string
  /** Profile sections rendered in the popup (snapshot data). */
  sections?: PreviewSection[]
}

/**
 * Your six LinkedIn posts (titles taken from the post screenshots).
 * The lnkd.in links below are in the order you sent them and are matched to the
 * posts in the order of the screenshots — that pairing is an ASSUMPTION.
 * Open each link once; if every one lands on the right post, set
 * LINKEDIN_LINKS_CHECKED = true. Until then the rows show as plain text, so a
 * wrong link can never go live by accident.
 */
const LINKEDIN_LINKS_CHECKED = false

const LINKEDIN_POSTS: (PreviewItem & { link: string })[] = [
  {
    title: 'Shortlisted for the Solve-a-Thon final round',
    sub: 'School of Technology, Doon University · HIMOVATION 2026',
    link: 'https://lnkd.in/p/dEAqW5sf',
  },
  {
    title: 'KRISHI-AI: Team Limitless Arise at Solve-a-Thon',
    sub: 'Selected through Round 1 · SRHU, Dehradun',
    link: 'https://lnkd.in/p/dT9ZURf2',
  },
  {
    title: 'Hacktoberfest Hack Day Dehradun: NagrikPath',
    sub: '10 Oct 2026 · Graphic Era × AWS Student Builder Group × MLH',
    link: 'https://lnkd.in/p/daJXAX4M',
  },
  {
    title: 'Smart India Hackathon 2026 internal round: Enroute',
    sub: '22–23 Aug 2026 · Doon University',
    link: 'https://lnkd.in/p/dMw6g-5p',
  },
  {
    title: 'CodeSprint 2026 semi-finalists: Top 500',
    sub: 'Elite Coders · Team Limitless Arise',
    link: 'https://lnkd.in/p/dWDbh_HU',
  },
  {
    title: 'CodePreflight at CodeSprint 2026',
    sub: 'Elite Coders open-source buildathon',
    link: 'https://lnkd.in/p/dRuV6kZq',
  },
]

const FEATURED: PreviewItem[] = LINKEDIN_POSTS.map(({ link, ...item }) => ({
  ...item,
  url: LINKEDIN_LINKS_CHECKED ? link : undefined,
}))

export const SOCIALS: Social[] = [
  {
    id: 'github',
    label: 'GitHub',
    handle: '@uniyal-aditya',
    url: 'https://github.com/uniyal-aditya',
    icon: 'github',
    accent: '#a78bfa',
    tagline: 'Repositories, projects & contributions',
    blurb: 'The source code behind my work: Discord bots, web platforms and experiments, in the open.',
    highlights: [],
    cta: 'Open GitHub profile',
  },
  {
    id: 'x',
    label: 'X',
    handle: '@uaditya_dev',
    url: 'https://x.com/uaditya_dev',
    icon: 'x',
    accent: '#e7e9ea',
    tagline: 'Development updates & experiments',
    blurb: 'Short updates on what I am building, learning and shipping.',
    highlights: ['Build updates', 'Experiments', 'Dev notes'],
    cta: 'Open X profile',
  },
  {
    id: 'linkedin',
    label: 'LinkedIn',
    handle: 'in/uniyaladitya',
    url: 'https://www.linkedin.com/in/uniyaladitya/',
    icon: 'linkedin',
    accent: '#4aa3ff',
    tagline: 'Professional profile & connections',
    headline: 'B.Tech CSE Student @ Doon University | Software Development & AI | Building Projects | Tech Innovation',
    location: 'Dehradun, Uttarakhand, India',
    blurb: 'Student developer and team leader building AI and web projects, and competing in hackathons.',
    highlights: [],
    cta: 'Open LinkedIn profile',
    sections: [
      {
        heading: 'Featured',
        items: FEATURED,
      },
      {
        heading: 'Education',
        items: [{ title: 'Doon University', sub: 'B.Tech, Computer Science Engineering · 2026 – 2030' }],
      },
      {
        heading: 'Licenses & certifications',
        items: [
          { title: 'Google GEAR', sub: 'Google · May 2026' },
          { title: 'Introduction to AI Agents', sub: 'Google Cloud · May 2026' },
          { title: 'Agent Fundamentals', sub: 'Google Cloud · May 2026' },
        ],
      },
    ],
  },
]

export function getSocial(id: Social['id']): Social {
  return SOCIALS.find((s) => s.id === id) ?? SOCIALS[0]
}
