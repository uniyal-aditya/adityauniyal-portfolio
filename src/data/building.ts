/**
 * AU_ / BUILDING — manual configuration (task #59: never infer the current
 * project from GitHub frequency alone; the owner configures it here).
 * Real relationships only: repos must exist on GitHub, journals must be
 * real post slugs. Update this file when the focus project changes.
 */

export interface CurrentProject {
  name: string
  description: string
  status: 'ACTIVE' | 'RECENTLY ACTIVE' | 'PAUSED'
  stack: string[]
  repo: string // GitHub repo name under the owner account (validated live)
  journalSlugs: string[] // real post slugs, newest last
  liveUrl?: string
}

export const GITHUB_USERNAME = 'uniyal-aditya'

export const CURRENT_PROJECT: CurrentProject = {
  name: 'AU_ / JOURNAL',
  description: 'This site itself — a portfolio, publication and developer-activity platform built as one system.',
  status: 'ACTIVE',
  stack: ['React', 'TypeScript', 'Supabase', 'Tiptap'],
  repo: 'adityauniyal-portfolio',
  journalSlugs: ['introducing-au-journal', 'shipping-the-notification-bell', 'why-i-rebuilt-my-portfolio-as-a-living-journal'],
}
