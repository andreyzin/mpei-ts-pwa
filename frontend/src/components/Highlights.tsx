import { useEffect, useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import { CalendarDays, Clock3 } from 'lucide-react'
import { useSchedule } from '../hooks/useSchedule'
import { localDataStore } from '../domain/localDataStore'
import type { LessonNote, ScheduleTarget, SubjectRoomExclusion } from '../domain/models'
import { isLessonHidden } from '../domain/lessonVisibility'
import { addDays, todayIso } from '../domain/weekMath'
import { LessonDetails } from './LessonDetails'
import type { ScheduleLesson } from '../api/schedule'
import { LessonCard } from './schedule/LessonCard'

type Props = {
  group: ScheduleTarget | null
  excludedSubjects: string[]
  excludedSubjectRooms: SubjectRoomExclusion[]
  onOpenSchedule: () => void
}

export function Highlights({
  group,
  excludedSubjects,
  excludedSubjectRooms,
  onOpenSchedule,
}: Props) {
  const today = todayIso()
  const futureUntil = addDays(today, 31)
  const schedule = useSchedule(group, today, futureUntil)
  const filter = useMemo(
    () => ({ excludedSubjects, excludedSubjectRooms }),
    [excludedSubjects, excludedSubjectRooms],
  )
  const [notes, setNotes] = useState<LessonNote[]>([])
  const [showPast, setShowPast] = useState(false)
  const [selected, setSelected] = useState<ScheduleLesson | null>(null)
  useEffect(() => {
    localDataStore.exportSnapshot().then((snapshot) => setNotes(snapshot.notes))
  }, [])
  const lessons = useMemo(
    () =>
      (schedule.data?.days.find((day) => day.date === today)?.lessons ?? []).filter(
        (lesson) => !isLessonHidden(lesson, filter),
      ),
    [schedule.data, today, filter],
  )
  const toMinutes = (value: string) => {
    const [hours, minutes] = value.split(':').map(Number)
    return hours * 60 + minutes
  }
  const now = new Date()
  const nowMinutes = now.getHours() * 60 + now.getMinutes()
  const past = lessons.filter((lesson) => toMinutes(lesson.finish) <= nowMinutes)
  const visible = lessons.filter((lesson) => showPast || toMinutes(lesson.finish) > nowMinutes)
  const noteByLesson = new Map(notes.map((note) => [note.lessonId, note]))
  const futureLessons = useMemo(
    () =>
      schedule.data?.days.flatMap((day) =>
        day.lessons
          .filter((lesson) => !isLessonHidden(lesson, filter))
          .map((lesson) => ({ lesson, date: day.date })),
      ) ?? [],
    [schedule.data, filter],
  )
  const futureNotes = notes.flatMap((note) => {
    const scheduled = futureLessons.find((item) => item.lesson.id === note.lessonId)
    if (!scheduled) return []
    const isFuture =
      scheduled.date > today ||
      (scheduled.date === today && toMinutes(scheduled.lesson.finish) > nowMinutes)
    return isFuture ? [{ ...scheduled, note }] : []
  })

  return (
    <section className="pt-6">
      <p className="m-0 text-[11px] font-bold tracking-[.14em] text-[var(--accent)]">СЕГОДНЯ</p>
      <h2 className="my-1 text-3xl font-semibold tracking-tight">Highlights</h2>
      <p className="mt-0 text-[var(--muted)]">
        {new Date(`${today}T12:00:00`).toLocaleDateString('ru-RU', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
        })}
      </p>
      {!group && (
        <div className="mt-8 rounded-md border border-dashed border-[var(--line-strong)] p-8 text-center">
          <h3>Группа не выбрана</h3>
          <p>Выбери её в настройках.</p>
        </div>
      )}
      {group && schedule.isPending && (
        <div className="mt-8 rounded-md border border-dashed border-[var(--line-strong)] p-8 text-center">
          <p>Загружаем пары…</p>
        </div>
      )}
      {group && schedule.isError && !schedule.data && (
        <div className="mt-8 rounded-md border border-dashed border-[var(--line-strong)] p-8 text-center">
          <h3>Нет соединения</h3>
          <p>Сегодняшнее расписание не сохранено.</p>
        </div>
      )}
      {group && schedule.data && visible.length === 0 && !showPast && (
        <div className="mt-8 rounded-md border border-dashed border-[var(--line-strong)] p-8 text-center">
          <h3>На сегодня всё</h3>
          <p>Будущих пар нет.</p>
        </div>
      )}
      {group && (
        <div className="mt-6 grid gap-3">
          {visible.map((lesson) => {
            const start = toMinutes(lesson.start)
            const finish = toMinutes(lesson.finish)
            const progress =
              nowMinutes > start && nowMinutes < finish
                ? ((nowMinutes - start) / (finish - start)) * 100
                : 0
            const note = finish > nowMinutes ? noteByLesson.get(lesson.id) : undefined
            return (
              <article
                className="cursor-pointer overflow-hidden rounded-xl border border-[var(--line)] bg-[linear-gradient(90deg,var(--accent-soft)_var(--progress,0%),var(--surface)_var(--progress,0%))] p-4"
                key={lesson.id}
                onClick={() => setSelected(lesson)}
                style={{ '--progress': `${progress}%` } as CSSProperties}
              >
                <div className="flex items-center gap-2 text-[var(--accent)]">
                  <Clock3 size={15} />
                  <strong>{lesson.start.slice(0, 5)}</strong>
                  <span className="text-xs text-[var(--muted)]">{lesson.finish.slice(0, 5)}</span>
                </div>
                <div className="mt-2">
                  <LessonCard lesson={lesson} onOpen={setSelected} />
                  {note && (
                    <button
                      type="button"
                      className="mt-2 border-0 border-l-2 border-[var(--accent)] bg-transparent px-2 text-left text-xs text-[var(--muted)]"
                      onClick={(event) => {
                        event.stopPropagation()
                        setSelected(lesson)
                      }}
                    >
                      {note.text}
                    </button>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      )}
      {group && past.length > 0 && (
        <button
          type="button"
          className="mt-4 inline-flex items-center gap-2 rounded-md border border-[var(--line-strong)] px-3 py-2 text-xs text-[var(--accent)]"
          onClick={() => setShowPast((value) => !value)}
        >
          <CalendarDays size={16} />
          {showPast ? 'Скрыть прошедшие пары' : 'Показать прошедшие пары'}
        </button>
      )}
      {group && futureNotes.length > 0 && (
        <section className="mt-8">
          <h3 className="text-lg font-semibold">Заметки к будущим парам</h3>
          <div className="mt-3 grid gap-2">
            {futureNotes.map(({ lesson, date, note }) => (
              <button
                className="rounded-md bg-[var(--accent-soft)] p-3 text-left transition-colors hover:brightness-95"
                key={note.lessonId}
                type="button"
                onClick={() => setSelected(lesson)}
              >
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[var(--muted)]">
                  <time>
                    {new Date(`${date}T12:00:00`).toLocaleDateString('ru-RU', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                    })}
                  </time>
                  <span>{lesson.start.slice(0, 5)}</span>
                </div>
                <strong className="mt-1 block text-sm">{lesson.subject}</strong>
                <p className="m-0 mt-1 whitespace-pre-wrap text-sm text-[var(--muted)]">
                  {note.text}
                </p>
              </button>
            ))}
          </div>
        </section>
      )}
      {selected && (
        <LessonDetails
          key={selected.id}
          lesson={selected}
          onClose={() => setSelected(null)}
          onHideSubject={() => setSelected(null)}
          onHideSubjectInRoom={() => setSelected(null)}
          isSubjectHidden={false}
          onShowSubject={() => setSelected(null)}
          onOpenSchedule={() => {
            setSelected(null)
            onOpenSchedule()
          }}
        />
      )}
    </section>
  )
}
