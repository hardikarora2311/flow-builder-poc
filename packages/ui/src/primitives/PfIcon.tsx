import { icons as lucideIcons } from 'lucide-react'

const cx = (...p: Array<string | undefined | false>) => p.filter(Boolean).join(' ')

export interface PfIconProps {
  /** Lucide icon name in kebab-case (e.g. "circle-check") OR pascal-case (e.g. "CircleCheck"). */
  name:      string
  size?:     number | undefined
  className?:string | undefined
  /** Apply CSS spin animation — used for processing/loader icons. */
  animated?: boolean | undefined
  /** Stroke color override (defaults to currentColor). */
  color?:    string | undefined
}

// Convert "circle-check" → "CircleCheck" so we can look up Lucide icons by either form.
function toPascal(name: string): string {
  return name
    .split(/[-_ ]/)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join('')
}

/**
 * Renders a Lucide icon by name. Per the design doc, Layout node elements
 * pass `iconName` from the workflow JSON — this component looks it up.
 *
 * Falls back to a small placeholder if the icon name is unknown so the
 * SDK doesn't crash on a typo or new icon name from the server.
 */
export function PfIcon({ name, size = 20, className, animated, color }: PfIconProps) {
  const lookup = (lucideIcons as Record<string, React.ComponentType<{ size?: number; color?: string; className?: string }>>)
  const IconComponent = lookup[name] || lookup[toPascal(name)]

  if (!IconComponent) {
    if (typeof console !== 'undefined') {
      console.warn(`PfIcon: unknown icon name "${name}". Showing fallback.`)
    }
    return (
      <span
        className={cx('pf-icon-fallback', className)}
        style={{
          display: 'inline-block',
          width: size, height: size,
          borderRadius: '50%',
          background: 'var(--pf-color-surface-2)',
          border: '1px dashed var(--pf-color-border-strong)',
        }}
        aria-hidden="true"
      />
    )
  }

  const props: { size?: number; color?: string; className?: string; style?: React.CSSProperties } = {
    size,
    className: cx(animated && 'pf-spinner', className),
  }
  if (color) props.color = color
  if (animated) props.style = { animation: 'pf-spin 0.7s linear infinite' }

  return <IconComponent {...props} />
}
