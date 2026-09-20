import type {
  LessonNote,
  LocalDataSnapshot,
  ScheduleTarget,
  SubjectRoomExclusion,
  UserPreferences,
} from './models'

/** Async boundary deliberately mirrors a future authenticated server repository. */
export interface LocalDataStore {
  /** Readers subscribe so a write anywhere reaches every screen showing it. */
  subscribe(listener: () => void): () => void
  getVersion(): number
  getPreferences(): Promise<UserPreferences>
  setGroup(group: ScheduleTarget | null): Promise<void>
  setExcludedSubjects(subjectIds: string[]): Promise<void>
  setExcludedSubjectRooms(exclusions: SubjectRoomExclusion[]): Promise<void>
  getNote(lessonId: string): Promise<LessonNote | null>
  getSubjectNote(subjectId: string): Promise<LessonNote | null>
  deleteSubjectNote(subjectId: string): Promise<void>
  deleteAllNotes(): Promise<void>
  listNotesBySubject(subjectId: string): Promise<LessonNote[]>
  saveNote(note: LessonNote): Promise<void>
  deleteNote(lessonId: string): Promise<void>
  exportSnapshot(): Promise<LocalDataSnapshot>
  importSnapshot(snapshot: LocalDataSnapshot): Promise<void>
}

const KEY = 'mpei-schedule:local-data:v1'
const empty: LocalDataSnapshot = {
  preferences: {
    group: null,
    excludedSubjectIds: [],
    excludedSubjectRooms: [],
    theme: 'system',
  },
  notes: [],
}

export class LocalStorageDataStore implements LocalDataStore {
  private listeners = new Set<() => void>()
  private version = 0

  subscribe = (listener: () => void) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  getVersion = () => this.version

  private read(): LocalDataSnapshot {
    try {
      const raw = localStorage.getItem(KEY)
      if (!raw) return structuredClone(empty)
      const parsed = JSON.parse(raw) as Partial<LocalDataSnapshot>
      return {
        preferences: {
          ...empty.preferences,
          ...parsed.preferences,
          group: parsed.preferences?.group
            ? { ...parsed.preferences.group, type: parsed.preferences.group.type ?? 'group' }
            : null,
        },
        notes: (parsed.notes ?? []).map((note) => ({
          ...note,
          scope: note.scope ?? 'lesson',
          lessonId: note.lessonId ?? null,
        })),
      }
    } catch {
      return structuredClone(empty)
    }
  }

  private write(snapshot: LocalDataSnapshot) {
    localStorage.setItem(KEY, JSON.stringify(snapshot))
    this.version += 1
    for (const listener of this.listeners) listener()
  }

  async getPreferences() {
    return this.read().preferences
  }
  async setGroup(group: ScheduleTarget | null) {
    const data = this.read()
    data.preferences.group = group
    this.write(data)
  }
  async setExcludedSubjects(subjectIds: string[]) {
    const data = this.read()
    data.preferences.excludedSubjectIds = [...new Set(subjectIds)]
    this.write(data)
  }
  async setExcludedSubjectRooms(exclusions: SubjectRoomExclusion[]) {
    const data = this.read()
    data.preferences.excludedSubjectRooms = exclusions
    this.write(data)
  }
  async getNote(lessonId: string) {
    return (
      this.read().notes.find((note) => note.scope === 'lesson' && note.lessonId === lessonId) ??
      null
    )
  }
  async getSubjectNote(subjectId: string) {
    return (
      this.read().notes.find((note) => note.scope === 'subject' && note.subjectId === subjectId) ??
      null
    )
  }
  async deleteSubjectNote(subjectId: string) {
    const data = this.read()
    data.notes = data.notes.filter(
      (note) => !(note.scope === 'subject' && note.subjectId === subjectId),
    )
    this.write(data)
  }
  async deleteAllNotes() {
    const data = this.read()
    data.notes = []
    this.write(data)
  }
  async listNotesBySubject(subjectId: string) {
    return this.read()
      .notes.filter((note) => note.subjectId === subjectId)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  }
  async saveNote(note: LessonNote) {
    const data = this.read()
    data.notes = data.notes.filter((item) => {
      if (note.scope === 'subject') {
        return !(item.scope === 'subject' && item.subjectId === note.subjectId)
      }
      return !(item.scope === 'lesson' && item.lessonId === note.lessonId)
    })
    data.notes.push(note)
    this.write(data)
  }
  async deleteNote(lessonId: string) {
    const data = this.read()
    data.notes = data.notes.filter(
      (note) => !(note.scope === 'lesson' && note.lessonId === lessonId),
    )
    this.write(data)
  }
  async exportSnapshot() {
    return this.read()
  }
  async importSnapshot(snapshot: LocalDataSnapshot) {
    if (
      !snapshot ||
      typeof snapshot !== 'object' ||
      !snapshot.preferences ||
      !Array.isArray(snapshot.notes) ||
      !Array.isArray(snapshot.preferences.excludedSubjectIds ?? []) ||
      !Array.isArray(snapshot.preferences.excludedSubjectRooms ?? [])
    ) {
      throw new Error('INVALID_LOCAL_DATA')
    }
    this.write({
      preferences: {
        ...empty.preferences,
        ...snapshot.preferences,
        excludedSubjectIds: snapshot.preferences.excludedSubjectIds ?? [],
        excludedSubjectRooms: snapshot.preferences.excludedSubjectRooms ?? [],
      },
      notes: snapshot.notes.map((note) => ({
        ...note,
        scope: note.scope ?? 'lesson',
        lessonId: note.lessonId ?? null,
      })),
    })
  }
}

export const localDataStore: LocalDataStore = new LocalStorageDataStore()
