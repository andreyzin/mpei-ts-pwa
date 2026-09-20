import { motion } from 'motion/react'
import type { ScheduleLesson } from '../../api/schedule'
import { SubjectNotes } from '../SubjectNotes'
import { LessonTypeBadge } from '../LessonTypeBadge'
import { snapSpring } from '../../lib/motion'

type LessonCardProps = {
  lesson: ScheduleLesson
  isHidden?: boolean
  onOpen: (lesson: ScheduleLesson) => void
}

export function LessonCard({ lesson, isHidden = false, onOpen }: LessonCardProps) {
  const open = () => onOpen(lesson)

  return (
    <motion.div
      className={`flex w-full cursor-pointer gap-3 rounded-md py-2 text-left transition-colors hover:bg-[var(--accent-soft)] ${isHidden ? 'bg-[var(--danger-soft)]' : ''}`}
      role="button"
      tabIndex={0}
      whileTap={{ scale: 0.98 }}
      transition={snapSpring}
      onClick={open}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          open()
        }
      }}
    >
      <div className="flex w-13 shrink-0 flex-col items-center gap-1">
        <LessonTypeBadge type={lesson.type} />
      </div>
      <div className="min-w-0">
        <strong className="block break-words text-base leading-tight">
          {lesson.subject || 'Предмет не указан'}
        </strong>
        <p className="mt-1 text-xs text-[var(--muted)]">
          {lesson.room?.name ?? 'Аудитория не указана'}
          {lesson.room?.building ? ` · ${lesson.room.building}` : ''}
        </p>
        <p className="mt-1 text-xs text-[var(--muted)]">
          {lesson.teachers.map((teacher) => teacher.name).join(', ')}
        </p>
        <SubjectNotes subjectId={lesson.subject} subjectName={lesson.subject} />
      </div>
    </motion.div>
  )
}
