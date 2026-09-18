import { useQuery } from '@tanstack/react-query'
import { searchEntities } from '../api/search'
import type { ScheduleTargetType } from '../domain/models'

export function useEntitySearch(query: string, type: ScheduleTargetType) {
  return useQuery({
    queryKey: ['search', type, query.trim().toLocaleLowerCase()],
    queryFn: ({ signal }) => searchEntities(query, type, signal),
    enabled: query.trim().length >= 2,
    staleTime: 10 * 60 * 1000,
  })
}
