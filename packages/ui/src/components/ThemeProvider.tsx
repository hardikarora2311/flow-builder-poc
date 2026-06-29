import { useEffect, useRef, type ReactNode } from 'react'
import type { ThemeConfig } from '@platform/core'

interface ThemeProviderProps {
  theme: ThemeConfig
  children: ReactNode
  className?: string
}

export function ThemeProvider({ theme, children, className }: ThemeProviderProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const vars: Record<string, string> = {
      '--pf-color-primary': theme.colors.primary,
      '--pf-color-secondary': theme.colors.secondary,
      '--pf-color-background': theme.colors.background,
      '--pf-color-surface': theme.colors.surface,
      '--pf-color-text': theme.colors.text,
      '--pf-color-text-muted': theme.colors.textMuted,
      '--pf-color-error': theme.colors.error,
      '--pf-color-success': theme.colors.success,
      '--pf-font-family': theme.typography.fontFamily,
      '--pf-font-size-base': theme.typography.baseFontSize,
      '--pf-font-weight-heading': theme.typography.headingWeight,
      '--pf-container-max-width': theme.spacing.containerMaxWidth,
      '--pf-container-padding': theme.spacing.containerPadding,
      '--pf-field-gap': theme.spacing.fieldGap,
      '--pf-radius-button': theme.borderRadius.button,
      '--pf-radius-input': theme.borderRadius.input,
      '--pf-radius-card': theme.borderRadius.card,
    }

    Object.entries(vars).forEach(([k, v]) => el.style.setProperty(k, v))
  }, [theme])

  return (
    <div
      ref={ref}
      className={className}
      style={{
        fontFamily: 'var(--pf-font-family, system-ui)',
        fontSize: 'var(--pf-font-size-base, 16px)',
      }}
    >
      {children}
    </div>
  )
}
