import type { ScheduleTargetType } from './models'
import { toIsoDate } from './weekMath'

/** Parameter names are kept compatible with links shared from ts.mpei.ru. */
const paramByType: Record<ScheduleTargetType, string> = {
  group: 'group',
  teacher: 'person',
  room: 'aud',
}

export type ScheduleUrlTarget = { type: ScheduleTargetType; id: number }

export type ScheduleUrlState = {
  target: ScheduleUrlTarget | null
  date: string | null
}

function parseDateParam(value: string | null): string | null {
  if (!value) return null
  const [day, month, year] = value.split('-').map(Number)
  if (!day || !month || !year) return null
  const date = new Date(year, month - 1, day, 12)
  return Number.isNaN(date.getTime()) ? null : toIsoDate(date)
}

function formatDateParam(isoDate: string): string {
  const [year, month, day] = isoDate.split('-')
  return `${day}-${month}-${year}`
}

export function readScheduleUrl(search: string): ScheduleUrlState {
  const params = new URLSearchParams(search)
  let target: ScheduleUrlTarget | null = null

  for (const [type, param] of Object.entries(paramByType) as [ScheduleTargetType, string][]) {
    const raw = params.get(param)
    if (raw === null) continue
    const id = Number(raw)
    if (Number.isFinite(id) && id > 0) {
      target = { type, id }
      break
    }
  }

  return { target, date: parseDateParam(params.get('date')) }
}

export function writeScheduleUrl(target: ScheduleUrlTarget | null, isoDate: string): void {
  const params = new URLSearchParams(window.location.search)
  for (const param of Object.values(paramByType)) params.delete(param)
  if (target) params.set(paramByType[target.type], String(target.id))
  params.set('date', formatDateParam(isoDate))
  window.history.replaceState(null, '', `${window.location.pathname}?${params}`)
}
