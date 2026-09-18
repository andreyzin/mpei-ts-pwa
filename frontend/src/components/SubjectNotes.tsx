import { useEffect, useState } from 'react'
import { localDataStore } from '../domain/localDataStore'
import type { LessonNote } from '../domain/models'

export function SubjectNotes({
  subjectId,
  subjectName,
}: {
  subjectId: string
  subjectName: string
}) {
  const [notes, setNotes] = useState<LessonNote[]>([])
  useEffect(() => {
    localDataStore.listNotesBySubject(subjectId).then(setNotes)
  }, [subjectId])
  if (notes.length === 0) return null
  return (
    <details className="mt-2 text-xs">
      <summary className="cursor-pointer text-[var(--accent)]">
        Все заметки по предмету ({notes.length})
      </summary>
      <div className="mt-2 grid gap-2 rounded-md bg-[var(--accent-soft)] p-3">
        <h3 className="m-0 text-xs">{subjectName}</h3>
        {notes.map((note) => (
          <article className="border-t border-[var(--line)] pt-2" key={note.lessonId}>
            <time className="text-[11px] text-[var(--muted)]">
              {new Date(note.updatedAt).toLocaleDateString('ru-RU')}
            </time>
            <p className="my-1 whitespace-pre-wrap">{note.text}</p>
          </article>
        ))}
      </div>
    </details>
  )
}
