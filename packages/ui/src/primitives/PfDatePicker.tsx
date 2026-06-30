import { forwardRef, type InputHTMLAttributes } from 'react'
import { PfInput } from './PfInput'

export interface PfDatePickerProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  error?: boolean
}

/** Native date picker. Replace with a custom calendar widget when we need richer UX. */
export const PfDatePicker = forwardRef<HTMLInputElement, PfDatePickerProps>(function PfDatePicker(
  props,
  ref
) {
  return <PfInput ref={ref} type="date" {...props} />
})
