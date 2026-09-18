import type { ScheduleTarget, SubjectRoomExclusion } from '../domain/models'
import { Highlights } from '../components/Highlights'

type Props = {
  target: ScheduleTarget | null
  excludedSubjects: string[]
  excludedSubjectRooms: SubjectRoomExclusion[]
  onOpenSchedule: () => void
}

export function HighlightsPage({ target, ...props }: Props) {
  return <Highlights group={target} {...props} />
}
