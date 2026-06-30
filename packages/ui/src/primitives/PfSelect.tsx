import { forwardRef, type SelectHTMLAttributes, type ReactNode } from 'react'

const cx = (...p: Array<string | undefined | false>) => p.filter(Boolean).join(' ')

export interface PfSelectOption {
  value: string
  label: string
}

export interface PfSelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size' | 'children'> {
  options?:     PfSelectOption[] | undefined
  placeholder?: string | undefined
  error?:       boolean | undefined
  /** Custom <option> children. Provide this OR options[]. */
  children?:    ReactNode | undefined
}

/**
 * Native select dropdown. Used for DROPDOWN field type.
 * Pass `options` for the common case, or use `children` for custom <optgroup>s.
 */
export const PfSelect = forwardRef<HTMLSelectElement, PfSelectProps>(function PfSelect(
  { options, placeholder, error, className, children, ...rest },
  ref
) {
  return (
    <select
      ref={ref}
      {...rest}
      className={cx('pf-select', error && 'pf-select--error', className)}
      aria-invalid={error || undefined}
    >
      {placeholder !== undefined && (
        <option value="">{placeholder}</option>
      )}
      {children
        ? children
        : options?.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
    </select>
  )
})
