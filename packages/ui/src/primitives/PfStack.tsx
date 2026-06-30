import type { HTMLAttributes, ReactNode } from 'react'

const cx = (...p: Array<string | undefined | false>) => p.filter(Boolean).join(' ')

export interface PfStackProps extends HTMLAttributes<HTMLDivElement> {
  direction?: 'row' | 'column'
  gap?:       'xs' | 'sm' | 'md' | 'lg' | 'xl'
  align?:     'start' | 'center' | 'end' | 'stretch'
  justify?:   'start' | 'center' | 'end' | 'between' | 'around'
  children:   ReactNode
}

/**
 * Layout primitive — flex container with token-driven gap. Used wherever
 * a row or column of items needs consistent spacing.
 */
export function PfStack({
  direction = 'column',
  gap = 'md',
  align,
  justify,
  className,
  children,
  style,
  ...rest
}: PfStackProps) {
  return (
    <div
      {...rest}
      className={cx(
        'pf-stack',
        direction === 'row' && 'pf-stack--row',
        `pf-stack--gap-${gap}`,
        align === 'center' && 'pf-stack--center',
        justify === 'between' && 'pf-stack--between',
        className,
      )}
      style={{
        ...(align && align !== 'center' ? { alignItems: align === 'start' ? 'flex-start' : align === 'end' ? 'flex-end' : align } : {}),
        ...(justify && justify !== 'between' ? { justifyContent: justify === 'start' ? 'flex-start' : justify === 'end' ? 'flex-end' : `space-${justify}` } : {}),
        ...style,
      }}
    >
      {children}
    </div>
  )
}
