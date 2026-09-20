const DAY_MS = 86_400_000

/** Noon keeps a parsed date on its calendar day regardless of DST shifts. */
const NOON = 'T12:00:00'

export function fromIsoDate(isoDate: string): Date {
  return new Date(`${isoDate}${NOON}`)
}

/** Local calendar date, unlike `toISOString()` which shifts to UTC. */
export function toIsoDate(value: Date): string {
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  return `${value.getFullYear()}-${month}-${day}`
}

export function todayIso(): string {
  return toIsoDate(new Date())
}

export function addDays(isoDate: string, days: number): string {
  const date = fromIsoDate(isoDate)
  date.setDate(date.getDate() + days)
  return toIsoDate(date)
}

export function diffDays(from: string, to: string): number {
  return Math.round((fromIsoDate(to).getTime() - fromIsoDate(from).getTime()) / DAY_MS)
}

/** Weeks start on Monday, matching how the schedule is published. */
export function mondayOf(isoDate: string): string {
  return addDays(isoDate, 1 - (fromIsoDate(isoDate).getDay() || 7))
}

export function weekDates(mondayIso: string): string[] {
  return Array.from({ length: 7 }, (_, index) => addDays(mondayIso, index))
}

export function startOfMonth(isoDate: string): string {
  const date = fromIsoDate(isoDate)
  return toIsoDate(new Date(date.getFullYear(), date.getMonth(), 1, 12))
}

export function addMonths(isoDate: string, months: number): string {
  const date = fromIsoDate(isoDate)
  return toIsoDate(new Date(date.getFullYear(), date.getMonth() + months, 1, 12))
}

export function isSameMonth(a: string, b: string): boolean {
  return a.slice(0, 7) === b.slice(0, 7)
}

/** Always six Monday-first weeks, so the grid keeps its height between months. */
export function monthGrid(monthIso: string): string[] {
  const first = mondayOf(startOfMonth(monthIso))
  return Array.from({ length: 42 }, (_, index) => addDays(first, index))
}
