import type { HTMLAttributes, ReactNode } from 'react'

const cx = (...p: Array<string | undefined | false>) => p.filter(Boolean).join(' ')

export type PfBadgeVariant = 'default' | 'primary' | 'success' | 'warning' | 'error'

export interface PfBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: PfBadgeVariant
  children: ReactNode
}

export function PfBadge({ variant = 'default', className, children, ...rest }: PfBadgeProps) {
  return (
    <span
      {...rest}
      className={cx(
        'pf-badge',
        variant !== 'default' && `pf-badge--${variant}`,
        className,
      )}
    >
      {children}
    </span>
  )
}
