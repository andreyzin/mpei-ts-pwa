import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useReducedMotion } from 'motion/react'
import type { ScheduleDay, ScheduleLesson } from '../../api/schedule'
import type { LessonFilter } from '../../domain/lessonVisibility'
import { addDays, diffDays, mondayOf } from '../../domain/weekMath'
import { DaySchedule } from './DaySchedule'

/** The window matches the three weeks `useScheduleWeeks` keeps in cache. */
const DAYS_BEFORE = 7
const WINDOW_LENGTH = 21
/** Gap in px between days, so mid-scroll they read as separate sheets. */
const DAY_GAP = 16
/** Days either side of the centre that render content; the rest are spacers. */
const CONTENT_RADIUS = 1
/** Idle time after the last scroll event before the date is committed. */
const SETTLE_DELAY = 140
/** Longer jumps are instant, because smooth-scrolling past ten days is noise. */
const SMOOTH_DISTANCE = 2

const windowStartFor = (isoDate: string) => addDays(mondayOf(isoDate), -DAYS_BEFORE)

type DayScrollerProps = {
  date: string
  dayAt: (isoDate: string) => ScheduleDay | undefined
  filter: LessonFilter
  showHidden: boolean
  isLoading: boolean
  onDateChange: (isoDate: string) => void
  onOpenLesson: (lesson: ScheduleLesson) => void
}

/**
 * Three weeks of days in one horizontal scroll container with snap points.
 * Scrolling is native, so momentum carries across several days and a new swipe
 * can start before the previous one has settled.
 *
 * The window is re-anchored only once scrolling has stopped. Shifting it while
 * momentum is still running moves the scroll position under the finger, which
 * sends the scroller across another week boundary and never settles.
 */
export function DayScroller({
  date,
  dayAt,
  filter,
  showHidden,
  isLoading,
  onDateChange,
  onOpenLesson,
}: DayScrollerProps) {
  const scrollerRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  const step = width + DAY_GAP
  const prefersReducedMotion = useReducedMotion()

  const [windowStart, setWindowStart] = useState(() => windowStartFor(date))
  const windowStartRef = useRef(windowStart)
  const pendingShiftRef = useRef(0)

  const dates = useMemo(
    () => Array.from({ length: WINDOW_LENGTH }, (_, index) => addDays(windowStart, index)),
    [windowStart],
  )
  const initialIndex = diffDays(windowStart, date)
  const centerIndexRef = useRef(initialIndex)
  const [centerIndex, setCenterIndex] = useState(initialIndex)
  const positionedRef = useRef(false)
  const settleTimerRef = useRef<number>(undefined)
  const frameRef = useRef<number>(undefined)

  const moveCenterTo = useCallback((index: number) => {
    centerIndexRef.current = index
    setCenterIndex(index)
  }, [])

  useLayoutEffect(() => {
    const scroller = scrollerRef.current
    if (!scroller) return
    setWidth(scroller.clientWidth)
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width))
    observer.observe(scroller)
    return () => observer.disconnect()
  }, [])

  // Re-anchoring happens after the date is committed, never during a scroll.
  useEffect(() => {
    if (mondayOf(date) === addDays(windowStartRef.current, DAYS_BEFORE)) return
    const nextStart = windowStartFor(date)
    pendingShiftRef.current += diffDays(windowStartRef.current, nextStart)
    windowStartRef.current = nextStart
    setWindowStart(nextStart)
  }, [date])

  useLayoutEffect(() => {
    const scroller = scrollerRef.current
    if (!scroller || width === 0) return

    const index = diffDays(windowStartRef.current, date)
    if (index < 0 || index >= WINDOW_LENGTH) return

    const shifted = pendingShiftRef.current !== 0
    pendingShiftRef.current = 0

    // Position absolutely rather than by a delta. Reading scrollLeft forces
    // layout, and layout over the replaced panels makes the browser re-snap to
    // the day that was visible, so a relative correction is applied twice and
    // the scroller lands a whole week away.
    if (shifted || !positionedRef.current) {
      positionedRef.current = true
      scroller.scrollLeft = index * step
      moveCenterTo(index)
      return
    }

    // The date came from the week strip, the arrows or the date picker.
    const distance = Math.abs(index - centerIndexRef.current)
    if (distance === 0) return
    moveCenterTo(index)
    scroller.scrollTo({
      left: index * step,
      behavior: prefersReducedMotion || distance > SMOOTH_DISTANCE ? 'auto' : 'smooth',
    })
  }, [date, moveCenterTo, prefersReducedMotion, step, width, windowStart])

  useEffect(
    () => () => {
      window.clearTimeout(settleTimerRef.current)
      if (frameRef.current) cancelAnimationFrame(frameRef.current)
    },
    [],
  )

  const handleScroll = useCallback(() => {
    const scroller = scrollerRef.current
    if (!scroller || width === 0 || frameRef.current) return

    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = undefined
      const index = Math.min(WINDOW_LENGTH - 1, Math.max(0, Math.round(scroller.scrollLeft / step)))
      if (index !== centerIndexRef.current) moveCenterTo(index)

      window.clearTimeout(settleTimerRef.current)
      settleTimerRef.current = window.setTimeout(() => {
        const settled = addDays(windowStartRef.current, centerIndexRef.current)
        if (settled !== date) onDateChange(settled)
      }, SETTLE_DELAY)
    })
  }, [date, moveCenterTo, onDateChange, step, width])

  return (
    <div
      ref={scrollerRef}
      onScroll={handleScroll}
      className="flex snap-x snap-mandatory overflow-x-auto overflow-y-hidden overscroll-x-contain [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      style={{ gap: DAY_GAP }}
    >
      {dates.map((isoDate, index) => (
        <div className="w-full shrink-0 snap-start" key={isoDate}>
          {Math.abs(index - centerIndex) <= CONTENT_RADIUS && (
            <DaySchedule
              date={isoDate}
              day={dayAt(isoDate)}
              filter={filter}
              showHidden={showHidden}
              isLoading={isLoading}
              onOpenLesson={onOpenLesson}
            />
          )}
        </div>
      ))}
    </div>
  )
}
