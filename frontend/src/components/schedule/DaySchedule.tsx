import { motion } from 'motion/react'
import type { ScheduleDay, ScheduleLesson } from '../../api/schedule'
import { formatDayTitle } from '../../domain/dateFormat'
import { isLessonHidden, visibleLessons, type LessonFilter } from '../../domain/lessonVisibility'
import { lessonItemVariants, lessonListVariants } from '../../lib/motion'
import { LessonCard } from './LessonCard'
import { LessonsSkeleton } from './LessonsSkeleton'

function groupLessonsByTime(lessons: ScheduleLesson[]) {
  const slots = new Map<string, ScheduleLesson[]>()

  for (const lesson of lessons) {
    const key = `${lesson.start}-${lesson.finish}`
    const slot = slots.get(key) ?? []
    slot.push(lesson)
    slots.set(key, slot)
  }

  return [...slots.entries()].map(([key, slotLessons]) => {
    const [start, finish] = key.split('-')
    return { start, finish, lessons: slotLessons }
  })
}

type DayScheduleProps = {
  date: string
  day: ScheduleDay | undefined
  filter: LessonFilter
  showHidden: boolean
  isLoading: boolean
  onOpenLesson: (lesson: ScheduleLesson) => void
}

export function DaySchedule({
  date,
  day,
  filter,
  showHidden,
  isLoading,
  onOpenLesson,
}: DayScheduleProps) {
  const lessons = visibleLessons(day?.lessons ?? [], filter, showHidden)

  return (
    <article className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4">
      <h2 className="mb-4 text-base font-semibold capitalize">{formatDayTitle(date)}</h2>
      {!day && isLoading ? (
        <LessonsSkeleton />
      ) : lessons.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">Пар нет</p>
      ) : (
        <motion.div
          key={date}
          variants={lessonListVariants}
          initial="initial"
          animate="animate"
          className="grid"
        >
          {groupLessonsByTime(lessons).map((slot, index) => (
            <motion.div
              variants={lessonItemVariants}
              className={`grid gap-3 py-3 ${index > 0 ? 'border-t border-[var(--line)]' : ''}`}
              key={`${slot.start}-${slot.finish}`}
            >
              <time className="pt-2 text-xs font-bold leading-relaxed text-[var(--accent)]">
                {slot.start.slice(0, 5)}
                <span className="font-normal text-[var(--muted)]">
                  {' - '}
                  {slot.finish.slice(0, 5)}
                </span>
              </time>
              <div className="min-w-0">
                {slot.lessons.map((lesson) => (
                  <LessonCard
                    key={lesson.id}
                    lesson={lesson}
                    isHidden={isLessonHidden(lesson, filter)}
                    onOpen={onOpenLesson}
                  />
                ))}
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}
    </article>
  )
}
