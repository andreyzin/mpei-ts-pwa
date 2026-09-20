import { useQueries } from '@tanstack/react-query'
import { useCallback, useMemo } from 'react'
import { fetchSchedule, type ScheduleDay, type ScheduleResponse } from '../api/schedule'
import type { ScheduleTarget } from '../domain/models'
import { addDays } from '../domain/weekMath'

const WEEK_STALE_TIME = 5 * 60 * 1000
const WEEK_GC_TIME = 14 * 24 * 60 * 60 * 1000

function weekQuery(target: ScheduleTarget | null, mondayIso: string) {
  return {
    queryKey: ['schedule', target?.type, target?.id, mondayIso] as const,
    queryFn: ({ signal }: { signal: AbortSignal }) => {
      if (!target) throw new Error('SCHEDULE_TARGET_MISSING')
      return fetchSchedule(target, mondayIso, addDays(mondayIso, 6), signal)
    },
    enabled: target !== null,
    // Keeping the previous week on screen is what makes navigation feel instant.
    placeholderData: (previous: ScheduleResponse | undefined) => previous,
    staleTime: WEEK_STALE_TIME,
    gcTime: WEEK_GC_TIME,
    retry: 1,
    refetchOnReconnect: true,
    networkMode: 'offlineFirst' as const,
  }
}

export type ScheduleWeeks = {
  isPending: boolean
  isError: boolean
  hasData: boolean
  dayAt: (isoDate: string) => ScheduleDay | undefined
}

/**
 * Loads the visible week together with both neighbours, so moving day by day
 * never waits for the network and crossing a week boundary is already cached.
 */
export function useScheduleWeeks(target: ScheduleTarget | null, mondayIso: string): ScheduleWeeks {
  const mondays = useMemo(
    () => [addDays(mondayIso, -7), mondayIso, addDays(mondayIso, 7)],
    [mondayIso],
  )
  const results = useQueries({ queries: mondays.map((monday) => weekQuery(target, monday)) })
  const [previous, current, next] = results
  const previousData = previous.data
  const currentData = current.data
  const nextData = next.data

  const daysByDate = useMemo(() => {
    const days = new Map<string, ScheduleDay>()
    for (const week of [previousData, currentData, nextData]) {
      for (const day of week?.days ?? []) days.set(day.date, day)
    }
    return days
  }, [previousData, currentData, nextData])

  const dayAt = useCallback((isoDate: string) => daysByDate.get(isoDate), [daysByDate])

  return {
    isPending: current.isPending,
    isError: current.isError,
    hasData: current.data !== undefined,
    dayAt,
  }
}
