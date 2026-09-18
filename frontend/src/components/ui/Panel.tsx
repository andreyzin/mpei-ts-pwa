import type { HTMLAttributes } from 'react'
import { cn } from '../../lib/cn'

export function Panel({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return <section className={cn('rounded-lg bg-[var(--surface)] p-4', className)} {...props} />
}
