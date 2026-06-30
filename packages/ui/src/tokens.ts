/**
 * Design token names — the canonical CSS custom property list.
 *
 * Lenders override these via the FlowProvider `theme` prop or by setting
 * --pf-* CSS vars on a wrapping element. Use these typed constants when
 * referencing tokens in TypeScript code to get autocomplete and rename-safety.
 */

export const PF_TOKENS = {
  // Colors
  colorPrimary:        '--pf-color-primary',
  colorPrimaryHover:   '--pf-color-primary-hover',
  colorPrimaryText:    '--pf-color-primary-text',
  colorSecondary:      '--pf-color-secondary',
  colorBackground:     '--pf-color-background',
  colorSurface:        '--pf-color-surface',
  colorSurface2:       '--pf-color-surface-2',
  colorText:           '--pf-color-text',
  colorTextMuted:      '--pf-color-text-muted',
  colorTextSubtle:     '--pf-color-text-subtle',
  colorBorder:         '--pf-color-border',
  colorBorderStrong:   '--pf-color-border-strong',
  colorError:          '--pf-color-error',
  colorErrorSurface:   '--pf-color-error-surface',
  colorSuccess:        '--pf-color-success',
  colorSuccessSurface: '--pf-color-success-surface',
  colorWarning:        '--pf-color-warning',
  colorWarningSurface: '--pf-color-warning-surface',
  colorInfo:           '--pf-color-info',
  colorInfoSurface:    '--pf-color-info-surface',

  // Typography
  fontFamily:          '--pf-font-family',
  fontFamilyMono:      '--pf-font-family-mono',
  fontSizeXs:          '--pf-font-size-xs',
  fontSizeSm:          '--pf-font-size-sm',
  fontSizeBase:        '--pf-font-size-base',
  fontSizeLg:          '--pf-font-size-lg',
  fontSizeXl:          '--pf-font-size-xl',
  fontSizeDisplay:     '--pf-font-size-display',
  fontWeightRegular:   '--pf-font-weight-regular',
  fontWeightMedium:    '--pf-font-weight-medium',
  fontWeightBold:      '--pf-font-weight-bold',
  fontWeightHeading:   '--pf-font-weight-heading',
  lineHeightTight:     '--pf-line-height-tight',
  lineHeightBase:      '--pf-line-height-base',
  lineHeightRelaxed:   '--pf-line-height-relaxed',

  // Spacing
  spaceXs:             '--pf-space-xs',
  spaceSm:             '--pf-space-sm',
  spaceMd:             '--pf-space-md',
  spaceLg:             '--pf-space-lg',
  spaceXl:             '--pf-space-xl',
  space2xl:            '--pf-space-2xl',

  // Border radius
  radiusXs:            '--pf-radius-xs',
  radiusSm:            '--pf-radius-sm',
  radiusMd:            '--pf-radius-md',
  radiusLg:            '--pf-radius-lg',
  radiusXl:            '--pf-radius-xl',
  radiusFull:          '--pf-radius-full',
  radiusButton:        '--pf-radius-button',
  radiusInput:         '--pf-radius-input',
  radiusCard:          '--pf-radius-card',

  // Shadow
  shadowSm:            '--pf-shadow-sm',
  shadowMd:            '--pf-shadow-md',
  shadowLg:            '--pf-shadow-lg',

  // Motion
  durationFast:        '--pf-duration-fast',
  durationBase:        '--pf-duration-base',
  easing:              '--pf-easing',

  // Layout
  containerMaxWidth:   '--pf-container-max-width',
  containerPadding:    '--pf-container-padding',
  fieldGap:            '--pf-field-gap',
} as const

export type PfTokenName = (typeof PF_TOKENS)[keyof typeof PF_TOKENS]

/** `var(--pf-color-primary)` — handy when writing inline styles or className builders. */
export const pfVar = (token: PfTokenName) => `var(${token})`
