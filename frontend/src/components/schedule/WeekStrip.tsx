import { motion } from 'motion/react'
import { formatDayNumber, formatDayTitle, formatWeekdayShort } from '../../domain/dateFormat'
import { weekDates } from '../../domain/weekMath'
import { cn } from '../../lib/cn'
import { snapSpring } from '../../lib/motion'

/** More dots than this stop being countable at a glance. */
const MAX_LOAD_DOTS = 4

type WeekStripProps = {
  mondayIso: string
  selectedDate: string
  todayIso: string
  lessonCountAt: (isoDate: string) => number
  onSelect: (isoDate: string) => void
}

export function WeekStrip({
  mondayIso,
  selectedDate,
  todayIso,
  lessonCountAt,
  onSelect,
}: WeekStripProps) {
  return (
    <div className="grid grid-cols-7 gap-0.5" role="tablist" aria-label="Дни недели">
      {weekDates(mondayIso).map((date) => {
        const isSelected = date === selectedDate
        const isToday = date === todayIso
        const dots = Math.min(lessonCountAt(date), MAX_LOAD_DOTS)

        return (
          <button
            key={date}
            type="button"
            role="tab"
            aria-selected={isSelected}
            aria-label={formatDayTitle(date)}
            className="relative grid min-h-14 place-items-center gap-1 rounded-lg px-1 py-2 focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
            onClick={() => onSelect(date)}
          >
            {isSelected && (
              <motion.span
                layoutId="week-strip-selection"
                transition={snapSpring}
                className="absolute inset-0 rounded-lg bg-[var(--accent-soft)]"
              />
            )}
            <span
              className={cn(
                'relative text-[10px] uppercase tracking-wide',
                isSelected ? 'text-[var(--accent)]' : 'text-[var(--muted)]',
              )}
            >
              {formatWeekdayShort(date)}
            </span>
            <span
              className={cn(
                'relative text-sm leading-none',
                isToday ? 'font-bold' : 'font-medium',
                isSelected || isToday ? 'text-[var(--accent)]' : undefined,
              )}
            >
              {formatDayNumber(date)}
            </span>
            <span className="relative flex h-1 items-center gap-0.5">
              {Array.from({ length: dots }, (_, index) => (
                <span
                  key={index}
                  className={cn(
                    'size-1 rounded-full',
                    isSelected ? 'bg-[var(--accent)]' : 'bg-[var(--line-strong)]',
                  )}
                />
              ))}
            </span>
          </button>
        )
      })}
    </div>
  )
}
