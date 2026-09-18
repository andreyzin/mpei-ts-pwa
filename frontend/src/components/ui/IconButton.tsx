import type { ButtonHTMLAttributes } from 'react'
import { Button } from './Button'

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement>

export function IconButton({ className, ...props }: IconButtonProps) {
  return <Button variant="ghost" className={`size-9 p-0 ${className ?? ''}`} {...props} />
}
