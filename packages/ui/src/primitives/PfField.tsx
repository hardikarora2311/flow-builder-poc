import type { ReactNode } from 'react'

const cx = (...p: Array<string | undefined | false>) => p.filter(Boolean).join(' ')

export interface PfFieldProps {
  /** Label text shown above the input. */
  label?:     ReactNode
  /** Mark the field as required (shows asterisk). */
  required?:  boolean
  /** htmlFor — pair with the input's id for accessibility. */
  htmlFor?:   string
  /** Help text shown below the input when there's no error. */
  help?:      ReactNode
  /** Error message shown below the input. Overrides help. */
  error?:     ReactNode
  className?: string
  children:   ReactNode
}

/**
 * Wraps any input control with a label, optional help text, and error message.
 * The single composition point for forms — every field in the SDK uses this.
 */
export function PfField({ label, required, htmlFor, help, error, className, children }: PfFieldProps) {
  const errorId = error && htmlFor ? `${htmlFor}-error` : undefined
  return (
    <div className={cx('pf-field-wrapper', className)}>
      {label !== undefined && (
        <label className="pf-label" htmlFor={htmlFor}>
          {label}
          {required && <span className="pf-required" aria-hidden="true">*</span>}
        </label>
      )}
      {children}
      {error && (
        <p id={errorId} className="pf-field-error" role="alert">
          {error}
        </p>
      )}
      {!error && help && (
        <p className="pf-field-help">{help}</p>
      )}
    </div>
  )
}
