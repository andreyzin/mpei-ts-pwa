import { motion } from 'motion/react'
import { CalendarDays } from 'lucide-react'
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
  onOpenPicker: () => void
}

export function WeekStrip({
  mondayIso,
  selectedDate,
  todayIso,
  lessonCountAt,
  onSelect,
  onOpenPicker,
}: WeekStripProps) {
  return (
    <div className="grid grid-cols-8 gap-0.5">
      <div className="col-span-7 grid grid-cols-7 gap-0.5" role="tablist" aria-label="Дни недели">
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
              aria-current={isToday ? 'date' : undefined}
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
              {isToday && (
                <span
                  className="absolute inset-0 rounded-lg border border-[var(--accent)]"
                  aria-hidden="true"
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
      <button
        type="button"
        aria-label="Выбрать дату"
        className="grid min-h-14 place-items-center rounded-lg text-[var(--muted)] transition-colors hover:bg-[var(--accent-soft)] hover:text-[var(--accent)] focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
        onClick={onOpenPicker}
      >
        <CalendarDays size={18} />
      </button>
    </div>
  )
}
