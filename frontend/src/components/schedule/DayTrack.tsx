import { animate, motion, useMotionValue, useReducedMotion, type PanInfo } from 'motion/react'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import type { ScheduleDay, ScheduleLesson } from '../../api/schedule'
import type { LessonFilter } from '../../domain/lessonVisibility'
import { addDays, diffDays } from '../../domain/weekMath'
import { snapSpring } from '../../lib/motion'
import { DaySchedule } from './DaySchedule'

/** Share of the viewport a drag must cover to count as a day change. */
const SWIPE_DISTANCE_RATIO = 0.25
/** Flick speed in px/s that changes the day regardless of distance. */
const SWIPE_VELOCITY = 350

type DayTrackProps = {
  date: string
  dayAt: (isoDate: string) => ScheduleDay | undefined
  filter: LessonFilter
  showHidden: boolean
  isLoading: boolean
  onDateChange: (isoDate: string) => void
  onOpenLesson: (lesson: ScheduleLesson) => void
}

/**
 * Horizontal track holding the previous, current and next day side by side.
 * The neighbours are real DOM, so a drag moves the schedule itself rather than
 * swapping it, and releasing snaps to whichever day the gesture was heading to.
 */
export function DayTrack({
  date,
  dayAt,
  filter,
  showHidden,
  isLoading,
  onDateChange,
  onOpenLesson,
}: DayTrackProps) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  const [trackDate, setTrackDate] = useState(date)
  const trackDateRef = useRef(date)
  const x = useMotionValue(0)
  const prefersReducedMotion = useReducedMotion()

  useLayoutEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) return
    setWidth(viewport.clientWidth)
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width))
    observer.observe(viewport)
    return () => observer.disconnect()
  }, [])

  // The offset must be applied in the same frame as the new day, or the panels
  // paint once at the wrong position.
  const moveTrackTo = useCallback(
    (nextDate: string, offset: number) => {
      trackDateRef.current = nextDate
      flushSync(() => setTrackDate(nextDate))
      x.jump(offset)
    },
    [x],
  )

  // Date changes coming from outside (arrows, date picker, week strip) slide in
  // from the side they came from, so the gesture and the controls read alike.
  useEffect(() => {
    if (date === trackDateRef.current) return
    const direction = Math.sign(diffDays(trackDateRef.current, date))
    if (prefersReducedMotion || width === 0) {
      moveTrackTo(date, 0)
      return
    }
    moveTrackTo(date, direction * width)
    animate(x, 0, snapSpring)
  }, [date, moveTrackTo, prefersReducedMotion, width, x])

  const handleDragEnd = (_event: unknown, info: PanInfo) => {
    if (width === 0) return
    const farEnough = Math.abs(info.offset.x) > width * SWIPE_DISTANCE_RATIO
    const fastEnough = Math.abs(info.velocity.x) > SWIPE_VELOCITY
    if (!farEnough && !fastEnough) {
      animate(x, 0, snapSpring)
      return
    }

    const intent = info.offset.x !== 0 ? info.offset.x : info.velocity.x
    const direction = intent < 0 ? 1 : -1
    const nextDate = addDays(trackDateRef.current, direction)
    const settle = () => {
      moveTrackTo(nextDate, 0)
      onDateChange(nextDate)
    }

    if (prefersReducedMotion) {
      settle()
      return
    }
    animate(x, -direction * width, { ...snapSpring, onComplete: settle })
  }

  const dates = [addDays(trackDate, -1), trackDate, addDays(trackDate, 1)]

  return (
    <div ref={viewportRef} className="overflow-hidden">
      <motion.div
        className="flex"
        style={{ x, marginLeft: -width, touchAction: 'pan-y' }}
        drag={width > 0 ? 'x' : false}
        dragDirectionLock
        dragMomentum={false}
        dragElastic={0.1}
        dragConstraints={{ left: -width, right: width }}
        onDragEnd={handleDragEnd}
      >
        {dates.map((isoDate) => (
          <div className="shrink-0" key={isoDate} style={{ width }}>
            <DaySchedule
              date={isoDate}
              day={dayAt(isoDate)}
              filter={filter}
              showHidden={showHidden}
              isLoading={isLoading}
              onOpenLesson={onOpenLesson}
            />
          </div>
        ))}
      </motion.div>
    </div>
  )
}
