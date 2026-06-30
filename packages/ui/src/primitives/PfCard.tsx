import type { HTMLAttributes, ReactNode } from 'react'

const cx = (...p: Array<string | undefined | false>) => p.filter(Boolean).join(' ')

export interface PfCardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'surface' | 'flat'
  children: ReactNode
}

/**
 * A bordered container with consistent padding + radius. The neutral building
 * block for KFS tables, mandate cards, etc.
 */
export function PfCard({ variant = 'default', className, children, ...rest }: PfCardProps) {
  return (
    <div
      {...rest}
      className={cx(
        'pf-card',
        variant !== 'default' && `pf-card--${variant}`,
        className,
      )}
    >
      {children}
    </div>
  )
}
