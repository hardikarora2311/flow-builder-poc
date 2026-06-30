import { forwardRef, type TextareaHTMLAttributes } from 'react'

const cx = (...p: Array<string | undefined | false>) => p.filter(Boolean).join(' ')

export interface PfTextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean
}

export const PfTextarea = forwardRef<HTMLTextAreaElement, PfTextareaProps>(function PfTextarea(
  { error, className, ...rest },
  ref
) {
  return (
    <textarea
      ref={ref}
      {...rest}
      className={cx('pf-textarea', error && 'pf-textarea--error', className)}
      aria-invalid={error || undefined}
    />
  )
})
