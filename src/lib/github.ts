import type { BuildingData } from '@/types/building'

/**
 * Client fetcher for the /api/github proxy (AU_ / BUILDING).
 * TanStack Query handles caching/revalidation on top of the server's
 * 15-min TTL; errors are surfaced so pages show real fallbacks.
 */
export async function fetchBuilding(): Promise<BuildingData> {
  const r = await fetch('/api/github')
  if (!r.ok) {
    const body = await r.json().catch(() => ({}))
    throw new Error(body.error || 'GitHub activity unavailable')
  }
  return (await r.json()) as BuildingData
}
