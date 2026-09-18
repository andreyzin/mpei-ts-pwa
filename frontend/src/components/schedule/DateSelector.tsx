import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { useRef } from 'react'
import { Button } from '../ui/Button'
import { IconButton } from '../ui/IconButton'
import { Panel } from '../ui/Panel'

type DateSelectorProps = {
  groupName: string | null
  label: string
  showExcluded: boolean
  onPrevious: () => void
  onNext: () => void
  onToggleExcluded: () => void
  onToday: () => void
  onDateSelect: (date: string) => void
}

export function DateSelector({
  groupName,
  label,
  showExcluded,
  onPrevious,
  onNext,
  onToggleExcluded,
  onToday,
  onDateSelect,
}: DateSelectorProps) {
  const dateInputRef = useRef<HTMLInputElement>(null)

  return (
    <Panel className="flex w-full flex-col gap-3 p-2">
      <div className="flex items-start justify-between gap-3">
        <div className="grid gap-0.5">
          <span className="text-[10px] tracking-wider text-[var(--muted)]">ГРУППА</span>
          <strong>{groupName ?? 'Не выбрана'}</strong>
        </div>
        <div className="flex items-center gap-1">
          <input
            ref={dateInputRef}
            className="sr-only"
            type="date"
            tabIndex={-1}
            onChange={(event) => {
              if (event.target.value) onDateSelect(event.target.value)
            }}
          />
          <IconButton
            aria-label="Выбрать дату"
            onClick={() => {
              dateInputRef.current?.showPicker?.()
              dateInputRef.current?.focus()
            }}
          >
            <CalendarDays size={17} />
          </IconButton>
          <Button variant="ghost" className="h-8 px-2 text-xs" onClick={onToday}>
            Сегодня
          </Button>
          <Button variant="ghost" className="h-8 px-2 text-xs" onClick={onToggleExcluded}>
            {showExcluded ? 'Скрыть скрытое' : 'Показать скрытое'}
          </Button>
        </div>
      </div>
      <div className="flex min-w-[min(100%,15rem)] flex-1 items-center justify-between text-sm text-[var(--muted)]">
        <IconButton aria-label="Назад" onClick={onPrevious}>
          <ChevronLeft size={18} />
        </IconButton>
        <span className="text-center">{label}</span>
        <IconButton aria-label="Вперёд" onClick={onNext}>
          <ChevronRight size={18} />
        </IconButton>
      </div>
    </Panel>
  )
}
