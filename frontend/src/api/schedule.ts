import type { EntityRef, ScheduleTarget } from '../domain/models'

export type ScheduleLesson = {
  id: string
  start: string
  finish: string
  lesson_number: number | null
  subject: string
  type: string
  teachers: EntityRef[]
  room: { id: number; name: string; building: string | null } | null
  groups: EntityRef[]
  subgroup: number | null
  status: string
}

export type ScheduleDay = {
  date: string
  weekday: number
  lessons: ScheduleLesson[]
}

export type ScheduleResponse = {
  subject: EntityRef & { type: string }
  period: { from: string; to: string; timezone: string }
  days: ScheduleDay[]
  meta: { cached: boolean; stale: boolean; fetched_at: string }
}

export async function fetchSchedule(
  target: ScheduleTarget,
  from: string,
  to: string,
  signal?: AbortSignal,
) {
  const path = target.type === 'group' ? 'groups' : target.type === 'teacher' ? 'teachers' : 'rooms'
  const response = await fetch(`/api/v1/${path}/${target.id}/schedule?from=${from}&to=${to}`, {
    signal,
  })
  if (!response.ok) throw new Error(`SCHEDULE_${response.status}`)
  return response.json() as Promise<ScheduleResponse>
}
