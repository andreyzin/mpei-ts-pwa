import { useCallback, useEffect, useMemo, useRef, useState, type TouchEvent } from 'react'
import { Wifi } from 'lucide-react'
import { AnimatePresence } from 'motion/react'
import { usePrefetchSchedule, useSchedule } from './hooks/useSchedule'
import { localDataStore } from './domain/localDataStore'
import type { ScheduleTarget, SubjectRoomExclusion } from './domain/models'
import type { ScheduleLesson } from './api/schedule'
import { OfflineBanner } from './components/OfflineBanner'
import { BottomNav, type Screen } from './components/BottomNav'
import { LessonDetails } from './components/LessonDetails'
import { DateSelector } from './components/schedule/DateSelector'
import { SchedulePage } from './pages/SchedulePage'
import { HighlightsPage } from './pages/HighlightsPage'
import { SettingsPage } from './pages/SettingsPage'
import { InstallPwaButton } from './components/InstallPwaButton'

const isoDate = (value: Date) => value.toISOString().slice(0, 10)

const addDays = (value: string, days: number) => {
  const date = new Date(`${value}T12:00:00`)
  date.setDate(date.getDate() + days)
  return isoDate(date)
}

const dateDifference = (from: Date, to: Date) =>
  Math.round(
    (Date.UTC(to.getFullYear(), to.getMonth(), to.getDate()) -
      Date.UTC(from.getFullYear(), from.getMonth(), from.getDate())) /
      86_400_000,
  )

const mondayOf = (value: Date) => {
  const monday = new Date(value)
  monday.setDate(value.getDate() - (value.getDay() || 7) + 1)
  return monday
}

const monthName = (value: Date) =>
  new Intl.DateTimeFormat('ru-RU', { month: 'short' }).format(value).replace(/[.$]/g, '')

function formatPeriodLabel(from: string, to: string, isMobile: boolean) {
  const start = new Date(`${from}T12:00:00`)
  const finish = new Date(`${to}T12:00:00`)
  const formatDate = (date: Date) => `${date.getDate()} ${monthName(date)}`
  return isMobile ? formatDate(start) : `${formatDate(start)} — ${formatDate(finish)}`
}

export default function App() {
  const [group, setGroup] = useState<ScheduleTarget | null>(null)
  const [online, setOnline] = useState(navigator.onLine)
  const [weekOffset, setWeekOffset] = useState(0)
  const [mobileDayOffset, setMobileDayOffset] = useState(0)
  const [isMobile, setIsMobile] = useState(() => matchMedia('(max-width: 700px)').matches)
  const [excludedSubjects, setExcludedSubjects] = useState<string[]>([])
  const [excludedSubjectRooms, setExcludedSubjectRooms] = useState<SubjectRoomExclusion[]>([])
  const [showExcludedSubjects, setShowExcludedSubjects] = useState(false)
  const [screen, setScreen] = useState<Screen>('highlights')
  const [selectedLesson, setSelectedLesson] = useState<ScheduleLesson | null>(null)
  const urlInitialized = useRef(false)
  const scheduleTouchStartX = useRef<number | null>(null)

  const period = useMemo(() => {
    const now = new Date()
    if (isMobile) {
      const day = new Date(now)
      day.setDate(now.getDate() + mobileDayOffset)
      return { from: isoDate(day), to: isoDate(day) }
    }

    const monday = new Date(now)
    monday.setDate(now.getDate() - (now.getDay() || 7) + 1 + weekOffset * 7)
    const finish = new Date(monday)
    finish.setDate(monday.getDate() + 6)
    return { from: isoDate(monday), to: isoDate(finish) }
  }, [isMobile, mobileDayOffset, weekOffset])

  const schedule = useSchedule(group, period.from, period.to)
  usePrefetchSchedule(group, period.from, addDays(period.from, 13))
  const mobileDate = schedule.data?.days[0]?.date
  const periodLabel = formatPeriodLabel(period.from, period.to, isMobile)

  useEffect(() => {
    localDataStore.getPreferences().then((preferences) => {
      const params = new URLSearchParams(window.location.search)
      const queryTarget = params.get('group')
        ? { type: 'group' as const, id: Number(params.get('group')) }
        : params.get('person')
          ? { type: 'teacher' as const, id: Number(params.get('person')) }
          : params.get('aud')
            ? { type: 'room' as const, id: Number(params.get('aud')) }
            : null
      const target =
        queryTarget && Number.isFinite(queryTarget.id)
          ? {
              id: queryTarget.id,
              type: queryTarget.type,
              name: preferences.group?.name ?? 'Выбранное расписание',
            }
          : preferences.group
      setGroup(target)
      setExcludedSubjects(preferences.excludedSubjectIds)
      setExcludedSubjectRooms(preferences.excludedSubjectRooms)
      document.documentElement.dataset.theme = preferences.theme
    })

    const onlineHandler = () => setOnline(true)
    const offlineHandler = () => setOnline(false)
    addEventListener('online', onlineHandler)
    addEventListener('offline', offlineHandler)
    return () => {
      removeEventListener('online', onlineHandler)
      removeEventListener('offline', offlineHandler)
    }
  }, [])

  useEffect(() => {
    const media = matchMedia('(max-width: 700px)')
    const handler = () => setIsMobile(media.matches)
    media.addEventListener('change', handler)
    return () => media.removeEventListener('change', handler)
  }, [])

  const changePeriod = (direction: number) => {
    if (isMobile) {
      setMobileDayOffset((value) => value + direction)
      return
    }
    setWeekOffset((value) => value + direction)
  }

  const hideSubject = (subject: string) => {
    const next = [...new Set([...excludedSubjects, subject])]
    setExcludedSubjects(next)
    void localDataStore.setExcludedSubjects(next)
  }

  const handleScheduleTouchStart = (event: TouchEvent<HTMLElement>) => {
    if (screen !== 'schedule' || !isMobile || selectedLesson) return
    scheduleTouchStartX.current = event.touches[0]?.clientX ?? null
  }

  const handleScheduleTouchEnd = (event: TouchEvent<HTMLElement>) => {
    if (screen !== 'schedule' || !isMobile || selectedLesson) return
    if (scheduleTouchStartX.current === null) return
    const endX = event.changedTouches[0]?.clientX
    if (endX === undefined) return
    const delta = endX - scheduleTouchStartX.current
    scheduleTouchStartX.current = null
    if (Math.abs(delta) < 48) return
    changePeriod(delta < 0 ? 1 : -1)
  }

  const showSubject = (subject: string) => {
    const next = excludedSubjects.filter((item) => item !== subject)
    setExcludedSubjects(next)
    void localDataStore.setExcludedSubjects(next)
  }

  const hideSubjectInRoom = (subjectId: string, roomId: number) => {
    const next = [
      ...excludedSubjectRooms.filter(
        (item) => item.subjectId !== subjectId || item.roomId !== roomId,
      ),
      { subjectId, roomId },
    ]
    setExcludedSubjectRooms(next)
    void localDataStore.setExcludedSubjectRooms(next)
  }

  const showLesson = (lesson: ScheduleLesson) => {
    showSubject(lesson.subject)
    if (lesson.room) {
      const next = excludedSubjectRooms.filter(
        (item) => item.subjectId !== lesson.subject || item.roomId !== lesson.room?.id,
      )
      setExcludedSubjectRooms(next)
      void localDataStore.setExcludedSubjectRooms(next)
    }
  }

  const goToDate = useCallback(
    (value: string) => {
      const selectedDate = new Date(`${value}T12:00:00`)
      const today = new Date()
      if (isMobile) {
        setMobileDayOffset(dateDifference(today, selectedDate))
        return
      }
      setWeekOffset(dateDifference(mondayOf(today), mondayOf(selectedDate)) / 7)
    },
    [isMobile],
  )

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const date = params.get('date')
    if (date) {
      const [day, month, year] = date.split('-').map(Number)
      if (day && month && year) {
        window.setTimeout(
          () =>
            goToDate(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`),
          0,
        )
      }
    }
  }, [goToDate])

  useEffect(() => {
    if (!urlInitialized.current) {
      urlInitialized.current = true
      return
    }
    const params = new URLSearchParams(window.location.search)
    params.delete('group')
    params.delete('person')
    params.delete('aud')
    if (group)
      params.set(
        group.type === 'group' ? 'group' : group.type === 'teacher' ? 'person' : 'aud',
        String(group.id),
      )
    params.set(
      'date',
      `${period.from.slice(8, 10)}-${period.from.slice(5, 7)}-${period.from.slice(0, 4)}`,
    )
    window.history.replaceState(null, '', `${window.location.pathname}?${params}`)
  }, [group, period.from])

  return (
    <main
      className="mx-auto min-h-screen w-full max-w-6xl touch-pan-y px-3 pb-20 pt-4 sm:px-5"
      onTouchStart={handleScheduleTouchStart}
      onTouchEnd={handleScheduleTouchEnd}
    >
      {!online && <OfflineBanner />}
      <header className="flex items-end justify-between gap-4 py-3 pb-6">
        <div>
          <p className="m-0 text-[11px] font-bold tracking-[.14em] text-[var(--accent)]">
            РАСПИСАНИЕ МЭИ
          </p>
          <h1 className="mt-1 text-3xl font-semibold leading-none tracking-tight sm:text-5xl">
            Моя неделя
          </h1>
        </div>
        <span
          className={
            online
              ? 'inline-flex items-center gap-1 text-xs text-[var(--accent)]'
              : 'inline-flex items-center gap-1 text-xs text-[var(--danger)]'
          }
        >
          <Wifi size={15} />
          {online ? 'Онлайн' : 'Офлайн'}
        </span>
      </header>
      <InstallPwaButton />

      {screen === 'schedule' && (
        <DateSelector
          groupName={group?.name ?? null}
          label={periodLabel}
          showExcluded={showExcludedSubjects}
          onPrevious={() => changePeriod(-1)}
          onNext={() => changePeriod(1)}
          onToggleExcluded={() => setShowExcludedSubjects((value) => !value)}
          onToday={() => {
            setWeekOffset(0)
            setMobileDayOffset(0)
          }}
          onDateSelect={goToDate}
        />
      )}
      {screen === 'highlights' && (
        <HighlightsPage
          target={group}
          excludedSubjects={excludedSubjects}
          excludedSubjectRooms={excludedSubjectRooms}
          onOpenSchedule={() => setScreen('schedule')}
        />
      )}
      {screen === 'settings' && (
        <SettingsPage
          target={group}
          onTargetChange={(next) => {
            setGroup(next)
            void localDataStore.setGroup(next)
          }}
        />
      )}
      <BottomNav active={screen} onChange={setScreen} />

      {screen === 'schedule' && (
        <SchedulePage
          target={group}
          schedule={schedule}
          online={online}
          isMobile={isMobile}
          mobileDate={mobileDate}
          excludedSubjects={excludedSubjects}
          excludedSubjectRooms={excludedSubjectRooms}
          showExcluded={showExcludedSubjects}
          onOpenLesson={setSelectedLesson}
        />
      )}

      <AnimatePresence>
        {selectedLesson && (
          <LessonDetails
            key={selectedLesson.id}
            lesson={selectedLesson}
            onClose={() => setSelectedLesson(null)}
            onHideSubject={hideSubject}
            onHideSubjectInRoom={hideSubjectInRoom}
            isSubjectHidden={
              excludedSubjects.includes(selectedLesson.subject) ||
              (selectedLesson.room
                ? excludedSubjectRooms.some(
                    (item) =>
                      item.subjectId === selectedLesson.subject &&
                      item.roomId === selectedLesson.room?.id,
                  )
                : false)
            }
            onShowSubject={() => showLesson(selectedLesson)}
          />
        )}
      </AnimatePresence>
    </main>
  )
}
