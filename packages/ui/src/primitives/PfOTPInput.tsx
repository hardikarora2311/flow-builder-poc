import { useRef, useState, type KeyboardEvent } from 'react'

export interface PfOTPInputProps {
  length?:   number | undefined
  value?:    string | undefined
  onChange?: ((value: string) => void) | undefined
  /** Fires once the user fills the last digit. */
  onComplete?: ((value: string) => void) | undefined
  disabled?: boolean | undefined
  error?:    boolean | undefined
  className?:string | undefined
  /** Accessible label for the group of inputs. */
  ariaLabel?:string | undefined
}

const cx = (...p: Array<string | undefined | false>) => p.filter(Boolean).join(' ')

/**
 * 6-box OTP input. Auto-advances on each digit, supports backspace navigation,
 * and fires `onComplete` once all boxes are filled.
 */
export function PfOTPInput({
  length = 6,
  value = '',
  onChange,
  onComplete,
  disabled,
  error,
  className,
  ariaLabel = 'OTP input',
}: PfOTPInputProps) {
  const refs = useRef<Array<HTMLInputElement | null>>(Array(length).fill(null))
  const [internal, setInternal] = useState<string[]>(() =>
    Array.from({ length }, (_, i) => value[i] ?? '')
  )

  const digits = value
    ? Array.from({ length }, (_, i) => value[i] ?? '')
    : internal

  const setDigits = (next: string[]) => {
    setInternal(next)
    const joined = next.join('')
    onChange?.(joined)
    if (joined.length === length && next.every((d) => d !== '')) {
      onComplete?.(joined)
    }
  }

  const onDigitChange = (i: number, v: string) => {
    if (!/^\d*$/.test(v)) return
    const next = [...digits]
    next[i] = v.slice(-1) ?? ''
    setDigits(next)
    if (v && i < length - 1) refs.current[i + 1]?.focus()
  }

  const onKeyDown = (i: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) {
      refs.current[i - 1]?.focus()
    }
  }

  return (
    <div className={cx('pf-otp-inputs', className)} role="group" aria-label={ariaLabel}>
      {digits.map((digit, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el }}
          className="pf-otp-input"
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digit}
          disabled={disabled}
          aria-invalid={error || undefined}
          aria-label={`Digit ${i + 1} of ${length}`}
          onChange={(e) => onDigitChange(i, e.target.value)}
          onKeyDown={(e) => onKeyDown(i, e)}
        />
      ))}
    </div>
  )
}
