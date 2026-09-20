import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useReducedMotion } from 'motion/react'
import type { ScheduleDay, ScheduleLesson } from '../../api/schedule'
import type { LessonFilter } from '../../domain/lessonVisibility'
import { addDays, diffDays } from '../../domain/weekMath'
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

type DayScrollerProps = {
  date: string
  mondayIso: string
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
 * can start before the previous one has settled. The date is committed once
 * scrolling stops; only the days next to the centre render, which keeps the
 * container as tall as the visible day rather than the busiest day in three weeks.
 */
export function DayScroller({
  date,
  mondayIso,
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

  const windowStart = useMemo(() => addDays(mondayIso, -DAYS_BEFORE), [mondayIso])
  const dates = useMemo(
    () => Array.from({ length: WINDOW_LENGTH }, (_, index) => addDays(windowStart, index)),
    [windowStart],
  )
  const targetIndex = diffDays(windowStart, date)

  const [centerIndex, setCenterIndex] = useState(targetIndex)
  const centerIndexRef = useRef(targetIndex)
  const windowStartRef = useRef(windowStart)
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

  // Moving into a neighbouring week shifts the whole window, so the scroll
  // position has to be corrected before paint or the day appears to jump.
  useLayoutEffect(() => {
    const scroller = scrollerRef.current
    const shift = diffDays(windowStartRef.current, windowStart)
    windowStartRef.current = windowStart
    if (!scroller || step === 0 || shift === 0) return
    scroller.scrollLeft -= shift * step
    moveCenterTo(centerIndexRef.current - shift)
  }, [moveCenterTo, step, windowStart])

  useLayoutEffect(() => {
    const scroller = scrollerRef.current
    if (!scroller || step === 0 || positionedRef.current) return
    positionedRef.current = true
    scroller.scrollLeft = targetIndex * step
  }, [step, targetIndex])

  // Dates chosen elsewhere (week strip, arrows, date picker) scroll into view.
  useEffect(() => {
    const scroller = scrollerRef.current
    if (!scroller || step === 0) return
    const distance = Math.abs(targetIndex - centerIndexRef.current)
    if (distance === 0) return
    moveCenterTo(targetIndex)
    scroller.scrollTo({
      left: targetIndex * step,
      behavior: prefersReducedMotion || distance > SMOOTH_DISTANCE ? 'auto' : 'smooth',
    })
  }, [moveCenterTo, prefersReducedMotion, step, targetIndex])

  useEffect(
    () => () => {
      window.clearTimeout(settleTimerRef.current)
      if (frameRef.current) cancelAnimationFrame(frameRef.current)
    },
    [],
  )

  const handleScroll = useCallback(() => {
    const scroller = scrollerRef.current
    if (!scroller || step === 0 || frameRef.current) return

    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = undefined
      const index = Math.min(WINDOW_LENGTH - 1, Math.max(0, Math.round(scroller.scrollLeft / step)))
      if (index !== centerIndexRef.current) moveCenterTo(index)

      window.clearTimeout(settleTimerRef.current)
      settleTimerRef.current = window.setTimeout(() => {
        const settled = dates[centerIndexRef.current]
        if (settled && settled !== date) onDateChange(settled)
      }, SETTLE_DELAY)
    })
  }, [date, dates, moveCenterTo, onDateChange, step])

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
