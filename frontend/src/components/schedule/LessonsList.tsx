import type { ScheduleLesson } from '../../api/schedule'
import type { LessonFilter } from '../../domain/lessonVisibility'
import type { ScheduleWeeks } from '../../hooks/useScheduleWeeks'
import { weekDates } from '../../domain/weekMath'
import { DaySchedule } from './DaySchedule'

type LessonsListProps = {
  mondayIso: string
  weeks: ScheduleWeeks
  filter: LessonFilter
  showHidden: boolean
  onOpenLesson: (lesson: ScheduleLesson) => void
}

/** Full week at once; the mobile layout uses `DayTrack` instead. */
export function LessonsList({
  mondayIso,
  weeks,
  filter,
  showHidden,
  onOpenLesson,
}: LessonsListProps) {
  return (
    <div className="mt-5 grid grid-cols-[repeat(auto-fit,minmax(min(100%,22rem),1fr))] gap-4">
      {weekDates(mondayIso).map((date) => (
        <DaySchedule
          key={date}
          date={date}
          day={weeks.dayAt(date)}
          filter={filter}
          showHidden={showHidden}
          isLoading={weeks.isPending}
          onOpenLesson={onOpenLesson}
        />
      ))}
    </div>
  )
}
