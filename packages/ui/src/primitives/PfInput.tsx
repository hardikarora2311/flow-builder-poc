import { forwardRef, type InputHTMLAttributes } from 'react'

const cx = (...p: Array<string | undefined | false>) => p.filter(Boolean).join(' ')

export interface PfInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  error?: boolean
}

/**
 * Generic text input. Used for TEXT, EMAIL, NUMBER, DATE, PHONE field types.
 * Set `type="number"`, `type="email"` etc. to control native browser behavior.
 */
export const PfInput = forwardRef<HTMLInputElement, PfInputProps>(function PfInput(
  { error, className, ...rest },
  ref
) {
  return (
    <input
      ref={ref}
      {...rest}
      className={cx('pf-input', error && 'pf-input--error', className)}
      aria-invalid={error || undefined}
    />
  )
})
