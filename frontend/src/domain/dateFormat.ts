import { fromIsoDate } from './weekMath'

const dayTitle = new Intl.DateTimeFormat('ru-RU', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
})
const shortDate = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' })
const weekdayShort = new Intl.DateTimeFormat('ru-RU', { weekday: 'short' })

/** Trailing dots in Russian abbreviations read as noise inside compact controls. */
const withoutTrailingDot = (value: string) => value.replace(/\.$/, '')

export function formatDayTitle(isoDate: string): string {
  return dayTitle.format(fromIsoDate(isoDate))
}

export function formatShortDate(isoDate: string): string {
  return withoutTrailingDot(shortDate.format(fromIsoDate(isoDate)))
}

export function formatWeekdayShort(isoDate: string): string {
  return withoutTrailingDot(weekdayShort.format(fromIsoDate(isoDate)))
}

export function formatDayNumber(isoDate: string): string {
  return String(fromIsoDate(isoDate).getDate())
}

export function formatDateRange(fromIso: string, toIso: string): string {
  return `${formatShortDate(fromIso)} — ${formatShortDate(toIso)}`
}
