import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { PfSpinner } from './PfSpinner'

export type PfButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
export type PfButtonSize    = 'sm' | 'md' | 'lg'

export interface PfButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  variant?:  PfButtonVariant
  size?:     PfButtonSize
  loading?:  boolean
  /** When true, button takes only its content width (instead of full-width). */
  inline?:   boolean
  /** Optional icon shown before the label. */
  leftIcon?: ReactNode
  /** Optional icon shown after the label. */
  rightIcon?:ReactNode
  children:  ReactNode
}

const cx = (...parts: Array<string | undefined | false>) =>
  parts.filter(Boolean).join(' ')

/**
 * The primary call-to-action button. Variants map to design tokens:
 *  - primary  : background = --pf-color-primary
 *  - secondary: border + text = --pf-color-primary, transparent background
 *  - ghost    : transparent, text-only
 *  - danger   : background = --pf-color-error
 *
 * Always accepts a className passthrough so admin-supplied classes from
 * Layout node elements (className: "text-green-500") apply alongside the
 * built-in classes.
 */
export function PfButton({
  variant = 'primary',
  size    = 'md',
  loading,
  inline,
  leftIcon,
  rightIcon,
  className,
  disabled,
  children,
  ...rest
}: PfButtonProps) {
  return (
    <button
      {...rest}
      className={cx(
        'pf-btn',
        variant !== 'primary' && `pf-btn--${variant}`,
        size !== 'md' && `pf-btn--${size}`,
        inline && 'pf-btn--inline',
        className,
      )}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
    >
      {loading && <PfSpinner size="sm" />}
      {!loading && leftIcon}
      {children}
      {!loading && rightIcon}
    </button>
  )
}
