import { useQuery } from '@tanstack/react-query'
import { fetchCurrentProject, type CurrentProjectConfig } from '@/lib/journal-api'
import { CURRENT_PROJECT } from '@/data/building'

/**
 * Owner-editable "currently building" project (Admin → Settings).
 * Resolves instantly to the code fallback while loading or if the
 * site_settings row is missing — consumers never render null.
 */
export function useCurrentProject(): CurrentProjectConfig {
  const q = useQuery({
    queryKey: ['current-project'],
    queryFn: fetchCurrentProject,
    staleTime: 5 * 60_000,
  })
  return q.data ?? CURRENT_PROJECT
}
