import type { ScheduleResponse, ScheduleLesson } from '../../api/schedule'
import type { SubjectRoomExclusion } from '../../domain/models'
import { LessonCard } from './LessonCard'

function groupLessonsByTime(lessons: ScheduleLesson[]) {
  const groups = new Map<string, ScheduleLesson[]>()

  for (const lesson of lessons) {
    const key = `${lesson.start}-${lesson.finish}`
    const group = groups.get(key) ?? []
    group.push(lesson)
    groups.set(key, group)
  }

  return [...groups.entries()].map(([key, groupedLessons]) => {
    const [start, finish] = key.split('-')
    return { start, finish, lessons: groupedLessons }
  })
}

type LessonsListProps = {
  schedule: ScheduleResponse
  excludedSubjects: string[]
  excludedSubjectRooms: SubjectRoomExclusion[]
  showExcluded: boolean
  isMobile: boolean
  mobileDate?: string
  onOpenLesson: (lesson: ScheduleLesson) => void
}

export function LessonsList({
  schedule,
  excludedSubjects,
  excludedSubjectRooms,
  showExcluded,
  isMobile,
  mobileDate,
  onOpenLesson,
}: LessonsListProps) {
  return (
    <div className="mt-5 grid grid-cols-[repeat(auto-fit,minmax(min(100%,22rem),1fr))] gap-4">
      {schedule.days.map((day) => {
        const lessons = day.lessons.filter((lesson) => {
          const hiddenBySubject = excludedSubjects.includes(lesson.subject)
          const hiddenByRoom = lesson.room
            ? excludedSubjectRooms.some(
                (item) => item.subjectId === lesson.subject && item.roomId === lesson.room?.id,
              )
            : false
          return showExcluded || (!hiddenBySubject && !hiddenByRoom)
        })

        return (
          <article
            className={`rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4 ${isMobile && day.date !== mobileDate ? 'hidden' : ''}`}
            key={day.date}
          >
            <h2 className="mb-4 text-base font-semibold capitalize">
              {new Date(`${day.date}T12:00:00`).toLocaleDateString('ru-RU', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
            </h2>
            {lessons.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">Пар нет</p>
            ) : (
              <div>
                {groupLessonsByTime(lessons).map((group, index) => (
                  <div
                    className={`grid  gap-3 py-3 ${index > 0 ? 'border-t border-[var(--line)]' : ''}`}
                    key={`${group.start}-${group.finish}`}
                  >
                    <time className="pt-2 text-xs font-bold leading-relaxed text-[var(--accent)]">
                      {group.start.slice(0, 5)}
                      {/* <br /> */}
                      <span className="font-normal text-[var(--muted)]">
                        {' - '}
                        {group.finish.slice(0, 5)}
                      </span>
                    </time>
                    <div className="min-w-0">
                      {group.lessons.map((lesson) => (
                        <LessonCard
                          key={lesson.id}
                          lesson={lesson}
                          isHidden={
                            excludedSubjects.includes(lesson.subject) ||
                            (lesson.room
                              ? excludedSubjectRooms.some(
                                  (item) =>
                                    item.subjectId === lesson.subject &&
                                    item.roomId === lesson.room?.id,
                                )
                              : false)
                          }
                          onOpen={onOpenLesson}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </article>
        )
      })}
    </div>
  )
}
