import type { ScheduleTargetType } from '../domain/models'

export type SearchItem = {
  id: number
  type: ScheduleTargetType
  name: string
  description?: string
  faculty?: { name?: string }
  building?: { name?: string }
}

export async function searchEntities(
  query: string,
  type: ScheduleTargetType,
  signal?: AbortSignal,
): Promise<SearchItem[]> {
  if (!query.trim()) return []
  const params = new URLSearchParams({ type, q: query.trim(), limit: '10' })
  const response = await fetch(`/api/v1/search?${params}`, { signal })
  if (!response.ok) throw new Error(`SEARCH_${response.status}`)
  const payload = (await response.json()) as { items: SearchItem[] }
  return payload.items
}
