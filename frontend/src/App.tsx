import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Wifi } from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useScheduleWeeks } from './hooks/useScheduleWeeks'
import { localDataStore } from './domain/localDataStore'
import { readScheduleUrl, writeScheduleUrl } from './domain/scheduleUrl'
import { isLessonHidden, visibleLessons } from './domain/lessonVisibility'
import { addDays, mondayOf, todayIso } from './domain/weekMath'
import { formatDateRange } from './domain/dateFormat'
import type { ScheduleTarget, SubjectRoomExclusion } from './domain/models'
import type { ScheduleLesson } from './api/schedule'
import { fadeTransition, screenFadeVariants, screenVariants } from './lib/motion'
import { OfflineBanner } from './components/OfflineBanner'
import { BottomNav, type Screen } from './components/BottomNav'
import { LessonDetails } from './components/LessonDetails'
import { DateSelector } from './components/schedule/DateSelector'
import { SchedulePage } from './pages/SchedulePage'
import { HighlightsPage } from './pages/HighlightsPage'
import { SettingsPage } from './pages/SettingsPage'
import { InstallPwaButton } from './components/InstallPwaButton'

const MOBILE_QUERY = '(max-width: 700px)'

export default function App() {
  const [group, setGroup] = useState<ScheduleTarget | null>(null)
  const [online, setOnline] = useState(navigator.onLine)
  const [selectedDate, setSelectedDate] = useState(
    () => readScheduleUrl(window.location.search).date ?? todayIso(),
  )
  const [isMobile, setIsMobile] = useState(() => matchMedia(MOBILE_QUERY).matches)
  const [excludedSubjects, setExcludedSubjects] = useState<string[]>([])
  const [excludedSubjectRooms, setExcludedSubjectRooms] = useState<SubjectRoomExclusion[]>([])
  const [showExcludedSubjects, setShowExcludedSubjects] = useState(false)
  const [screen, setScreen] = useState<Screen>('highlights')
  const [selectedLesson, setSelectedLesson] = useState<ScheduleLesson | null>(null)
  const urlInitialized = useRef(false)
  const prefersReducedMotion = useReducedMotion()

  const today = todayIso()
  const mondayIso = mondayOf(selectedDate)
  const filter = useMemo(
    () => ({ excludedSubjects, excludedSubjectRooms }),
    [excludedSubjects, excludedSubjectRooms],
  )

  const weeks = useScheduleWeeks(group, mondayIso)
  const rangeLabel = formatDateRange(mondayIso, addDays(mondayIso, 6))

  const lessonCountAt = useCallback(
    (isoDate: string) =>
      visibleLessons(weeks.dayAt(isoDate)?.lessons ?? [], filter, showExcludedSubjects).length,
    [filter, showExcludedSubjects, weeks],
  )

  useEffect(() => {
    localDataStore.getPreferences().then((preferences) => {
      const fromUrl = readScheduleUrl(window.location.search).target
      setGroup(
        fromUrl
          ? { ...fromUrl, name: preferences.group?.name ?? 'Выбранное расписание' }
          : preferences.group,
      )
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
    const media = matchMedia(MOBILE_QUERY)
    const handler = () => setIsMobile(media.matches)
    media.addEventListener('change', handler)
    return () => media.removeEventListener('change', handler)
  }, [])

  // Skip the first run so a shared link is not rewritten before preferences load.
  useEffect(() => {
    if (!urlInitialized.current) {
      urlInitialized.current = true
      return
    }
    writeScheduleUrl(group, selectedDate)
  }, [group, selectedDate])

  const shiftPeriod = (direction: number) =>
    setSelectedDate((date) => addDays(date, isMobile ? direction : direction * 7))

  const hideSubject = (subject: string) => {
    const next = [...new Set([...excludedSubjects, subject])]
    setExcludedSubjects(next)
    void localDataStore.setExcludedSubjects(next)
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
    if (!lesson.room) return
    const next = excludedSubjectRooms.filter(
      (item) => item.subjectId !== lesson.subject || item.roomId !== lesson.room?.id,
    )
    setExcludedSubjectRooms(next)
    void localDataStore.setExcludedSubjectRooms(next)
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-3 pb-20 pt-4 sm:px-5">
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

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={screen}
          variants={prefersReducedMotion ? screenFadeVariants : screenVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={fadeTransition}
        >
          {screen === 'schedule' && (
            <>
              <DateSelector
                groupName={group?.name ?? null}
                rangeLabel={rangeLabel}
                selectedDate={selectedDate}
                mondayIso={mondayIso}
                todayIso={today}
                isMobile={isMobile}
                showExcluded={showExcludedSubjects}
                lessonCountAt={lessonCountAt}
                onPrevious={() => shiftPeriod(-1)}
                onNext={() => shiftPeriod(1)}
                onToggleExcluded={() => setShowExcludedSubjects((value) => !value)}
                onToday={() => setSelectedDate(today)}
                onDateSelect={setSelectedDate}
              />
              <SchedulePage
                target={group}
                weeks={weeks}
                online={online}
                isMobile={isMobile}
                selectedDate={selectedDate}
                mondayIso={mondayIso}
                filter={filter}
                showHidden={showExcludedSubjects}
                onDateChange={setSelectedDate}
                onOpenLesson={setSelectedLesson}
              />
            </>
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
        </motion.div>
      </AnimatePresence>

      <BottomNav active={screen} onChange={setScreen} />

      <AnimatePresence>
        {selectedLesson && (
          <LessonDetails
            key={selectedLesson.id}
            lesson={selectedLesson}
            onClose={() => setSelectedLesson(null)}
            onHideSubject={hideSubject}
            onHideSubjectInRoom={hideSubjectInRoom}
            isSubjectHidden={isLessonHidden(selectedLesson, filter)}
            onShowSubject={() => showLesson(selectedLesson)}
          />
        )}
      </AnimatePresence>
    </main>
  )
}
