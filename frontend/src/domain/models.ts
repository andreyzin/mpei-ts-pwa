export type EntityRef = { id: number; name: string }
export type ScheduleTargetType = 'group' | 'teacher' | 'room'
export type ScheduleTarget = EntityRef & { type: ScheduleTargetType }

export type UserPreferences = {
  group: ScheduleTarget | null
  excludedSubjectIds: string[]
  excludedSubjectRooms: SubjectRoomExclusion[]
  theme: 'system' | 'light' | 'dark'
}

export type SubjectRoomExclusion = {
  subjectId: string
  roomId: number
}

export type LessonNote = {
  lessonId: string | null
  subjectId: string
  subjectName: string
  scope: 'lesson' | 'subject'
  text: string
  updatedAt: string
}

export type LocalDataSnapshot = {
  preferences: UserPreferences
  notes: LessonNote[]
}
