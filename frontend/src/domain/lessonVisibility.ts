import type { ScheduleLesson } from '../api/schedule'
import type { SubjectRoomExclusion } from './models'

export type LessonFilter = {
  excludedSubjects: string[]
  excludedSubjectRooms: SubjectRoomExclusion[]
}

export function isLessonHidden(lesson: ScheduleLesson, filter: LessonFilter): boolean {
  if (filter.excludedSubjects.includes(lesson.subject)) return true
  const room = lesson.room
  if (!room) return false
  return filter.excludedSubjectRooms.some(
    (item) => item.subjectId === lesson.subject && item.roomId === room.id,
  )
}

export function visibleLessons(
  lessons: ScheduleLesson[],
  filter: LessonFilter,
  showHidden: boolean,
): ScheduleLesson[] {
  if (showHidden) return lessons
  return lessons.filter((lesson) => !isLessonHidden(lesson, filter))
}
