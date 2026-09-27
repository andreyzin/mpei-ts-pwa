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
  /** Group from a `/<group>/<date>` share link, still to be resolved to an id. */
  groupName: string | null
  date: string | null
}

const DATE_PARAM = /^(\d{1,2})-(\d{1,2})(?:-(\d{2}|\d{4}))?$/

/** `d-m`, `d-m-yy` or `d-m-yyyy`; without a year it is the current one. */
function parseDateParam(value: string | null | undefined): string | null {
  const match = value ? DATE_PARAM.exec(value) : null
  if (!match) return null
  const [day, month] = [Number(match[1]), Number(match[2])]
  const rawYear = match[3]
  const year = !rawYear
    ? new Date().getFullYear()
    : Number(rawYear) + (rawYear.length === 2 ? 2000 : 0)
  const date = new Date(year, month - 1, day, 12)
  // Date rolls 31-02 over into March; such a date does not exist.
  return date.getMonth() === month - 1 && date.getDate() === day ? toIsoDate(date) : null
}

function decodePathSegment(segment: string): string | null {
  try {
    return decodeURIComponent(segment)
  } catch {
    return null
  }
}

function formatDateParam(isoDate: string): string {
  const [year, month, day] = isoDate.split('-')
  return `${day}-${month}-${year}`
}

export function readScheduleUrl(location: Pick<Location, 'pathname' | 'search'>): ScheduleUrlState {
  const params = new URLSearchParams(location.search)
  const segments = location.pathname.split('/').filter(Boolean)
  const shareLink = segments.length === 1 || segments.length === 2
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

  return {
    target,
    groupName: shareLink ? decodePathSegment(segments[0]) : null,
    date: (shareLink ? parseDateParam(segments[1]) : null) ?? parseDateParam(params.get('date')),
  }
}

export function writeScheduleUrl(target: ScheduleUrlTarget | null, isoDate: string): void {
  const params = new URLSearchParams(window.location.search)
  for (const param of Object.values(paramByType)) params.delete(param)
  if (target) params.set(paramByType[target.type], String(target.id))
  params.set('date', formatDateParam(isoDate))
  // Always the root: a share link's path is replaced by the ids it resolved to.
  window.history.replaceState(null, '', `/?${params}`)
}
