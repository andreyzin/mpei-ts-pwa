import { diffDays, fromIsoDate, toIsoDate } from './weekMath'

const dayTitle = new Intl.DateTimeFormat('ru-RU', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
})
const shortDate = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' })
const weekdayShort = new Intl.DateTimeFormat('ru-RU', { weekday: 'short' })
const monthName = new Intl.DateTimeFormat('ru-RU', { month: 'long' })

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

/** "сентябрь 2026" — Intl's own year format appends a "г." that reads as clutter. */
export function formatMonthTitle(isoDate: string): string {
  const date = fromIsoDate(isoDate)
  return `${monthName.format(date)} ${date.getFullYear()}`
}

const HOUR_MS = 3_600_000
const DAY_MS = 24 * HOUR_MS

/** Russian needs three forms: 1 час, 2 часа, 5 часов. */
function pluralize(count: number, one: string, few: string, many: string): string {
  const teens = count % 100
  if (teens >= 11 && teens <= 14) return many
  const last = count % 10
  if (last === 1) return one
  if (last >= 2 && last <= 4) return few
  return many
}

/**
 * How long until `target`. Under a day the answer is hours and minutes; beyond
 * that a count of hours stops being readable, so it switches to calendar days.
 */
export function formatTimeUntil(now: Date, target: Date): string {
  const distance = target.getTime() - now.getTime()
  if (distance <= 0) return 'идёт сейчас'

  if (distance < DAY_MS) {
    const hours = Math.floor(distance / HOUR_MS)
    const minutes = Math.floor((distance % HOUR_MS) / 60_000)
    const minutesLabel = `${minutes} ${pluralize(minutes, 'минута', 'минуты', 'минут')}`
    if (hours === 0) return minutesLabel
    return `${hours} ${pluralize(hours, 'час', 'часа', 'часов')}, ${minutesLabel}`
  }

  const days = diffDays(toIsoDate(now), toIsoDate(target))
  if (days === 1) return 'завтра'
  if (days === 2) return 'послезавтра'
  return `через ${days} ${pluralize(days, 'день', 'дня', 'дней')}`
}
