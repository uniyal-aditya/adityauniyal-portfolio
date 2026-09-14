/** Shared types for the AU_ / BUILDING GitHub integration. */

export interface BuildingEvent {
  id: string
  type: string
  repo: string | null
  createdAt: string
  payload: {
    commits?: { sha: string; message: string }[]
    ref_type?: string
    action?: string
    pull_request?: { title: string; html_url?: string }
    issue?: { title: string; html_url?: string }
    release?: { tag_name: string; name?: string }
    ref?: string
  } | null
}

export interface BuildingRepo {
  name: string
  description: string | null
  language: string | null
  stars: number
  forks: number
  updated_at: string
  url: string
}

export interface BuildingCalendar {
  total: number
  days: Record<string, number>
  streak: number
  longest: number
  unavailable?: boolean
}

export interface BuildingData {
  cachedAt: string
  user: {
    login: string
    name: string | null
    avatar_url: string
    bio: string | null
    html_url: string
    public_repos: number
  }
  events: BuildingEvent[]
  repos: BuildingRepo[]
  calendar: BuildingCalendar
  languages: { name: string; pct: number }[]
  warning?: 'stale'
}
