'use client'

import type { ThemeConfig } from '@platform/core'
import { useBuilderStore } from '@/lib/store'

const COLOR_KEYS: Array<{ key: keyof ThemeConfig['colors']; label: string }> = [
  { key: 'primary', label: 'Primary' },
  { key: 'secondary', label: 'Secondary' },
  { key: 'background', label: 'Background' },
  { key: 'surface', label: 'Surface' },
  { key: 'text', label: 'Text' },
  { key: 'textMuted', label: 'Muted text' },
  { key: 'error', label: 'Error' },
  { key: 'success', label: 'Success' },
]

export function ThemeEditor() {
  const theme = useBuilderStore((s) => s.theme)
  const patchTheme = useBuilderStore((s) => s.patchTheme)

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="border-b border-slate-200 px-5 py-3">
        <span className="text-sm font-semibold text-slate-700">Brand theme</span>
        <p className="mt-0.5 text-[11px] text-slate-400">Changes apply live in the preview</p>
      </div>

      <div className="space-y-6 p-5">
        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Colors
          </h3>
          <div className="space-y-2">
            {COLOR_KEYS.map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between gap-2">
                <span className="text-sm text-slate-600">{label}</span>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={theme.colors[key]}
                    onChange={(e) => patchTheme({ colors: { [key]: e.target.value } })}
                    className="h-7 w-7 cursor-pointer rounded border border-slate-200 bg-white p-0.5"
                  />
                  <input
                    value={theme.colors[key]}
                    onChange={(e) => patchTheme({ colors: { [key]: e.target.value } })}
                    className="w-20 rounded border border-slate-200 px-2 py-1 text-xs uppercase outline-none focus:border-blue-400"
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Typography
          </h3>
          <Row label="Font family">
            <input
              value={theme.typography.fontFamily}
              onChange={(e) => patchTheme({ typography: { fontFamily: e.target.value } })}
              className="w-40 rounded border border-slate-200 px-2 py-1 text-xs outline-none focus:border-blue-400"
            />
          </Row>
          <Row label="Base size">
            <input
              value={theme.typography.baseFontSize}
              onChange={(e) => patchTheme({ typography: { baseFontSize: e.target.value } })}
              className="w-20 rounded border border-slate-200 px-2 py-1 text-xs outline-none focus:border-blue-400"
            />
          </Row>
          <Row label="Heading weight">
            <select
              value={theme.typography.headingWeight}
              onChange={(e) =>
                patchTheme({
                  typography: { headingWeight: e.target.value as ThemeConfig['typography']['headingWeight'] },
                })
              }
              className="rounded border border-slate-200 px-2 py-1 text-xs outline-none focus:border-blue-400"
            >
              <option value="500">500</option>
              <option value="600">600</option>
              <option value="700">700</option>
            </select>
          </Row>
        </section>

        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Radius
          </h3>
          <Row label="Button">
            <RadiusInput
              value={theme.borderRadius.button}
              onChange={(v) => patchTheme({ borderRadius: { button: v } })}
            />
          </Row>
          <Row label="Input">
            <RadiusInput
              value={theme.borderRadius.input}
              onChange={(v) => patchTheme({ borderRadius: { input: v } })}
            />
          </Row>
          <Row label="Card">
            <RadiusInput
              value={theme.borderRadius.card}
              onChange={(v) => patchTheme({ borderRadius: { card: v } })}
            />
          </Row>
        </section>

        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Spacing
          </h3>
          <Row label="Max width">
            <RadiusInput
              value={theme.spacing.containerMaxWidth}
              onChange={(v) => patchTheme({ spacing: { containerMaxWidth: v } })}
            />
          </Row>
          <Row label="Padding">
            <RadiusInput
              value={theme.spacing.containerPadding}
              onChange={(v) => patchTheme({ spacing: { containerPadding: v } })}
            />
          </Row>
          <Row label="Field gap">
            <RadiusInput
              value={theme.spacing.fieldGap}
              onChange={(v) => patchTheme({ spacing: { fieldGap: v } })}
            />
          </Row>
        </section>
      </div>
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-2 flex items-center justify-between">
      <span className="text-sm text-slate-600">{label}</span>
      {children}
    </div>
  )
}

function RadiusInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-20 rounded border border-slate-200 px-2 py-1 text-xs outline-none focus:border-blue-400"
    />
  )
}
