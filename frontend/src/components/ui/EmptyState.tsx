import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

type EmptyStateProps = {
  title: string
  description?: string
  /** The one obvious next step, when the screen has one. */
  action?: ReactNode
  className?: string
}

export function EmptyState({ title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'grid justify-items-center gap-2 rounded-md border border-dashed border-[var(--line-strong)] p-8 text-center',
        className,
      )}
    >
      <h2 className="text-lg font-semibold">{title}</h2>
      {description && <p className="m-0 max-w-sm text-sm text-[var(--muted)]">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}
