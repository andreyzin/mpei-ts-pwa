import { CalendarDays, Settings, Sparkles } from 'lucide-react'
import { motion } from 'motion/react'
import { cn } from '../lib/cn'
import { snapSpring } from '../lib/motion'

export type Screen = 'schedule' | 'highlights' | 'settings'

const items = [
  { id: 'schedule' as const, label: 'Расписание', icon: CalendarDays },
  { id: 'highlights' as const, label: 'Highlights', icon: Sparkles },
  { id: 'settings' as const, label: 'Настройки', icon: Settings },
]

export function BottomNav({
  active,
  onChange,
}: {
  active: Screen
  onChange: (screen: Screen) => void
}) {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-20 flex justify-center gap-1 border-t border-[var(--line)] bg-[color-mix(in_srgb,var(--surface)_94%,transparent)] px-4 pb-[calc(.5rem+env(safe-area-inset-bottom))] pt-2 backdrop-blur-md"
      aria-label="Основная навигация"
    >
      {items.map(({ id, label, icon: Icon }) => {
        const isActive = active === id
        return (
          <motion.button
            key={id}
            className={cn(
              'relative grid min-h-11 min-w-24 place-items-center gap-1 rounded-md px-3 py-1 text-[11px] transition-colors',
              isActive ? 'text-[var(--accent)]' : 'text-[var(--muted)]',
            )}
            whileTap={{ scale: 0.96 }}
            transition={snapSpring}
            onClick={() => onChange(id)}
            aria-current={isActive ? 'page' : undefined}
          >
            {isActive && (
              <motion.span
                layoutId="bottom-nav-selection"
                transition={snapSpring}
                className="absolute inset-0 rounded-md bg-[var(--accent-soft)]"
              />
            )}
            <Icon size={20} className="relative" />
            <span className="relative">{label}</span>
          </motion.button>
        )
      })}
    </nav>
  )
}
