/**
 * fieldTypeRegistry — maps BE field type strings to React components.
 *
 * Per the Pice LOS Architecture doc (§7.5):
 *   "Adding a new SDK step type means calling sdkStepRegistry.register() with
 *   the state transition and DefaultRenderer. Old SDK versions fall back
 *   gracefully."
 *
 * This is the registry for FIELD types inside Web Form steps. Backend sends
 * `type: "TEXT" | "DROPDOWN" | "DATE" | "FILE_UPLOAD" | "OTP" | "NUMBER"
 *      | "SIGNATURE" | "RADIO" | "MULTI_SELECT" | "HIDDEN"`
 * and the SDK looks up the matching renderer here.
 *
 * Unknown types render the DefaultUnknownField (visible warning, no crash) so
 * server can evolve ahead of deployed SDK versions.
 */

import type { ComponentType, ReactNode } from 'react'
import {
  PfInput, PfNumberInput, PfDatePicker, PfSelect, PfMultiSelect,
  PfOTPInput, PfFilePicker, PfRadioGroup, PfCheckbox,
  type PfSelectOption, type PfRadioOption,
} from '../primitives'

// ─── Field renderer contract ──────────────────────────────────────────────────

export interface FieldRendererProps {
  id:           string
  label:        string
  value:        unknown
  onChange:     (next: unknown) => void
  required?:    boolean
  disabled?:    boolean
  placeholder?: string
  error?:       string
  /** Options for dropdowns / radios / multi-selects. */
  options?:     PfSelectOption[]
  /** Free-form pattern, min, max, etc — opaque to the renderer. */
  validations?: Array<{ type: string; pattern?: string; value?: string | number }>
  /** Anything else the backend may add. */
  extras?:      Record<string, unknown>
}

export type FieldRenderer = ComponentType<FieldRendererProps>

// ─── Built-in renderers ───────────────────────────────────────────────────────

const TextField: FieldRenderer = ({ id, value, onChange, required, disabled, placeholder, error }) => (
  <PfInput
    id={id} type="text"
    value={String(value ?? '')}
    onChange={(e) => onChange(e.target.value)}
    required={required} disabled={disabled}
    placeholder={placeholder} error={!!error}
  />
)

const EmailField: FieldRenderer = (props) => <TextField {...props} />  // delegated; only the input type differs cosmetically

const PhoneField: FieldRenderer = ({ id, value, onChange, required, disabled, placeholder, error }) => (
  <PfInput
    id={id} type="tel" inputMode="tel"
    value={String(value ?? '')}
    onChange={(e) => onChange(e.target.value)}
    required={required} disabled={disabled}
    placeholder={placeholder} error={!!error}
  />
)

const NumberField: FieldRenderer = ({ id, value, onChange, required, disabled, placeholder, error }) => (
  <PfNumberInput
    id={id}
    value={value as number | string | undefined}
    onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
    required={required} disabled={disabled}
    placeholder={placeholder} error={!!error}
  />
)

const DateField: FieldRenderer = ({ id, value, onChange, required, disabled, error }) => (
  <PfDatePicker
    id={id}
    value={String(value ?? '')}
    onChange={(e) => onChange(e.target.value)}
    required={required} disabled={disabled}
    error={!!error}
  />
)

const DropdownField: FieldRenderer = ({ id, value, onChange, required, disabled, placeholder, error, options }) => (
  <PfSelect
    id={id}
    value={String(value ?? '')}
    onChange={(e) => onChange(e.target.value)}
    required={required} disabled={disabled}
    placeholder={placeholder ?? 'Select…'}
    error={!!error}
    options={options}
  />
)

const RadioField: FieldRenderer = ({ id, value, onChange, disabled, error, options }) => {
  const radioOpts: PfRadioOption[] = (options ?? []).map((o) => ({ value: o.value, label: o.label, disabled }))
  return (
    <PfRadioGroup
      name={id}
      value={String(value ?? '')}
      onChange={(v) => onChange(v)}
      options={radioOpts}
      error={!!error}
    />
  )
}

const MultiSelectField: FieldRenderer = ({ id: _id, value, onChange, disabled, error, options }) => (
  <PfMultiSelect
    options={options ?? []}
    value={Array.isArray(value) ? (value as string[]) : []}
    onChange={(v) => onChange(v)}
    disabled={disabled}
    error={!!error}
  />
)

const CheckboxField: FieldRenderer = ({ id, label, value, onChange, required, disabled, error }) => (
  <PfCheckbox
    id={id}
    checked={value === true || value === 'true'}
    onChange={(e) => onChange(e.target.checked)}
    required={required} disabled={disabled}
    error={!!error}
    label={label}
  />
)

const OTPField: FieldRenderer = ({ value, onChange, disabled, error }) => (
  <PfOTPInput
    value={String(value ?? '')}
    onChange={(v) => onChange(v)}
    disabled={disabled}
    error={!!error}
  />
)

const FileField: FieldRenderer = ({ onChange, disabled, error, extras }) => (
  <PfFilePicker
    accept={(extras?.accept as string) ?? undefined}
    multiple={(extras?.multiple as boolean) ?? false}
    onChange={(files) => onChange(files)}
    disabled={disabled}
    error={!!error}
  />
)

const HiddenField: FieldRenderer = () => null

// ─── Default unknown field — graceful fallback per design doc §3 ──────────────

const DefaultUnknownField: FieldRenderer = ({ id, label, value, onChange }) => {
  if (typeof console !== 'undefined') {
    console.warn(`fieldTypeRegistry: unknown field type for "${id}". Rendering fallback text input.`)
  }
  return (
    <TextField
      id={id}
      label={label}
      value={value}
      onChange={onChange}
      placeholder="(unknown field type — text fallback)"
    />
  )
}

// ─── Registry ─────────────────────────────────────────────────────────────────

class FieldTypeRegistry {
  private renderers = new Map<string, FieldRenderer>()

  register(type: string, renderer: FieldRenderer): void {
    this.renderers.set(type.toUpperCase(), renderer)
  }

  unregister(type: string): void {
    this.renderers.delete(type.toUpperCase())
  }

  get(type: string): FieldRenderer {
    return this.renderers.get(type.toUpperCase()) ?? DefaultUnknownField
  }

  has(type: string): boolean {
    return this.renderers.has(type.toUpperCase())
  }

  list(): string[] {
    return Array.from(this.renderers.keys())
  }
}

export const fieldTypeRegistry = new FieldTypeRegistry()

// Register built-ins. Lender (or new SDK release) can call .register() to add more.
fieldTypeRegistry.register('TEXT',         TextField)
fieldTypeRegistry.register('EMAIL',        EmailField)
fieldTypeRegistry.register('PHONE',        PhoneField)
fieldTypeRegistry.register('NUMBER',       NumberField)
fieldTypeRegistry.register('DATE',         DateField)
fieldTypeRegistry.register('DROPDOWN',     DropdownField)
fieldTypeRegistry.register('SELECT',       DropdownField)  // alias
fieldTypeRegistry.register('RADIO',        RadioField)
fieldTypeRegistry.register('MULTI_SELECT', MultiSelectField)
fieldTypeRegistry.register('CHECKBOX',     CheckboxField)
fieldTypeRegistry.register('OTP',          OTPField)
fieldTypeRegistry.register('FILE_UPLOAD',  FileField)
fieldTypeRegistry.register('FILE',         FileField)      // alias
fieldTypeRegistry.register('HIDDEN',       HiddenField)

/**
 * Renders any field by its type. Looks up the renderer in the registry;
 * unknown types render the DefaultUnknownField fallback (no crash).
 */
export function PfField_ByType(props: FieldRendererProps & { type: string }): ReactNode {
  const Renderer = fieldTypeRegistry.get(props.type)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { type, ...rest } = props
  return <Renderer {...rest} />
}
