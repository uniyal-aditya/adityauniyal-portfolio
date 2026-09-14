// Vercel serverless route: GET /api/github
// Server-side GitHub proxy for AU_ / BUILDING. Keeps GITHUB_TOKEN off the
// client, caches aggressively (GitHub rate limits are 60/h anonymous) and
// serves stale cache on upstream failure so the page never blanks.
//
// Response shape:
// {
//   cachedAt: ISO string,          // when this data was fetched from GitHub
//   user:    { login, name, avatar_url, bio, html_url, public_repos },
//   events:  [ { id, type, repo, createdAt, commits?, title?, action?, url? } ],
//   repos:   [ { name, description, language, stars, forks, updated_at, url } ],
//   calendar: { total, days: { [date]: count }, streak, longest },
//   languages: [ { name, pct } ],
//   warning?: 'partial' | 'stale'
// }

const USER = process.env.GITHUB_USERNAME || 'uniyal-aditya'
const TOKEN = process.env.GITHUB_TOKEN || ''
const TTL_MS = 15 * 60 * 1000          // refetch at most every 15 min
const STALE_MAX_MS = 7 * 24 * 3600e3   // serve stale up to 7 days old

// In-memory cache survives across warm invocations on the same lambda.
let cache = null
let inflight = null

function gh(path) {
  return fetch('https://api.github.com' + path, {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: TOKEN ? 'Bearer ' + TOKEN : undefined,
      'User-Agent': 'au-portfolio-building',
    },
  }).then((r) => {
    if (!r.ok) throw new Error('GitHub ' + r.status + ' on ' + path)
    return r.json()
  })
}

async function fetchCalendar(login) {
  // Contribution calendar lives in GraphQL only. Without a token, skip —
  // the page degrades to activity + repos (no fake data).
  if (!TOKEN) return { total: 0, days: {}, streak: 0, longest: 0, unavailable: true }
  const query = {
    query:
      'query($l:String!){user(login:$l){contributionsCollection{contributionCalendar{totalContributions weeks{contributionDays{contributionCount date}}}}}}',
    variables: { l: login },
  }
  const r = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + TOKEN,
      'Content-Type': 'application/json',
      'User-Agent': 'au-portfolio-building',
    },
    body: JSON.stringify(query),
  })
  if (!r.ok) throw new Error('GraphQL ' + r.status)
  const j = await r.json()
  if (j.errors) throw new Error('GraphQL: ' + j.errors[0]?.message)
  const weeks = j.data.user.contributionsCollection.contributionCalendar.weeks
  const days = {}
  let streak = 0, longest = 0, run = 0
  const all = weeks.flatMap((w) => w.contributionDays).sort((a, b) => a.date.localeCompare(b.date))
  for (const d of all) {
    days[d.date] = d.contributionCount
    if (d.contributionCount > 0) {
      run++
      longest = Math.max(longest, run)
    } else run = 0
  }
  // current streak: walk backwards from today (today may be 0)
  for (let i = all.length - 1; i >= 0; i--) {
    if (all[i].contributionCount > 0) streak++
    else if (i !== all.length - 1) break
  }
  return { total: j.data.user.contributionsCollection.contributionCalendar.totalContributions, days, streak, longest }
}

async function fetchAll() {
  const [user, events, repos, calendar] = await Promise.all([
    gh('/users/' + USER),
    gh('/users/' + USER + '/events/public?per_page=60').catch(() => []),
    gh('/users/' + USER + '/repos?sort=pushed&per_page=8').catch(() => []),
    fetchCalendar(USER).catch(() => ({ total: 0, days: {}, streak: 0, longest: 0, unavailable: true })),
  ])

  const evs = events.map((e) => ({
    id: e.id,
    type: e.type, // PushEvent, PullRequestEvent, IssuesEvent, ReleaseEvent, CreateEvent, WatchEvent...
    repo: e.repo?.name?.replace(USER + '/', '') || e.repo?.name,
    createdAt: e.created_at,
    payload: e.payload,
  }))

  const langCount = {}
  for (const r of repos) if (r.language) langCount[r.language] = (langCount[r.language] || 0) + 1
  const langTotal = Object.values(langCount).reduce((a, b) => a + b, 0) || 1
  const languages = Object.entries(langCount)
    .map(([name, n]) => ({ name, pct: Math.round((n / langTotal) * 100) }))
    .sort((a, b) => b.pct - a.pct)

  return {
    user: {
      login: user.login,
      name: user.name,
      avatar_url: user.avatar_url,
      bio: user.bio,
      html_url: user.html_url,
      public_repos: user.public_repos,
    },
    events: evs,
    repos: repos.map((r) => ({
      name: r.name,
      description: r.description,
      language: r.language,
      stars: r.stargazers_count,
      forks: r.forks_count,
      updated_at: r.updated_at ?? r.pushed_at,
      url: r.html_url,
    })),
    calendar,
    languages,
  }
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  const fresh = cache && Date.now() - cache.fetchedAt < TTL_MS
  if (fresh) {
    res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=600, stale-while-revalidate=1800')
    return res.status(200).json({ ...cache.data, cachedAt: new Date(cache.fetchedAt).toISOString() })
  }

  if (!inflight) {
    inflight = fetchAll()
      .then((data) => {
        cache = { data, fetchedAt: Date.now() }
        return { ok: true, data }
      })
      .catch((e) => ({ ok: false, error: String(e?.message || e) }))
      .finally(() => {
        inflight = null
      })
  }

  const result = await inflight
  if (result.ok) {
    res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=600, stale-while-revalidate=1800')
    return res.status(200).json({ ...result.data, cachedAt: new Date(cache.fetchedAt).toISOString() })
  }

  // Upstream failed — serve stale if we have it, else a proper error state.
  if (cache && Date.now() - cache.fetchedAt < STALE_MAX_MS) {
    return res.status(200).json({ ...cache.data, cachedAt: new Date(cache.fetchedAt).toISOString(), warning: 'stale' })
  }
  return res.status(502).json({ error: 'GitHub activity unavailable', detail: result.error })
}
