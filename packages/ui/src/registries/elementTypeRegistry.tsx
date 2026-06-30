/**
 * elementTypeRegistry — maps Layout-node element types to React components.
 *
 * Per the design doc §7.6, a Layout step's response carries `elements[]`
 * where each element looks like:
 *   { type: "icon", iconName: "circle-check", iconSize: "32", className: "text-green-500" }
 *   { tag:  "h1",  text: "GST Report Fetched", className: "text-2xl font-bold" }
 *   { type: "paragraph", text: "Fetched GST Report for Acme Corp.", className: "text-gray-600" }
 *   { type: "buttons_list", items: [{ action: "navigate", target_node: "#next", text: "Continue" }] }
 *
 * Note: text values have STORE variables already resolved server-side; the SDK
 * never sees ${STORE.*} syntax.
 */

import type { ComponentType, ReactNode } from 'react'
import { PfIcon } from '../primitives/PfIcon'
import { PfButton } from '../primitives/PfButton'

// ─── Element shape ───────────────────────────────────────────────────────────

export interface LayoutElement {
  /** Discriminator for non-text-tag elements. */
  type?:      string
  /** Discriminator for text-tag elements (h1, h2, h3, p). */
  tag?:       string
  text?:      string
  iconName?:  string
  iconSize?:  string
  className?: string
  animated?:  boolean
  items?: Array<{
    action:        string
    target_node?:  string
    text:          string
    variant?:      string
  }>
}

// ─── Renderer contract ───────────────────────────────────────────────────────

export interface ElementRendererProps {
  element:  LayoutElement
  /** Called when a button inside the element wants to navigate. */
  onAction?:((action: { type: string; target_node?: string }) => void) | undefined
}

export type ElementRenderer = ComponentType<ElementRendererProps>

// ─── Built-in renderers ──────────────────────────────────────────────────────

const IconElement: ElementRenderer = ({ element: el }) => (
  <PfIcon
    name={el.iconName ?? 'circle'}
    size={el.iconSize ? Number(el.iconSize) : 32}
    className={el.className}
    animated={el.animated ?? false}
  />
)

const HeadingElement: ElementRenderer = ({ element: el }) => {
  const Tag = (el.tag ?? 'h2') as 'h1' | 'h2' | 'h3'
  return <Tag className={el.className}>{el.text}</Tag>
}

const ParagraphElement: ElementRenderer = ({ element: el }) => (
  <p className={el.className}>{el.text}</p>
)

const ButtonsListElement: ElementRenderer = ({ element: el, onAction }) => (
  <div className={el.className} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--pf-space-sm)' }}>
    {(el.items ?? []).map((btn) => (
      <PfButton
        key={`${btn.action}-${btn.target_node ?? btn.text}`}
        variant={(btn.variant as 'primary' | 'secondary' | 'danger' | undefined) ?? 'primary'}
        onClick={() => {
          const payload: { type: string; target_node?: string } = { type: btn.action }
          if (btn.target_node) payload.target_node = btn.target_node
          onAction?.(payload)
        }}
      >
        {btn.text}
      </PfButton>
    ))}
  </div>
)

const DefaultUnknownElement: ElementRenderer = ({ element }) => {
  if (typeof console !== 'undefined') {
    console.warn(`elementTypeRegistry: unknown element`, element)
  }
  return null  // silently skip rather than break the page
}

// ─── Registry ────────────────────────────────────────────────────────────────

class ElementTypeRegistry {
  private byType = new Map<string, ElementRenderer>()
  private byTag  = new Map<string, ElementRenderer>()

  registerType(type: string, renderer: ElementRenderer): void {
    this.byType.set(type, renderer)
  }
  registerTag(tag: string, renderer: ElementRenderer): void {
    this.byTag.set(tag, renderer)
  }

  resolve(el: LayoutElement): ElementRenderer {
    if (el.type && this.byType.has(el.type)) return this.byType.get(el.type)!
    if (el.tag && this.byTag.has(el.tag))    return this.byTag.get(el.tag)!
    return DefaultUnknownElement
  }

  listTypes(): string[] { return Array.from(this.byType.keys()) }
  listTags():  string[] { return Array.from(this.byTag.keys()) }
}

export const elementTypeRegistry = new ElementTypeRegistry()

// Register built-ins
elementTypeRegistry.registerType('icon',         IconElement)
elementTypeRegistry.registerType('paragraph',    ParagraphElement)
elementTypeRegistry.registerType('buttons_list', ButtonsListElement)
elementTypeRegistry.registerTag('h1', HeadingElement)
elementTypeRegistry.registerTag('h2', HeadingElement)
elementTypeRegistry.registerTag('h3', HeadingElement)
elementTypeRegistry.registerTag('p',  ParagraphElement)

/**
 * Renders any layout element by looking up the registry. Unknown elements
 * are silently skipped (with a console warning) so the server can evolve
 * ahead of the deployed SDK.
 */
export function PfElement_ByType({ element, onAction }: ElementRendererProps): ReactNode {
  const Renderer = elementTypeRegistry.resolve(element)
  return <Renderer element={element} onAction={onAction} />
}
