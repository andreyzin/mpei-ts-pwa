import type { ButtonHTMLAttributes } from 'react'
import { cn } from '../../lib/cn'

type ButtonVariant = 'default' | 'ghost' | 'soft'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
}

const variants: Record<ButtonVariant, string> = {
  default: 'bg-[var(--accent)] text-white hover:opacity-90',
  ghost:
    'bg-transparent text-[var(--muted)] hover:bg-[var(--accent-soft)] hover:text-[var(--accent)]',
  soft: 'bg-[var(--accent-soft)] text-[var(--accent)] hover:brightness-95',
}

export function Button({ className, variant = 'soft', ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex min-h-9 items-center justify-center gap-2 rounded-lg px-3 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-[var(--accent)] disabled:pointer-events-none disabled:opacity-50',
        variants[variant],
        className,
      )}
      {...props}
    />
  )
}
