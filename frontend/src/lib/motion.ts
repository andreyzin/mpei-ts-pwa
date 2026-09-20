import type { Transition, Variants } from 'motion/react'

const easeOut = [0.22, 0.61, 0.36, 1] as const

/** Anything the finger drags or that snaps back to a rest position. */
export const snapSpring: Transition = { type: 'spring', stiffness: 420, damping: 40, mass: 0.8 }

/** Larger surfaces that slide in from an edge. */
export const sheetSpring: Transition = { type: 'spring', stiffness: 380, damping: 34 }

export const fadeTransition: Transition = { duration: 0.18, ease: easeOut }

export const screenVariants: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
}

/** Same transition without movement, for `prefers-reduced-motion`. */
export const screenFadeVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
}

export const lessonListVariants: Variants = {
  initial: {},
  animate: { transition: { staggerChildren: 0.03 } },
}

export const lessonItemVariants: Variants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.22, ease: easeOut } },
}
