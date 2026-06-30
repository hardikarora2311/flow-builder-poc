import type { ReactNode } from 'react'

const cx = (...p: Array<string | undefined | false>) => p.filter(Boolean).join(' ')

export interface PfRadioOption {
  value:    string
  label:    ReactNode
  disabled?:boolean | undefined
}

export interface PfRadioGroupProps {
  name:        string
  options:     PfRadioOption[]
  value?:      string | undefined
  onChange?:   ((value: string) => void) | undefined
  orientation?:'horizontal' | 'vertical' | undefined
  error?:      boolean | undefined
  className?:  string | undefined
}

export function PfRadioGroup({
  name, options, value, onChange, orientation = 'vertical', error, className,
}: PfRadioGroupProps) {
  return (
    <div
      role="radiogroup"
      aria-invalid={error || undefined}
      className={cx(
        'pf-stack',
        orientation === 'horizontal' && 'pf-stack--row',
        'pf-stack--gap-md',
        className,
      )}
    >
      {options.map((opt) => (
        <label key={opt.value} className="pf-radio">
          <input
            type="radio"
            name={name}
            value={opt.value}
            checked={value === opt.value}
            disabled={opt.disabled}
            onChange={() => onChange?.(opt.value)}
          />
          <span className="pf-radio-box" aria-hidden="true" />
          <span>{opt.label}</span>
        </label>
      ))}
    </div>
  )
}
