import { useQuery } from '@tanstack/react-query'
import { fetchSchedule } from '../api/schedule'
import type { ScheduleTarget } from '../domain/models'

/**
 * Arbitrary date range, used where a screen needs a span rather than a week.
 * The schedule screen uses `useScheduleWeeks` instead.
 */
export function useSchedule(target: ScheduleTarget | null, from: string, to: string) {
  return useQuery({
    queryKey: ['schedule', target?.type, target?.id, from, to],
    queryFn: ({ signal }) => {
      if (!target) throw new Error('SCHEDULE_TARGET_MISSING')
      return fetchSchedule(target, from, to, signal)
    },
    enabled: target !== null,
    staleTime: 5 * 60 * 1000,
    gcTime: 14 * 24 * 60 * 60 * 1000,
    retry: 1,
    refetchOnReconnect: true,
    networkMode: 'offlineFirst',
  })
}
