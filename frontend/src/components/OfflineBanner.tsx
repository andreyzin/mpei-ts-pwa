import { WifiOff } from 'lucide-react'

export function OfflineBanner() {
  return (
    <div
      className="flex items-center gap-2 rounded-lg bg-[var(--warning-soft)] px-3 py-2 text-xs text-[var(--warning)]"
      role="status"
    >
      <WifiOff size={16} aria-hidden="true" />
      <span>Нет интернета. Показываем сохранённое расписание.</span>
    </div>
  )
}
