import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import {
  formatDayNumber,
  formatDayTitle,
  formatMonthTitle,
  formatWeekdayShort,
} from '../../domain/dateFormat'
import {
  addMonths,
  isSameMonth,
  mondayOf,
  monthGrid,
  startOfMonth,
  weekDates,
} from '../../domain/weekMath'
import { cn } from '../../lib/cn'
import { fadeTransition } from '../../lib/motion'
import { Button } from '../ui/Button'
import { IconButton } from '../ui/IconButton'
import { Sheet } from '../ui/Sheet'

const TITLE_ID = 'date-picker-title'

type DatePickerProps = {
  selectedDate: string
  todayIso: string
  onSelect: (isoDate: string) => void
  onClose: () => void
}

export function DatePicker({ selectedDate, todayIso, onSelect, onClose }: DatePickerProps) {
  const [month, setMonth] = useState(() => startOfMonth(selectedDate))
  const weekdayLabels = weekDates(mondayOf(todayIso)).map(formatWeekdayShort)

  const choose = (isoDate: string) => {
    onSelect(isoDate)
    onClose()
  }

  return (
    <Sheet labelledBy={TITLE_ID} onClose={onClose} className="min-[701px]:max-w-sm">
      <header className="flex items-center justify-between gap-2">
        <IconButton aria-label="Предыдущий месяц" onClick={() => setMonth(addMonths(month, -1))}>
          <ChevronLeft size={18} />
        </IconButton>
        <h2 className="text-base font-semibold capitalize" id={TITLE_ID}>
          {formatMonthTitle(month)}
        </h2>
        <IconButton aria-label="Следующий месяц" onClick={() => setMonth(addMonths(month, 1))}>
          <ChevronRight size={18} />
        </IconButton>
      </header>

      <div className="mt-4 grid grid-cols-7 gap-1 text-center text-[10px] uppercase tracking-wide text-[var(--muted)]">
        {weekdayLabels.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={month}
          className="mt-1 grid grid-cols-7 gap-1"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={fadeTransition}
        >
          {monthGrid(month).map((date) => {
            const isSelected = date === selectedDate
            const isToday = date === todayIso
            return (
              <button
                key={date}
                type="button"
                aria-label={formatDayTitle(date)}
                aria-current={isToday ? 'date' : undefined}
                className={cn(
                  'grid size-11 place-items-center justify-self-center rounded-lg text-sm transition-colors focus-visible:outline-2 focus-visible:outline-[var(--accent)]',
                  isSameMonth(date, month) ? undefined : 'text-[var(--muted)] opacity-60',
                  isSelected
                    ? 'bg-[var(--accent)] font-semibold text-white'
                    : 'hover:bg-[var(--accent-soft)]',
                  isToday && !isSelected
                    ? 'border border-[var(--accent)] text-[var(--accent)]'
                    : undefined,
                )}
                onClick={() => choose(date)}
              >
                {formatDayNumber(date)}
              </button>
            )
          })}
        </motion.div>
      </AnimatePresence>

      <div className="mt-4 flex justify-end">
        <Button onClick={() => choose(todayIso)}>Сегодня</Button>
      </div>
    </Sheet>
  )
}
