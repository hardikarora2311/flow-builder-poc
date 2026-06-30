import { forwardRef, type InputHTMLAttributes } from 'react'
import { PfInput } from './PfInput'

export interface PfNumberInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  error?: boolean
  min?:   number
  max?:   number
  step?:  number
}

/** Number-type input — same styling as PfInput, with numeric inputMode. */
export const PfNumberInput = forwardRef<HTMLInputElement, PfNumberInputProps>(function PfNumberInput(
  props,
  ref
) {
  return <PfInput ref={ref} type="number" inputMode="numeric" {...props} />
})
