import { useEffect, type ReactNode } from 'react'
import { motion } from 'motion/react'
import { useIsMobile } from '../../hooks/useIsMobile'
import { cn } from '../../lib/cn'
import { fadeTransition, sheetSpring } from '../../lib/motion'

/** Drag distance in px past which the sheet is dismissed instead of settling. */
const DISMISS_DISTANCE = 100

type SheetProps = {
  /** Id of the heading inside `children` that names the dialog. */
  labelledBy: string
  onClose: () => void
  className?: string
  children: ReactNode
}

/**
 * Bottom sheet on a phone, centred dialog on a wide screen. Callers render the
 * contents and own the exit animation by keeping the sheet inside AnimatePresence.
 */
export function Sheet({ labelledBy, onClose, className, children }: SheetProps) {
  const isMobile = useIsMobile()

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    addEventListener('keydown', closeOnEscape)
    return () => removeEventListener('keydown', closeOnEscape)
  }, [onClose])

  return (
    <motion.div
      className="fixed inset-0 z-50 bg-[var(--overlay)] min-[701px]:grid min-[701px]:place-items-center min-[701px]:p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={fadeTransition}
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <motion.section
        className={cn(
          'fixed inset-x-0 bottom-0 max-h-[min(90vh,42rem)] overflow-y-auto rounded-t-2xl bg-[var(--surface)] p-4 shadow-2xl min-[701px]:static min-[701px]:w-full min-[701px]:max-w-lg min-[701px]:rounded-2xl min-[701px]:p-5',
          className,
        )}
        initial={isMobile ? { y: '100%' } : { opacity: 0, scale: 0.97, y: 8 }}
        animate={isMobile ? { y: 0 } : { opacity: 1, scale: 1, y: 0 }}
        exit={isMobile ? { y: '100%' } : { opacity: 0, scale: 0.97, y: 8 }}
        transition={sheetSpring}
        drag={isMobile ? 'y' : false}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={0.18}
        onDragEnd={(_event, info) => {
          if (isMobile && info.offset.y > DISMISS_DISTANCE) onClose()
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
      >
        <div
          className="mx-auto mb-4 h-1 w-10 rounded-full bg-[var(--line-strong)] min-[701px]:hidden"
          aria-hidden="true"
        />
        {children}
      </motion.section>
    </motion.div>
  )
}
