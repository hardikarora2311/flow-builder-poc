'use client'

/**
 * /components — interactive playground for the @platform/ui component library.
 *
 * Sections:
 *   1. Tokens     — colour swatches, type scale, spacing scale, radius scale
 *   2. Primitives — every Pf* component with variants
 *   3. Patterns   — composed patterns (KFS table, mandate card, etc.)
 *   4. Registries — fieldTypeRegistry + elementTypeRegistry demos
 *   5. Theming    — live theme editor that updates every preview in real time
 *
 * Every component preview includes:
 *   - Live render
 *   - Collapsible code snippet (copyable)
 *   - Props summary
 */

import { useState } from 'react'
import Link from 'next/link'
import {
  PfButton, PfInput, PfNumberInput, PfDatePicker, PfSelect, PfMultiSelect,
  PfTextarea, PfCheckbox, PfRadioGroup, PfOTPInput, PfFilePicker,
  PfIcon, PfCard, PfStack, PfBadge, PfSpinner, PfField,
  PfElement_ByType, PfField_ByType,
} from '@platform/ui'
import '@platform/ui/styles.css'

type Section = 'tokens' | 'primitives' | 'patterns' | 'registries' | 'theming'

interface ThemeOverrides {
  primary:    string
  background: string
  surface:    string
  text:       string
  border:     string
  radius:     string
  font:       string
}

const DEFAULT_THEME: ThemeOverrides = {
  primary:    '#2563EB',
  background: '#FFFFFF',
  surface:    '#F8FAFC',
  text:       '#111827',
  border:     '#E2E8F0',
  radius:     '8px',
  font:       'system-ui, -apple-system, sans-serif',
}

export default function ComponentsPlayground() {
  const [section, setSection] = useState<Section>('primitives')
  const [theme, setTheme] = useState<ThemeOverrides>(DEFAULT_THEME)

  // Live theme injection — applies to anything inside the [data-pf-theme] scope
  const themeStyle = {
    '--pf-color-primary':       theme.primary,
    '--pf-color-primary-hover': adjust(theme.primary, -15),
    '--pf-color-background':    theme.background,
    '--pf-color-surface':       theme.surface,
    '--pf-color-surface-2':     adjust(theme.surface, -3),
    '--pf-color-text':          theme.text,
    '--pf-color-border':        theme.border,
    '--pf-color-border-strong': adjust(theme.border, -15),
    '--pf-radius-button':       theme.radius,
    '--pf-radius-input':        theme.radius,
    '--pf-radius-card':         `calc(${theme.radius} * 1.5)`,
    '--pf-font-family':         theme.font,
  } as React.CSSProperties

  return (
    <div className="flex h-screen flex-col bg-slate-50">
      {/* Top bar */}
      <header className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-slate-400 hover:text-slate-700" aria-label="Back to dashboard">←</Link>
          <h1 className="text-base font-semibold text-slate-900">@platform/ui — Component Library</h1>
          <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-violet-700">v0.1.0</span>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-slate-500">
          <span>Pice LOS SDK</span>
          <span className="text-slate-300">·</span>
          <Link href="/builder/pice-los-journey" className="text-blue-600 hover:text-blue-700">Open builder →</Link>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar nav */}
        <nav className="w-[200px] shrink-0 border-r border-slate-200 bg-white p-3">
          <p className="mb-2 px-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">Library</p>
          {(['tokens', 'primitives', 'patterns', 'registries', 'theming'] as Section[]).map((s) => (
            <button
              key={s}
              onClick={() => setSection(s)}
              className={`mb-1 block w-full rounded-lg px-3 py-1.5 text-left text-sm font-medium transition ${
                section === s ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
          <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-3 text-[11px] text-slate-500 leading-relaxed">
            <p className="font-semibold text-slate-700 mb-1">How to use</p>
            <p>Every component below is themable live. Try the <strong>Theming</strong> tab to change the primary colour and see every preview update.</p>
          </div>
        </nav>

        {/* Theme editor — always visible up top of content area */}
        <main className="flex-1 overflow-y-auto">
          <ThemeEditor theme={theme} onChange={setTheme} onReset={() => setTheme(DEFAULT_THEME)} />

          {/* Scoped theme container — everything below inherits the theme tokens */}
          <div data-pf-theme style={themeStyle} className="p-8">
            {section === 'tokens'     && <TokensSection />}
            {section === 'primitives' && <PrimitivesSection />}
            {section === 'patterns'   && <PatternsSection />}
            {section === 'registries' && <RegistriesSection />}
            {section === 'theming'    && <ThemingSection />}
          </div>
        </main>
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────────────
// Theme editor
// ──────────────────────────────────────────────────────────────────────────────

function ThemeEditor({ theme, onChange, onReset }: {
  theme: ThemeOverrides; onChange: (t: ThemeOverrides) => void; onReset: () => void
}) {
  const set = (k: keyof ThemeOverrides, v: string) => onChange({ ...theme, [k]: v })
  return (
    <div className="sticky top-0 z-10 border-b border-slate-200 bg-white px-8 py-3">
      <div className="flex flex-wrap items-center gap-4">
        <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Live theme</span>
        <ColorPick label="Primary"    value={theme.primary}    onChange={(v) => set('primary', v)} />
        <ColorPick label="Background" value={theme.background} onChange={(v) => set('background', v)} />
        <ColorPick label="Surface"    value={theme.surface}    onChange={(v) => set('surface', v)} />
        <ColorPick label="Text"       value={theme.text}       onChange={(v) => set('text', v)} />
        <ColorPick label="Border"     value={theme.border}     onChange={(v) => set('border', v)} />
        <SelectPick
          label="Radius"
          value={theme.radius}
          options={[
            { value: '0px',  label: 'Sharp (0)' },
            { value: '4px',  label: 'Subtle (4)' },
            { value: '8px',  label: 'Medium (8)' },
            { value: '12px', label: 'Round (12)' },
            { value: '20px', label: 'Pill (20)' },
          ]}
          onChange={(v) => set('radius', v)}
        />
        <SelectPick
          label="Font"
          value={theme.font}
          options={[
            { value: 'system-ui, -apple-system, sans-serif', label: 'System UI' },
            { value: 'Inter, sans-serif',                    label: 'Inter' },
            { value: 'Georgia, serif',                       label: 'Georgia' },
            { value: 'ui-monospace, monospace',              label: 'Monospace' },
          ]}
          onChange={(v) => set('font', v)}
        />
        <button
          onClick={onReset}
          className="ml-auto rounded-md border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
        >
          Reset
        </button>
      </div>
    </div>
  )
}

function ColorPick({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex items-center gap-2 text-xs text-slate-600">
      <span className="font-medium">{label}</span>
      <input
        type="color" value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-6 w-6 cursor-pointer rounded border border-slate-200"
      />
      <span className="font-mono text-[10px] text-slate-400">{value}</span>
    </label>
  )
}

function SelectPick({ label, value, options, onChange }: {
  label: string; value: string; options: { value: string; label: string }[]; onChange: (v: string) => void
}) {
  return (
    <label className="flex items-center gap-2 text-xs text-slate-600">
      <span className="font-medium">{label}</span>
      <select
        value={value} onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs"
      >
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  )
}

// ──────────────────────────────────────────────────────────────────────────────
// Section: Tokens
// ──────────────────────────────────────────────────────────────────────────────

function TokensSection() {
  return (
    <>
      <SectionHeader title="Design tokens" desc="The visual primitives that every component reads from. Lenders override these to rebrand the entire SDK." />
      <Sample title="Colors" code={`// All colors are CSS custom properties
var(--pf-color-primary)
var(--pf-color-background)
var(--pf-color-surface)
var(--pf-color-text)
var(--pf-color-error)
var(--pf-color-success)`}>
        <div className="grid grid-cols-4 gap-3">
          {[
            ['Primary',        'var(--pf-color-primary)',        'var(--pf-color-primary-text)'],
            ['Primary hover',  'var(--pf-color-primary-hover)',  'var(--pf-color-primary-text)'],
            ['Background',     'var(--pf-color-background)',     'var(--pf-color-text)'],
            ['Surface',        'var(--pf-color-surface)',        'var(--pf-color-text)'],
            ['Surface 2',      'var(--pf-color-surface-2)',      'var(--pf-color-text)'],
            ['Text',           'var(--pf-color-text)',           'var(--pf-color-background)'],
            ['Text muted',     'var(--pf-color-text-muted)',     'var(--pf-color-background)'],
            ['Border',         'var(--pf-color-border)',         'var(--pf-color-text)'],
            ['Success',        'var(--pf-color-success)',        '#fff'],
            ['Warning',        'var(--pf-color-warning)',        '#fff'],
            ['Error',          'var(--pf-color-error)',          '#fff'],
            ['Info',           'var(--pf-color-info)',           '#fff'],
          ].map(([label, bg, fg]) => (
            <div key={label} className="overflow-hidden rounded-lg border border-slate-200">
              <div style={{ background: bg, color: fg, padding: '20px 12px', fontSize: 11 }}>
                <p style={{ fontWeight: 600 }}>{label}</p>
              </div>
              <div className="bg-white px-3 py-2">
                <code className="text-[10px] font-mono text-slate-500">{bg}</code>
              </div>
            </div>
          ))}
        </div>
      </Sample>

      <Sample title="Typography scale" code={`var(--pf-font-size-xs)       // 11px
var(--pf-font-size-sm)       // 13px
var(--pf-font-size-base)     // 15px
var(--pf-font-size-lg)       // 18px
var(--pf-font-size-xl)       // 22px
var(--pf-font-size-display)  // 28px`}>
        <div className="space-y-3">
          {[
            ['Display', 'var(--pf-font-size-display)'],
            ['XL',      'var(--pf-font-size-xl)'],
            ['LG',      'var(--pf-font-size-lg)'],
            ['Base',    'var(--pf-font-size-base)'],
            ['SM',      'var(--pf-font-size-sm)'],
            ['XS',      'var(--pf-font-size-xs)'],
          ].map(([label, size]) => (
            <div key={label} className="flex items-baseline gap-4">
              <span className="w-16 text-[10px] font-mono text-slate-400">{label}</span>
              <span style={{ fontSize: size, fontFamily: 'var(--pf-font-family)', color: 'var(--pf-color-text)' }}>
                The quick brown fox
              </span>
            </div>
          ))}
        </div>
      </Sample>

      <Sample title="Spacing & radius" code={`var(--pf-space-xs)  // 4px
var(--pf-space-sm)  // 8px
var(--pf-space-md)  // 12px
var(--pf-space-lg)  // 16px
var(--pf-space-xl)  // 24px
var(--pf-space-2xl) // 32px`}>
        <div className="space-y-2">
          {['xs','sm','md','lg','xl','2xl'].map((s) => (
            <div key={s} className="flex items-center gap-3">
              <span className="w-12 text-[10px] font-mono text-slate-400">{s}</span>
              <div style={{ width: `var(--pf-space-${s})`, height: 16, background: 'var(--pf-color-primary)' }} />
            </div>
          ))}
        </div>
        <div className="mt-6 flex items-center gap-4">
          {['xs','sm','md','lg','xl','full'].map((r) => (
            <div key={r} className="text-center">
              <div style={{
                width: 56, height: 56,
                background: 'var(--pf-color-primary)',
                borderRadius: `var(--pf-radius-${r})`,
              }} />
              <p className="mt-1 text-[10px] font-mono text-slate-400">{r}</p>
            </div>
          ))}
        </div>
      </Sample>
    </>
  )
}

// ──────────────────────────────────────────────────────────────────────────────
// Section: Primitives
// ──────────────────────────────────────────────────────────────────────────────

function PrimitivesSection() {
  return (
    <>
      <SectionHeader title="Primitives" desc="Building blocks. Every one accepts a className passthrough so admin-supplied utility classes from the Layout node JSON work alongside the built-in styles." />

      <Sample title="PfButton" code={`<PfButton variant="primary">Continue</PfButton>
<PfButton variant="secondary">Cancel</PfButton>
<PfButton variant="ghost">Skip</PfButton>
<PfButton variant="danger">Delete</PfButton>
<PfButton loading>Processing</PfButton>
<PfButton leftIcon={<PfIcon name="arrow-right" size={16} />}>With icon</PfButton>`}>
        <PfStack direction="row" gap="md" align="center">
          <PfButton variant="primary"   inline>Primary</PfButton>
          <PfButton variant="secondary" inline>Secondary</PfButton>
          <PfButton variant="ghost"     inline>Ghost</PfButton>
          <PfButton variant="danger"    inline>Danger</PfButton>
          <PfButton variant="primary"   inline loading>Loading</PfButton>
          <PfButton variant="primary"   inline disabled>Disabled</PfButton>
        </PfStack>
        <PfStack direction="row" gap="md" align="center" className="mt-4">
          <PfButton variant="primary" size="sm" inline>Small</PfButton>
          <PfButton variant="primary" size="md" inline>Medium</PfButton>
          <PfButton variant="primary" size="lg" inline>Large</PfButton>
        </PfStack>
      </Sample>

      <Sample title="PfInput · PfNumberInput · PfDatePicker" code={`<PfField label="Email" htmlFor="email" required>
  <PfInput id="email" type="email" placeholder="you@company.com" />
</PfField>`}>
        <div className="grid grid-cols-3 gap-4">
          <PfField label="Email" htmlFor="ex-email" required>
            <PfInput id="ex-email" type="email" placeholder="you@company.com" />
          </PfField>
          <PfField label="Loan amount" htmlFor="ex-amt" help="Min ₹50,000 · Max ₹50 Lakh">
            <PfNumberInput id="ex-amt" placeholder="500000" />
          </PfField>
          <PfField label="Date of birth" htmlFor="ex-dob">
            <PfDatePicker id="ex-dob" />
          </PfField>
          <PfField label="With error" htmlFor="ex-err" error="Invalid PAN format">
            <PfInput id="ex-err" defaultValue="ABCD123" error />
          </PfField>
          <PfField label="Disabled" htmlFor="ex-dis">
            <PfInput id="ex-dis" defaultValue="locked" disabled />
          </PfField>
        </div>
      </Sample>

      <Sample title="PfSelect · PfMultiSelect" code={`<PfSelect
  options={[
    { value: 'pl', label: 'Personal Loan' },
    { value: 'bl', label: 'Business Loan' },
  ]}
  placeholder="Select…"
/>`}>
        <div className="grid grid-cols-2 gap-4">
          <PfField label="Loan type" htmlFor="ex-sel">
            <PfSelect
              id="ex-sel" placeholder="Select…"
              options={[
                { value: 'pl', label: 'Personal Loan' },
                { value: 'bl', label: 'Business Loan' },
                { value: 'el', label: 'Education Loan' },
              ]}
            />
          </PfField>
          <PfField label="Required documents">
            <PfMultiSelectDemo />
          </PfField>
        </div>
      </Sample>

      <Sample title="PfTextarea" code={`<PfTextarea placeholder="Add notes…" rows={4} />`}>
        <PfField label="Address" htmlFor="ex-ta">
          <PfTextarea id="ex-ta" placeholder="House no, street, locality, city, pincode" rows={3} />
        </PfField>
      </Sample>

      <Sample title="PfCheckbox · PfRadioGroup" code={`<PfCheckbox label="I accept the terms" required />

<PfRadioGroup
  name="employment"
  options={[
    { value: 'salaried',      label: 'Salaried' },
    { value: 'self_employed', label: 'Self-employed' },
  ]}
/>`}>
        <PfStack gap="lg">
          <PfCheckboxDemo />
          <PfRadioDemo />
        </PfStack>
      </Sample>

      <Sample title="PfOTPInput" code={`<PfOTPInput length={6} onComplete={(otp) => verify(otp)} />`}>
        <PfOTPInput length={6} />
      </Sample>

      <Sample title="PfFilePicker" code={`<PfFilePicker accept="image/*,.pdf" multiple label="Upload bank statement" />`}>
        <PfFilePicker accept="image/*,.pdf" multiple label="Upload bank statement" />
      </Sample>

      <Sample title="PfIcon · PfBadge · PfSpinner" code={`<PfIcon name="circle-check" size={24} color="var(--pf-color-success)" />
<PfBadge variant="success">VERIFIED</PfBadge>
<PfSpinner size="md" />`}>
        <PfStack direction="row" gap="lg" align="center">
          <PfStack direction="row" gap="sm" align="center">
            <PfIcon name="circle-check" size={28} color="var(--pf-color-success)" />
            <PfIcon name="circle-alert" size={28} color="var(--pf-color-warning)" />
            <PfIcon name="circle-x"     size={28} color="var(--pf-color-error)" />
            <PfIcon name="circle-help"  size={28} color="var(--pf-color-text-muted)" />
            <PfIcon name="loader"       size={28} animated color="var(--pf-color-primary)" />
          </PfStack>
          <span className="text-slate-300">·</span>
          <PfStack direction="row" gap="sm" align="center">
            <PfBadge>default</PfBadge>
            <PfBadge variant="primary">primary</PfBadge>
            <PfBadge variant="success">success</PfBadge>
            <PfBadge variant="warning">warning</PfBadge>
            <PfBadge variant="error">error</PfBadge>
          </PfStack>
          <span className="text-slate-300">·</span>
          <PfStack direction="row" gap="sm" align="center">
            <PfSpinner size="sm" />
            <PfSpinner size="md" />
            <PfSpinner size="lg" />
          </PfStack>
        </PfStack>
      </Sample>

      <Sample title="PfCard · PfStack" code={`<PfStack gap="md">
  <PfCard>Default card with border</PfCard>
  <PfCard variant="surface">Surface card</PfCard>
  <PfCard variant="flat">Flat card</PfCard>
</PfStack>`}>
        <PfStack gap="md">
          <PfCard>Default card — bordered, white background</PfCard>
          <PfCard variant="surface">Surface card — token surface background</PfCard>
          <PfCard variant="flat">Flat card — no border, surface background</PfCard>
        </PfStack>
      </Sample>
    </>
  )
}

function PfMultiSelectDemo() {
  const [v, setV] = useState<string[]>(['pan', 'bank'])
  return (
    <PfMultiSelect
      value={v}
      onChange={setV}
      options={[
        { value: 'pan',  label: 'PAN Card' },
        { value: 'aad',  label: 'Aadhaar' },
        { value: 'bank', label: 'Bank Statement' },
        { value: 'gst',  label: 'GST Certificate' },
        { value: 'itr',  label: 'ITR' },
      ]}
    />
  )
}

function PfCheckboxDemo() {
  const [c, setC] = useState(true)
  return (
    <PfCheckbox
      label="I have read and accept the Key Fact Statement"
      required
      checked={c}
      onChange={(e) => setC(e.target.checked)}
    />
  )
}

function PfRadioDemo() {
  const [v, setV] = useState('salaried')
  return (
    <PfField label="Employment type" required>
      <PfRadioGroup
        name="emp"
        value={v}
        onChange={setV}
        options={[
          { value: 'salaried',      label: 'Salaried' },
          { value: 'self_employed', label: 'Self-employed' },
          { value: 'business',      label: 'Business owner' },
        ]}
      />
    </PfField>
  )
}

// ──────────────────────────────────────────────────────────────────────────────
// Section: Patterns
// ──────────────────────────────────────────────────────────────────────────────

function PatternsSection() {
  return (
    <>
      <SectionHeader title="Patterns" desc="Composed components built from primitives. Lenders compose their own from the same primitives." />

      <Sample title="KFS Table — built from PfCard + PfStack" code={`<PfCard>
  <h3>Key Fact Statement</h3>
  {Object.entries(values).map(([k, v]) => (
    <PfStack direction="row" justify="between" key={k}>
      <span>{label(k)}</span>
      <strong>{v}</strong>
    </PfStack>
  ))}
</PfCard>`}>
        <PfCard className="max-w-md">
          <PfStack direction="row" align="center" gap="sm" className="mb-3" style={{
            padding: '8px 12px',
            background: 'var(--pf-color-info)',
            color: '#fff',
            margin: '-16px -16px 16px',
            borderRadius: 'var(--pf-radius-card) var(--pf-radius-card) 0 0',
          }}>
            <PfIcon name="file-text" size={14} color="#fff" />
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.05em' }}>KEY FACT STATEMENT</span>
            <span style={{ marginLeft: 'auto', fontSize: 10, opacity: 0.8 }}>As per RBI guidelines</span>
          </PfStack>
          {([
            ['Loan amount',     '₹1,00,000',  false],
            ['Tenure',          '24 months',   false],
            ['Monthly EMI',     '₹5,166 / mo', true],
            ['Interest rate',   '24% APR',     false],
            ['Processing fee',  '₹1,500',      false],
            ['Total repayable', '₹1,23,984',   true],
          ] as Array<[string, string, boolean]>).map(([label, value, highlight]) => (
            <PfStack key={label} direction="row" justify="between" align="center"
              style={{ padding: '8px 0', borderTop: '1px solid var(--pf-color-border)' }}>
              <span style={{ fontSize: 13, color: 'var(--pf-color-text-muted)' }}>{label}</span>
              <span style={{
                fontSize: highlight ? 14 : 13,
                fontWeight: highlight ? 700 : 600,
                color: highlight ? 'var(--pf-color-primary)' : 'var(--pf-color-text)',
              }}>{value}</span>
            </PfStack>
          ))}
        </PfCard>
      </Sample>

      <Sample title="Bank mandate card" code={`<PfCard>
  <PfIcon name="building" />
  <h3>HDFC Bank Portal</h3>
  <p>Authorise NACH mandate · ₹5,166/mo</p>
  <PfButton>Continue</PfButton>
</PfCard>`}>
        <PfCard className="max-w-md">
          <PfStack direction="row" align="center" gap="md" className="mb-3">
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: 'var(--pf-color-info-surface)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <PfIcon name="building" size={20} color="var(--pf-color-info)" />
            </div>
            <div>
              <p className="pf-text pf-text--bold">HDFC Bank Portal</p>
              <p className="pf-text pf-text--xs pf-text--muted">NACH Mandate Authorisation</p>
            </div>
            <PfBadge variant="success" style={{ marginLeft: 'auto' }}>SECURE</PfBadge>
          </PfStack>
          <PfStack gap="xs" className="mb-4" style={{ paddingTop: 12, borderTop: '1px solid var(--pf-color-border)' }}>
            {[['Amount', '₹5,166 / month'], ['Frequency', 'Monthly'], ['Account', 'HDFC **** 4521']].map(([k, v]) => (
              <PfStack key={k} direction="row" justify="between">
                <span className="pf-text pf-text--sm pf-text--muted">{k}</span>
                <span className="pf-text pf-text--sm pf-text--bold">{v}</span>
              </PfStack>
            ))}
          </PfStack>
          <PfButton>Proceed to bank portal</PfButton>
        </PfCard>
      </Sample>
    </>
  )
}

// ──────────────────────────────────────────────────────────────────────────────
// Section: Registries
// ──────────────────────────────────────────────────────────────────────────────

function RegistriesSection() {
  return (
    <>
      <SectionHeader
        title="Registries"
        desc="Per the design doc — server sends a field type string, SDK looks up the renderer. Unknown types render a fallback (no crash). Lenders can register custom types via fieldTypeRegistry.register(...)."
      />

      <Sample title="fieldTypeRegistry — same component renders any BE field type" code={`// Server sends:
{ id: "pan", type: "TEXT", label: "PAN Number", required: true }
{ id: "amt", type: "NUMBER", label: "Loan amount" }
{ id: "doc", type: "FILE_UPLOAD", label: "Bank statement" }

// SDK looks up the renderer:
<PfField_ByType type={f.type} {...f} onChange={...} />`}>
        <FieldRegistryDemo />
      </Sample>

      <Sample title="elementTypeRegistry — Layout node elements" code={`// Server sends:
{ elements: [
  { type: "icon", iconName: "circle-check", iconSize: "48", className: "text-green-500" },
  { tag: "h1", text: "Application Submitted", className: "text-2xl" },
  { type: "paragraph", text: "We'll be in touch within 2 business days.", className: "text-gray-600" },
  { type: "buttons_list", items: [
    { action: "navigate", target_node: "#home", text: "Done" }
  ]}
]}

// SDK iterates and renders via the registry:
{elements.map((el, i) =>
  <PfElement_ByType key={i} element={el} onAction={handle} />
)}`}>
        <PfStack gap="md" align="center" className="text-center max-w-md mx-auto">
          <PfElement_ByType element={{ type: 'icon', iconName: 'circle-check', iconSize: '48', className: '' }} />
          <PfElement_ByType element={{ tag: 'h1', text: 'Application Submitted', className: '' }} />
          <PfElement_ByType element={{ type: 'paragraph', text: "We'll be in touch within 2 business days.", className: '' }} />
          <PfElement_ByType
            element={{ type: 'buttons_list', items: [
              { action: 'navigate', target_node: '#home', text: 'Done', variant: 'primary' },
            ]}}
            onAction={(a) => alert(`Action: ${a.type} → ${a.target_node ?? ''}`)}
          />
        </PfStack>
      </Sample>

      <Sample title="Unknown type — graceful fallback" code={`// Server sends a future field type the SDK doesn't know:
{ id: "x", type: "FUTURE_BIOMETRIC_SCAN", label: "Iris scan" }

// SDK warns to console and renders a text input fallback.
// No crash. Old SDKs keep working when backend evolves.`}>
        <PfField label="Unknown type → text fallback" htmlFor="unknown">
          <PfField_ByType
            id="unknown"
            type="FUTURE_BIOMETRIC_SCAN"
            label="Iris scan"
            value=""
            onChange={() => {}}
          />
        </PfField>
        <p className="text-[11px] text-slate-400 mt-2">
          Check the browser console — fieldTypeRegistry logs a warning and renders the text fallback.
        </p>
      </Sample>
    </>
  )
}

function FieldRegistryDemo() {
  const [vals, setVals] = useState<Record<string, unknown>>({
    pan: '', amt: '', doc: '', emp: 'salaried',
  })
  const fields = [
    { id: 'pan', type: 'TEXT',        label: 'PAN Number',     required: true, placeholder: 'ABCDE1234F' },
    { id: 'amt', type: 'NUMBER',      label: 'Loan amount (₹)',required: true, placeholder: '500000' },
    { id: 'doc', type: 'FILE_UPLOAD', label: 'Bank statement', required: false, placeholder: '' },
    { id: 'emp', type: 'RADIO',       label: 'Employment',     required: true,
      options: [
        { value: 'salaried',      label: 'Salaried' },
        { value: 'self_employed', label: 'Self-employed' },
      ],
    },
  ]
  return (
    <PfStack gap="lg">
      {fields.map((f) => (
        <PfField key={f.id} label={f.label} htmlFor={f.id} required={f.required}>
          <PfField_ByType
            id={f.id}
            type={f.type}
            label={f.label}
            value={vals[f.id]}
            onChange={(v) => setVals((p) => ({ ...p, [f.id]: v }))}
            required={f.required}
            placeholder={f.placeholder}
            options={f.options}
          />
        </PfField>
      ))}
    </PfStack>
  )
}

// ──────────────────────────────────────────────────────────────────────────────
// Section: Theming guide
// ──────────────────────────────────────────────────────────────────────────────

function ThemingSection() {
  return (
    <>
      <SectionHeader title="Theming" desc="Three escape hatches in increasing levels of control. Use the live editor above to try them." />

      <Sample title="Level A — Theme tokens (95% of lenders)" code={`<FlowProvider
  theme={{
    colors: { primary: '#FF5733', background: '#FAFAFA' },
    typography: { fontFamily: 'Inter, sans-serif' },
    borderRadius: { button: '20px', input: '20px' },
  }}
  ...
>
  <FlowRenderer />
</FlowProvider>`}>
        <PfCard>
          <PfStack gap="md">
            <p className="pf-text">
              Lender passes a theme object to FlowProvider. The engine writes CSS custom properties
              onto a scoped container — every component below inherits them. No code changes anywhere.
            </p>
            <PfStack direction="row" gap="md">
              <PfButton variant="primary" inline>Themed primary</PfButton>
              <PfButton variant="secondary" inline>Themed secondary</PfButton>
            </PfStack>
          </PfStack>
        </PfCard>
      </Sample>

      <Sample title="Level B — Override individual screens (4% of lenders)" code={`// FlowConfig accepts a screens map keyed by step id:
<FlowProvider
  token={sessionToken}
  stepOverrides={{
    "#init":         MyInitForm,       // lender's custom intro
    "#selfie_check": MySelfieScreen,
  }}
>
  <FlowRenderer />
</FlowProvider>

// Unmapped steps automatically use the default renderer — no fallback config needed.`}>
        <PfCard variant="surface">
          <p className="pf-text">
            Map specific step IDs to lender components. The SDK falls back to defaults for everything
            you don&apos;t map. Use this when you have 2-3 hero screens that need bespoke design.
          </p>
        </PfCard>
      </Sample>

      <Sample title="Level C — Full custom via useFlow() (1% of lenders)" code={`function MyLoanFlow() {
  const { step, state, submit, back } = useFlow();

  if (state === 'processing') return <MySpinner />;
  if (state === 'redirect')   { window.location.href = step.redirect.link; return null; }

  if (step?.stepId === '#init' && step.type === 'form')
    return <MyInitForm fields={step.form.fields} actions={step.form.actions} submit={submit} />;

  // Fallback to default for steps you don't handle yet
  return <FlowRenderer />;
}`}>
        <PfCard variant="surface">
          <p className="pf-text">
            Read raw state from <code className="pf-text--mono">useFlow()</code> and render whatever you want.
            Use <code className="pf-text--mono">{'<FlowRenderer />'}</code> as a fallback so you can adopt incrementally.
          </p>
        </PfCard>
      </Sample>
    </>
  )
}

// ──────────────────────────────────────────────────────────────────────────────
// Section helpers
// ──────────────────────────────────────────────────────────────────────────────

function SectionHeader({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="mb-8">
      <h2 className="text-xl font-bold text-slate-900">{title}</h2>
      <p className="mt-1 text-sm text-slate-500 max-w-2xl leading-relaxed">{desc}</p>
    </div>
  )
}

function Sample({ title, code, children }: { title: string; code?: string; children: React.ReactNode }) {
  const [showCode, setShowCode] = useState(false)
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    if (!code) return
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1200)
    } catch { /* ignore */ }
  }

  return (
    <div className="mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
        <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
        {code && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCode((s) => !s)}
              className="rounded-md px-2 py-1 text-[11px] font-medium text-slate-500 hover:bg-slate-100"
            >
              {showCode ? 'Hide code' : 'Show code'}
            </button>
            <button
              onClick={copy}
              className="rounded-md border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-50"
            >
              {copied ? '✓ Copied' : 'Copy'}
            </button>
          </div>
        )}
      </div>
      <div className="p-6">{children}</div>
      {showCode && code && (
        <pre className="m-0 overflow-x-auto border-t border-slate-100 bg-slate-900 px-5 py-4 text-[12px] leading-relaxed text-slate-100">
          <code>{code}</code>
        </pre>
      )}
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────────────
// Color helpers
// ──────────────────────────────────────────────────────────────────────────────

/** Lighten/darken a hex color by `amount` (-100..100). */
function adjust(hex: string, amount: number): string {
  const h = hex.replace('#', '')
  if (h.length !== 6) return hex
  const r = Math.max(0, Math.min(255, parseInt(h.slice(0, 2), 16) + Math.round(amount * 2.55)))
  const g = Math.max(0, Math.min(255, parseInt(h.slice(2, 4), 16) + Math.round(amount * 2.55)))
  const b = Math.max(0, Math.min(255, parseInt(h.slice(4, 6), 16) + Math.round(amount * 2.55)))
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`
}
