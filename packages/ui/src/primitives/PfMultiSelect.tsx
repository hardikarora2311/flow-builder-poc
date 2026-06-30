import { useState, type KeyboardEvent } from 'react'
import { PfBadge } from './PfBadge'
import type { PfSelectOption } from './PfSelect'

const cx = (...p: Array<string | undefined | false>) => p.filter(Boolean).join(' ')

export interface PfMultiSelectProps {
  options:      PfSelectOption[]
  value:        string[]
  onChange:     (next: string[]) => void
  placeholder?: string | undefined
  error?:       boolean | undefined
  className?:   string | undefined
  /** Disable the entire control */
  disabled?:    boolean | undefined
}

/**
 * Multi-select input. Renders selected values as removable badges with a native
 * select below for picking more. Keep it simple — lenders who need rich autocomplete
 * can swap this for their own component via screens={{ ... }}.
 */
export function PfMultiSelect({
  options, value, onChange, placeholder = 'Add…', error, className, disabled,
}: PfMultiSelectProps) {
  const [current, setCurrent] = useState('')

  const add = (v: string) => {
    if (!v || value.includes(v)) return
    onChange([...value, v])
    setCurrent('')
  }
  const remove = (v: string) => onChange(value.filter((x) => x !== v))

  const onKey = (e: KeyboardEvent<HTMLSelectElement>) => {
    if (e.key === 'Backspace' && current === '' && value.length > 0) {
      remove(value[value.length - 1]!)
    }
  }

  const available = options.filter((o) => !value.includes(o.value))

  return (
    <div className={cx('pf-stack pf-stack--gap-sm', className)}>
      {value.length > 0 && (
        <div className="pf-stack pf-stack--row pf-stack--gap-xs" style={{ flexWrap: 'wrap' }}>
          {value.map((v) => {
            const label = options.find((o) => o.value === v)?.label ?? v
            return (
              <PfBadge key={v} variant="primary">
                {label}
                <button
                  type="button"
                  onClick={() => remove(v)}
                  disabled={disabled}
                  aria-label={`Remove ${label}`}
                  style={{
                    background: 'none', border: 'none', padding: 0, marginLeft: 4,
                    cursor: 'pointer', color: 'inherit', fontSize: 'inherit',
                  }}
                >
                  ×
                </button>
              </PfBadge>
            )
          })}
        </div>
      )}
      <select
        className={cx('pf-select', error && 'pf-select--error')}
        value={current}
        onChange={(e) => add(e.target.value)}
        onKeyDown={onKey}
        disabled={disabled || available.length === 0}
      >
        <option value="">{available.length === 0 ? 'All options selected' : placeholder}</option>
        {available.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  )
}
