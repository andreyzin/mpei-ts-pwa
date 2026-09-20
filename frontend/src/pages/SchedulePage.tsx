import type { ScheduleLesson } from '../api/schedule'
import type { LessonFilter } from '../domain/lessonVisibility'
import type { ScheduleTarget } from '../domain/models'
import type { ScheduleWeeks } from '../hooks/useScheduleWeeks'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { DayScroller } from '../components/schedule/DayScroller'
import { LessonsList } from '../components/schedule/LessonsList'

type SchedulePageProps = {
  target: ScheduleTarget | null
  weeks: ScheduleWeeks
  online: boolean
  isMobile: boolean
  selectedDate: string
  mondayIso: string
  filter: LessonFilter
  showHidden: boolean
  onDateChange: (isoDate: string) => void
  onOpenLesson: (lesson: ScheduleLesson) => void
  onOpenSettings: () => void
}

export function SchedulePage({
  target,
  weeks,
  online,
  isMobile,
  selectedDate,
  mondayIso,
  filter,
  showHidden,
  onDateChange,
  onOpenLesson,
  onOpenSettings,
}: SchedulePageProps) {
  if (!target) {
    return (
      <EmptyState
        className="mt-5"
        title="Расписание не выбрано"
        description="Выбери группу, преподавателя или аудиторию — выбор сохранится на этом устройстве."
        action={
          <Button variant="default" onClick={onOpenSettings}>
            Открыть настройки
          </Button>
        }
      />
    )
  }

  return (
    <div>
      {weeks.isError && (
        <div
          className="mt-4 grid gap-1 rounded-md border-l-4 border-[var(--warning)] bg-[var(--warning-soft)] px-4 py-3 text-xs text-[var(--warning)]"
          role="status"
        >
          <strong>Не удалось загрузить расписание</strong>
          <span>
            {online
              ? 'Показываем сохранённую версию.'
              : 'Нет интернета. Данные могут быть устаревшими.'}
          </span>
        </div>
      )}
      {isMobile ? (
        <div className="mt-5">
          <DayScroller
            date={selectedDate}
            dayAt={weeks.dayAt}
            filter={filter}
            showHidden={showHidden}
            isLoading={weeks.isPending}
            onDateChange={onDateChange}
            onOpenLesson={onOpenLesson}
          />
        </div>
      ) : (
        <LessonsList
          mondayIso={mondayIso}
          weeks={weeks}
          filter={filter}
          showHidden={showHidden}
          onOpenLesson={onOpenLesson}
        />
      )}
    </div>
  )
}
