import { useState, useRef, type KeyboardEvent } from 'react'
import type { StepDefinition } from '@platform/core'

interface OTPStepProps {
  step: StepDefinition
  isSubmitting: boolean
  onSubmit: (data: Record<string, unknown>) => void
}

const OTP_LENGTH = 6

export function OTPStep({ step, isSubmitting, onSubmit }: OTPStepProps) {
  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''))
  const inputRefs = useRef<Array<HTMLInputElement | null>>(Array(OTP_LENGTH).fill(null))

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return
    const next = [...digits]
    next[index] = value.slice(-1) ?? ''
    setDigits(next)
    if (value && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus()
    }
    if (next.every((d) => d) && next.join('').length === OTP_LENGTH) {
      onSubmit({ otp: next.join('') })
    }
  }

  const handleKeyDown = (index: number, e: KeyboardEvent) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  return (
    <>
      <div className="pf-otp-inputs" role="group" aria-label="OTP input">
        {digits.map((digit, i) => (
          <input
            key={i}
            ref={(el) => {
              inputRefs.current[i] = el
            }}
            className="pf-otp-input"
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            aria-label={`Digit ${i + 1} of ${OTP_LENGTH}`}
          />
        ))}
      </div>
      <button
        className="pf-btn"
        onClick={() => onSubmit({ otp: digits.join('') })}
        disabled={isSubmitting || digits.join('').length !== OTP_LENGTH}
      >
        {isSubmitting ? 'Verifying...' : step.copy.submitLabel}
      </button>
    </>
  )
}
