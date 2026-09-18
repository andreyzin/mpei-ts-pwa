import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { fetchSchedule } from '../api/schedule'
import type { ScheduleTarget } from '../domain/models'

export function useSchedule(target: ScheduleTarget | null, from: string, to: string) {
  return useQuery({
    queryKey: ['schedule', target?.type, target?.id, from, to],
    queryFn: ({ signal }) => fetchSchedule(target!, from, to, signal),
    enabled: target !== null,
    staleTime: 0,
    gcTime: 14 * 24 * 60 * 60 * 1000,
    retry: 1,
    refetchOnReconnect: true,
    networkMode: 'offlineFirst',
  })
}

export function usePrefetchSchedule(target: ScheduleTarget | null, from: string, to: string) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!target) return
    const prefetch = () => {
      if (!navigator.onLine) return
      void queryClient.prefetchQuery({
        queryKey: ['schedule', target.type, target.id, from, to],
        queryFn: ({ signal }) => fetchSchedule(target, from, to, signal),
        staleTime: 0,
      })
    }
    prefetch()
    addEventListener('online', prefetch)
    return () => removeEventListener('online', prefetch)
  }, [from, queryClient, target, to])
}
