import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { AnimatePresence } from 'motion/react'
import { Button } from '../ui/Button'
import { IconButton } from '../ui/IconButton'
import { Panel } from '../ui/Panel'
import { DatePicker } from './DatePicker'
import { WeekStrip } from './WeekStrip'

type DateSelectorProps = {
  groupName: string | null
  rangeLabel: string
  selectedDate: string
  mondayIso: string
  todayIso: string
  isMobile: boolean
  showExcluded: boolean
  lessonCountAt: (isoDate: string) => number
  onPrevious: () => void
  onNext: () => void
  onToggleExcluded: () => void
  onToday: () => void
  onDateSelect: (date: string) => void
}

export function DateSelector({
  groupName,
  rangeLabel,
  selectedDate,
  mondayIso,
  todayIso,
  isMobile,
  showExcluded,
  lessonCountAt,
  onPrevious,
  onNext,
  onToggleExcluded,
  onToday,
  onDateSelect,
}: DateSelectorProps) {
  const [isPickerOpen, setPickerOpen] = useState(false)

  return (
    <Panel className="flex w-full flex-col gap-3 p-2">
      <div className="flex items-start justify-between gap-3">
        <div className="grid gap-0.5">
          <span className="text-[10px] tracking-wider text-[var(--muted)]">ГРУППА</span>
          <strong>{groupName ?? 'Не выбрана'}</strong>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" className="h-8 px-2 text-xs" onClick={onToday}>
            Сегодня
          </Button>
          <Button variant="ghost" className="h-8 px-2 text-xs" onClick={onToggleExcluded}>
            {showExcluded ? 'Скрыть скрытое' : 'Показать скрытое'}
          </Button>
        </div>
      </div>
      {isMobile ? (
        <WeekStrip
          mondayIso={mondayIso}
          selectedDate={selectedDate}
          todayIso={todayIso}
          lessonCountAt={lessonCountAt}
          onSelect={onDateSelect}
          onOpenPicker={() => setPickerOpen(true)}
        />
      ) : (
        <div className="flex min-w-[min(100%,15rem)] flex-1 items-center justify-between text-sm text-[var(--muted)]">
          <IconButton aria-label="Предыдущая неделя" onClick={onPrevious}>
            <ChevronLeft size={18} />
          </IconButton>
          <span className="text-center">{rangeLabel}</span>
          <div className="flex items-center gap-1">
            <IconButton aria-label="Следующая неделя" onClick={onNext}>
              <ChevronRight size={18} />
            </IconButton>
            <IconButton aria-label="Выбрать дату" onClick={() => setPickerOpen(true)}>
              <CalendarDays size={17} />
            </IconButton>
          </div>
        </div>
      )}

      <AnimatePresence>
        {isPickerOpen && (
          <DatePicker
            selectedDate={selectedDate}
            todayIso={todayIso}
            onSelect={onDateSelect}
            onClose={() => setPickerOpen(false)}
          />
        )}
      </AnimatePresence>
    </Panel>
  )
}
