import { useEffect, useRef, useState } from 'react'
import { CalendarDays, EyeOff, MapPin, Trash2, X } from 'lucide-react'
import { Sheet } from './ui/Sheet'
import type { ScheduleLesson } from '../api/schedule'
import { localDataStore } from '../domain/localDataStore'
import { Button } from './ui/Button'
import { IconButton } from './ui/IconButton'
import { lessonTypeLabels } from './lessonTypes'

type NoteScope = 'lesson' | 'subject'

type Props = {
  lesson: ScheduleLesson
  onClose: () => void
  onHideSubject: (subject: string) => void
  onHideSubjectInRoom: (subject: string, roomId: number) => void
  isSubjectHidden: boolean
  onShowSubject: (subject: string) => void
  onOpenSchedule?: () => void
}

export function LessonDetails({
  lesson,
  onClose,
  onHideSubject,
  onHideSubjectInRoom,
  isSubjectHidden,
  onShowSubject,
  onOpenSchedule,
}: Props) {
  const [note, setNote] = useState('')
  const [subjectNote, setSubjectNote] = useState('')
  const [noteScope, setNoteScope] = useState<NoteScope>('lesson')
  const noteLoadedRef = useRef(false)

  useEffect(() => {
    let cancelled = false
    noteLoadedRef.current = false
    Promise.all([
      noteScope === 'lesson'
        ? localDataStore.getNote(lesson.id)
        : localDataStore.getSubjectNote(lesson.subject),
      localDataStore.getSubjectNote(lesson.subject),
    ]).then(([activeNote, subjectItem]) => {
      if (cancelled) return
      setNote(activeNote?.text ?? '')
      setSubjectNote(subjectItem?.text ?? '')
      noteLoadedRef.current = true
    })
    return () => {
      cancelled = true
    }
  }, [lesson.id, lesson.subject, noteScope])

  const changeNoteScope = (scope: NoteScope) => {
    if (scope === noteScope) return
    noteLoadedRef.current = false
    setNoteScope(scope)
  }

  const deleteActiveNote = () => {
    setNote('')
    if (noteScope === 'subject') {
      setSubjectNote('')
      void localDataStore.deleteSubjectNote(lesson.subject)
      return
    }
    void localDataStore.deleteNote(lesson.id)
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!noteLoadedRef.current) return
      if (!note.trim()) {
        if (noteScope === 'subject') {
          return void localDataStore.deleteSubjectNote(lesson.subject)
        }
        return void localDataStore.deleteNote(lesson.id)
      }
      void localDataStore.saveNote({
        lessonId: noteScope === 'lesson' ? lesson.id : null,
        subjectId: lesson.subject,
        subjectName: lesson.subject,
        scope: noteScope,
        text: note.trim(),
        updatedAt: new Date().toISOString(),
      })
    }, 450)
    return () => clearTimeout(timer)
  }, [lesson.id, lesson.subject, note, noteScope])

  return (
    <Sheet labelledBy="lesson-title" onClose={onClose}>
      <header className="flex justify-between gap-4">
        <div>
          <p className="m-0 text-sm font-bold text-[var(--accent)]">
            {lesson.start.slice(0, 5)} — {lesson.finish.slice(0, 5)}
          </p>
          <h2 className="mt-1 text-xl font-semibold leading-tight" id="lesson-title">
            {lesson.subject}
          </h2>
          {subjectNote && (
            <p className="mt-2 max-w-sm whitespace-pre-wrap text-sm text-[var(--muted)]">
              {subjectNote}
            </p>
          )}
        </div>
        <IconButton aria-label="Закрыть" onClick={onClose}>
          <X size={18} />
        </IconButton>
      </header>
      <dl className="my-5 grid gap-2 text-sm">
        <div className="grid grid-cols-[7rem_1fr] gap-2">
          <dt className="text-[var(--muted)]">Тип</dt>
          <dd>{lessonTypeLabels[lesson.type] ?? lesson.type}</dd>
        </div>
        <div className="grid grid-cols-[7rem_1fr] gap-2">
          <dt className="text-[var(--muted)]">Аудитория</dt>
          <dd>
            {lesson.room?.name ?? 'Не указана'}
            {lesson.room?.building ? ` · ${lesson.room.building}` : ''}
          </dd>
        </div>
        <div className="grid grid-cols-[7rem_1fr] gap-2">
          <dt className="text-[var(--muted)]">Преподаватель</dt>
          <dd>{lesson.teachers.map((teacher) => teacher.name).join(', ') || 'Не указан'}</dd>
        </div>
      </dl>
      <div className="mb-1 flex items-center justify-between gap-3">
        <label className="block text-xs text-[var(--muted)]" htmlFor="lesson-note">
          Заметка
        </label>
        <div className="flex rounded-md bg-[var(--accent-soft)] p-0.5">
          <Button
            variant={noteScope === 'lesson' ? 'default' : 'ghost'}
            className="min-h-7 px-2 text-[11px]"
            onClick={() => changeNoteScope('lesson')}
          >
            По паре
          </Button>
          <Button
            variant={noteScope === 'subject' ? 'default' : 'ghost'}
            className="min-h-7 px-2 text-[11px]"
            onClick={() => changeNoteScope('subject')}
          >
            По предмету
          </Button>
        </div>
      </div>
      <textarea
        className="block w-full resize-y rounded-md border border-[var(--line-strong)] bg-[var(--surface)] p-3 font-inherit outline-none focus:border-[var(--accent)]"
        id="lesson-note"
        value={note}
        onChange={(event) => {
          const value = event.target.value
          setNote(value)
          if (noteScope === 'subject') setSubjectNote(value)
        }}
        placeholder="Что важно запомнить?"
        rows={4}
      />
      <div className="mt-3 flex flex-wrap gap-2">
        {note.trim() && (
          <Button
            className="text-[var(--danger)] hover:bg-[var(--danger-soft)]"
            onClick={deleteActiveNote}
          >
            <Trash2 size={16} />
            Удалить заметку
          </Button>
        )}
        {onOpenSchedule && (
          <Button onClick={onOpenSchedule}>
            <CalendarDays size={16} />
            Открыть в расписании
          </Button>
        )}
        {isSubjectHidden ? (
          <Button
            onClick={() => {
              onShowSubject(lesson.subject)
              onClose()
            }}
          >
            <EyeOff size={16} />
            Показать предмет
          </Button>
        ) : (
          <>
            <Button
              className="text-[var(--danger)] hover:bg-[var(--danger-soft)]"
              onClick={() => {
                onHideSubject(lesson.subject)
                onClose()
              }}
            >
              <EyeOff size={16} />
              Скрыть предмет
            </Button>
            {lesson.room && (
              <Button
                className="text-[var(--danger)] hover:bg-[var(--danger-soft)]"
                onClick={() => {
                  onHideSubjectInRoom(lesson.subject, lesson.room!.id)
                  onClose()
                }}
              >
                <MapPin size={16} />
                Скрыть предмет в этой аудитории
              </Button>
            )}
          </>
        )}
      </div>
    </Sheet>
  )
}
