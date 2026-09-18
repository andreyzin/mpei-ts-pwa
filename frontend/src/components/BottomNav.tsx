import { CalendarDays, Settings, Sparkles } from 'lucide-react'

export type Screen = 'schedule' | 'highlights' | 'settings'

export function BottomNav({
  active,
  onChange,
}: {
  active: Screen
  onChange: (screen: Screen) => void
}) {
  const items = [
    { id: 'schedule' as const, label: 'Расписание', icon: CalendarDays },
    { id: 'highlights' as const, label: 'Highlights', icon: Sparkles },
    { id: 'settings' as const, label: 'Настройки', icon: Settings },
  ]
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-20 flex justify-center gap-1 border-t border-[var(--line)] bg-[color-mix(in_srgb,var(--surface)_94%,transparent)] px-4 pb-[calc(.5rem+env(safe-area-inset-bottom))] pt-2 backdrop-blur-md"
      aria-label="Основная навигация"
    >
      {items.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          className={`grid min-h-11 min-w-24 place-items-center gap-1 rounded-md px-3 py-1 text-[11px] transition-colors ${active === id ? 'bg-[var(--accent-soft)] text-[var(--accent)]' : 'text-[var(--muted)]'}`}
          onClick={() => onChange(id)}
          aria-current={active === id ? 'page' : undefined}
        >
          <Icon size={20} />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  )
}
