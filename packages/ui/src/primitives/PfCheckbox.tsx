import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react'

const cx = (...p: Array<string | undefined | false>) => p.filter(Boolean).join(' ')

export interface PfCheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?:    ReactNode | undefined
  required?: boolean | undefined
  error?:    boolean | undefined
}

export const PfCheckbox = forwardRef<HTMLInputElement, PfCheckboxProps>(function PfCheckbox(
  { label, required, error, className, ...rest },
  ref
) {
  return (
    <label className={cx('pf-checkbox', className)}>
      <input ref={ref} type="checkbox" {...rest} />
      <span className="pf-checkbox-box" aria-hidden="true">
        {rest.checked && (
          <svg width="12" height="9" viewBox="0 0 12 9" fill="none">
            <path d="M1 4L4.5 7.5L11 1" stroke="var(--pf-color-primary-text)"
                  strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      {label !== undefined && (
        <span>
          {label}
          {required && <span className="pf-required" aria-hidden="true">*</span>}
        </span>
      )}
    </label>
  )
})
