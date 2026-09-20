import type { ScheduleLesson } from '../api/schedule'
import type { LessonFilter } from '../domain/lessonVisibility'
import type { ScheduleTarget } from '../domain/models'
import type { ScheduleWeeks } from '../hooks/useScheduleWeeks'
import { DayTrack } from '../components/schedule/DayTrack'
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
}: SchedulePageProps) {
  if (!target) {
    return (
      <div className="mt-5 rounded-md border border-dashed border-[var(--line-strong)] p-12 text-center">
        <h2>Расписание не выбрано</h2>
        <p>Открой настройки, чтобы выбрать группу, преподавателя или аудиторию.</p>
      </div>
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
          <DayTrack
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
