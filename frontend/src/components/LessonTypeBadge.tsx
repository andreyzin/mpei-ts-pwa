import {
  BookOpen,
  FlaskConical,
  GraduationCap,
  Laptop,
  MessageSquare,
  PenLine,
  Wrench,
} from 'lucide-react'
import type { ComponentType } from 'react'
import { lessonTypeLabels } from './lessonTypes'

const icons: Record<string, ComponentType<{ size?: number }>> = {
  lecture: BookOpen,
  practice: PenLine,
  lab: FlaskConical,
  seminar: MessageSquare,
  exam: GraduationCap,
  credit: GraduationCap,
  consultation: Wrench,
  other: Laptop,
}

function formatLessonType(type: string) {
  const label = lessonTypeLabels[type] ?? type
  return label.length > 6 ? `${label.slice(0, 5)}.` : label
}

export function LessonTypeBadge({ type }: { type: string }) {
  const Icon = icons[type] ?? icons.other
  return (
    <div className="mt-1.5 flex flex-col items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
      <span className="grid size-10 place-items-center rounded-full bg-[var(--accent-soft)] text-[var(--accent)]">
        <Icon size={25} />
      </span>
      <span title={lessonTypeLabels[type] ?? type}>{formatLessonType(type)}</span>
    </div>
  )
}
