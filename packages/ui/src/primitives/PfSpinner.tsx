export interface PfSpinnerProps {
  size?:     'sm' | 'md' | 'lg'
  className?:string
  label?:    string
}

const cx = (...p: Array<string | undefined | false>) => p.filter(Boolean).join(' ')

export function PfSpinner({ size = 'md', className, label = 'Loading' }: PfSpinnerProps) {
  return (
    <span
      role="status"
      aria-label={label}
      className={cx('pf-spinner', size !== 'md' && `pf-spinner--${size}`, className)}
    />
  )
}
