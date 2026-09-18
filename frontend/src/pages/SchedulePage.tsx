import type { ScheduleLesson } from '../api/schedule'
import type { ScheduleTarget, SubjectRoomExclusion } from '../domain/models'
import { useSchedule } from '../hooks/useSchedule'
import { LessonsList } from '../components/schedule/LessonsList'

type Props = {
  target: ScheduleTarget | null
  schedule: ReturnType<typeof useSchedule>
  online: boolean
  isMobile: boolean
  mobileDate?: string
  excludedSubjects: string[]
  excludedSubjectRooms: SubjectRoomExclusion[]
  showExcluded: boolean
  onOpenLesson: (lesson: ScheduleLesson) => void
}

export function SchedulePage({
  target,
  schedule,
  online,
  isMobile,
  mobileDate,
  excludedSubjects,
  excludedSubjectRooms,
  showExcluded,
  onOpenLesson,
}: Props) {
  if (!target) {
    return (
      <div className="mt-5 rounded-md border border-dashed border-[var(--line-strong)] p-12 text-center">
        <h2>Расписание не выбрано</h2>
        <p>Открой настройки, чтобы выбрать группу, преподавателя или аудиторию.</p>
      </div>
    )
  }

  if (schedule.isPending) {
    return (
      <div className="mt-5 rounded-md border border-dashed border-[var(--line-strong)] p-12 text-center">
        <p>{online ? 'Загружаем расписание…' : 'Загрузим, когда появится сеть'}</p>
      </div>
    )
  }

  return (
    <div>
      {schedule.isError && (
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
      {schedule.data && (
        <LessonsList
          schedule={schedule.data}
          excludedSubjects={excludedSubjects}
          excludedSubjectRooms={excludedSubjectRooms}
          showExcluded={showExcluded}
          isMobile={isMobile}
          mobileDate={mobileDate}
          onOpenLesson={onOpenLesson}
        />
      )}
    </div>
  )
}
