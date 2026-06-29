'use client'

import { useState } from 'react'
import type { FieldDefinition, FieldType, WorkflowNodeData } from '@platform/core'
import { useBuilderStore } from '@/lib/store'
import { NODE_META } from '@/lib/constants'

const FIELD_TYPES: FieldType[] = ['text', 'phone', 'email', 'date', 'select', 'file', 'checkbox']

export function NodeInspector() {
  const selectedId = useBuilderStore((s) => s.selectedNodeId)
  const node = useBuilderStore((s) => s.nodes.find((n) => n.id === s.selectedNodeId) ?? null)
  const nodes = useBuilderStore((s) => s.nodes)
  const edges = useBuilderStore((s) => s.edges)
  const updateNodeData = useBuilderStore((s) => s.updateNodeData)
  const deleteNode = useBuilderStore((s) => s.deleteNode)
  const selectNode = useBuilderStore((s) => s.selectNode)
  const [tab, setTab] = useState<'config' | 'permissions' | 'edges'>('config')

  if (!node || !selectedId) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 px-8 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 text-2xl border border-slate-100">
          ✦
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-600">No node selected</p>
          <p className="mt-1 text-xs text-slate-400 leading-relaxed">Click a node on the canvas to inspect and configure it.</p>
        </div>
      </div>
    )
  }

  const data = node.data
  const meta = NODE_META[data.nodeType]
  const patch = (p: Partial<WorkflowNodeData>) => updateNodeData(selectedId, p)
  const outEdges = edges.filter((e) => e.source === selectedId)
  const nodeById = new Map(nodes.map((n) => [n.id, n]))

  return (
    <div className="flex h-full flex-col bg-white">
      {/* ── Header ── */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-slate-100">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg"
          style={{ background: `${meta.accent}18`, color: meta.accent }}
        >
          {meta.icon}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-bold text-slate-900 leading-snug">{data.label || meta.label}</p>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 mt-0.5">{meta.label}</p>
        </div>
        <button
          onClick={() => selectNode(null)}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 text-sm transition"
        >
          ✕
        </button>
      </div>

      {/* ── Tabs ── */}
      <div className="flex shrink-0 border-b border-slate-100 px-4">
        {(['config', 'permissions', 'edges'] as const).map((t) => {
          const label = t === 'edges' && outEdges.length > 0
            ? `Edges (${outEdges.length})`
            : t.charAt(0).toUpperCase() + t.slice(1)
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`mr-5 py-3 text-[13px] font-semibold transition border-b-2 -mb-px ${
                tab === t
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              {label}
            </button>
          )
        })}
      </div>

      {/* ── Tab content ── */}
      <div className="flex-1 overflow-y-auto">
        {tab === 'config' && (
          <ConfigTab data={data} selectedId={selectedId} patch={patch} />
        )}
        {tab === 'permissions' && (
          <div className="flex flex-col items-center justify-center h-40 gap-2 mt-8">
            <span className="text-3xl opacity-20">🔒</span>
            <p className="text-sm font-medium text-slate-500">Coming soon</p>
          </div>
        )}
        {tab === 'edges' && (
          <EdgesTab outEdges={outEdges} nodeById={nodeById} />
        )}
      </div>

      {/* ── Footer ── */}
      <div className="shrink-0 border-t border-slate-100 p-4">
        <button
          onClick={() => deleteNode(selectedId)}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-100 py-2.5 text-sm font-semibold text-red-500 transition hover:bg-red-50 hover:border-red-200"
        >
          <span className="text-base leading-none">🗑</span>
          Delete node
        </button>
      </div>
    </div>
  )
}

// ─── Config tab ───────────────────────────────────────────────────────────────
function ConfigTab({
  data, selectedId, patch,
}: {
  data: WorkflowNodeData
  selectedId: string
  patch: (p: Partial<WorkflowNodeData>) => void
}) {
  return (
    <div className="divide-y divide-slate-100">
      <Field label="Label">
        <Input value={data.label} onChange={(v) => patch({ label: v })} placeholder="Node label" />
      </Field>

      {(data.nodeType === 'web_form' || data.nodeType === 'form') && (
        <>
          <Field label="Step title">
            <Input value={data.stepTitle ?? ''} onChange={(v) => patch({ stepTitle: v })} placeholder="Shown above the form" />
          </Field>
          <Field label="Fields">
            <FieldsEditor fields={data.fields ?? []} onChange={(fields) => patch({ fields })} />
          </Field>
        </>
      )}

      {data.nodeType === 'otp' && (
        <>
          <Field label="Channel">
            <Select
              value={data.channel ?? 'sms'}
              options={[{ value: 'sms', label: 'SMS' }, { value: 'email', label: 'Email' }]}
              onChange={(v) => patch({ channel: v as 'sms' | 'email' })}
            />
          </Field>
          <Field label="Max attempts">
            <NumberInput value={data.maxAttempts ?? 3} min={1} max={10} onChange={(v) => patch({ maxAttempts: v })} />
          </Field>
        </>
      )}

      {(data.nodeType === 'api_request' || data.nodeType === 'api') && (
        <>
          <Field label="Method">
            <Select
              value={data.method ?? 'POST'}
              options={['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map((v) => ({ value: v, label: v }))}
              onChange={(v) => patch({ method: v as WorkflowNodeData['method'] })}
            />
          </Field>
          <Field label="Endpoint">
            <Input value={data.endpoint ?? ''} onChange={(v) => patch({ endpoint: v })} placeholder="https://api.example.com/path" mono />
          </Field>
          <Field label="Auth">
            <Select
              value={data.auth ?? 'none'}
              options={[{ value: 'none', label: 'None' }, { value: 'bearer', label: 'Bearer token' }, { value: 'apikey', label: 'API key' }]}
              onChange={(v) => patch({ auth: v as WorkflowNodeData['auth'] })}
            />
          </Field>
        </>
      )}

      {(data.nodeType === 'edge_operation' || data.nodeType === 'condition') && (
        <div className="px-4 py-6 text-center">
          <p className="text-sm font-medium text-slate-500">Pure routing node</p>
          <p className="text-xs text-slate-400 mt-1">No config required. Connect outgoing edges with conditions in the Edges tab.</p>
        </div>
      )}

      {(data.nodeType === 'policy_engine' || data.nodeType === 'policy') && (
        <>
          <Field label="Policy ID">
            <Input value={data.policyId ?? ''} onChange={(v) => patch({ policyId: v })} placeholder="e.g. POLICY-credit-eligibility" mono />
          </Field>
        </>
      )}

      {(data.nodeType === 'task' || data.nodeType === 'wait') && (
        <>
          <Field label="Assigned Role">
            <Select
              value={data.assignedRole ?? 'credit_officer'}
              options={[
                { value: 'credit_officer', label: 'Credit Officer' },
                { value: 'ops_team', label: 'Ops Team' },
                { value: 'compliance', label: 'Compliance' },
              ]}
              onChange={(v) => patch({ assignedRole: v })}
            />
          </Field>
          <Field label="SLA (hours)">
            <NumberInput value={data.dueHours ?? 24} min={1} max={720} onChange={(v) => patch({ dueHours: v })} />
          </Field>
        </>
      )}

      {(data.nodeType === 'flow_connector' || data.nodeType === 'connector') && (
        <>
          <Field label="Target Flow ID">
            <Input value={data.flowId ?? ''} onChange={(v) => patch({ flowId: v })} placeholder="e.g. flow_kyc_verification" mono />
          </Field>
          <Field label="Input Map">
            <Input value={data.inputMap ?? ''} onChange={(v) => patch({ inputMap: v })} placeholder="STORE.contact → child.PARAMS.mobile" mono />
          </Field>
          <Field label="Output Map">
            <Input value={data.outputMap ?? ''} onChange={(v) => patch({ outputMap: v })} placeholder="child.STORE.result → STORE.kyc_result" mono />
          </Field>
        </>
      )}

      {data.nodeType === 'layout' && (
        <div className="px-4 py-6 text-center">
          <p className="text-sm font-medium text-slate-500">Page Layout</p>
          <p className="text-xs text-slate-400 mt-1 leading-relaxed">Configure elements (icon, heading, paragraph, buttons) via Nerd Mode toolbar.</p>
        </div>
      )}

      {data.nodeType === 'webhook' && (
        <>
          <Field label="Webhook URL">
            <Input value={data.webhookUrl ?? ''} onChange={(v) => patch({ webhookUrl: v })} placeholder="https://example.com/webhook" mono />
          </Field>
          <Field label="Secret">
            <Input value={data.webhookSecret ?? ''} onChange={(v) => patch({ webhookSecret: v })} placeholder="Optional signing secret" />
          </Field>
        </>
      )}

      <Field label="Node ID">
        <code className="block w-full rounded-xl border border-slate-100 bg-slate-50 px-3.5 py-2.5 text-[12px] font-mono text-slate-500 select-all">
          {selectedId}
        </code>
      </Field>
    </div>
  )
}

// ─── Edges tab ────────────────────────────────────────────────────────────────
function EdgesTab({
  outEdges, nodeById,
}: {
  outEdges: { id: string; target: string; sourceHandle?: string | null; label?: string | React.ReactNode }[]
  nodeById: Map<string, { data: WorkflowNodeData }>
}) {
  if (outEdges.length === 0) {
    return (
      <div className="flex h-40 flex-col items-center justify-center gap-2 opacity-40">
        <span className="text-2xl">→</span>
        <p className="text-xs text-slate-500">No outgoing edges</p>
      </div>
    )
  }
  return (
    <div className="p-4 space-y-2">
      {outEdges.map((e) => {
        const target = nodeById.get(e.target)
        const targetMeta = target ? NODE_META[target.data.nodeType] : null
        return (
          <div key={e.id} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
            <div className="flex items-center gap-2.5">
              <div className="flex flex-col items-center gap-1">
                {e.sourceHandle && (
                  <span className={`h-2 w-2 rounded-full ${e.sourceHandle === 'true' ? 'bg-green-500' : 'bg-red-400'}`} />
                )}
                <span className="text-xs text-slate-300">→</span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  {targetMeta && (
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center text-[11px]" style={{ color: targetMeta.accent }}>
                      {targetMeta.icon}
                    </span>
                  )}
                  <span className="truncate text-[13px] font-semibold text-slate-700">{target?.data.label ?? e.target}</span>
                </div>
                {e.sourceHandle && (
                  <span className={`mt-1 inline-block rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
                    e.sourceHandle === 'true' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                  }`}>
                    {e.sourceHandle}
                  </span>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Fields editor ────────────────────────────────────────────────────────────
function FieldsEditor({ fields, onChange }: { fields: FieldDefinition[]; onChange: (f: FieldDefinition[]) => void }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const toggle = (id: string) => setExpanded((prev) => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })
  const update = (i: number, p: Partial<FieldDefinition>) => onChange(fields.map((f, idx) => idx === i ? { ...f, ...p } : f))
  const add = () => {
    const id = `field_${fields.length + 1}_${Math.random().toString(36).slice(2, 5)}`
    onChange([...fields, { id, type: 'text', label: 'New field', required: false, validation: [] }])
    setExpanded((prev) => new Set(prev).add(id))
  }
  const remove = (i: number) => {
    const id = fields[i].id
    onChange(fields.filter((_, idx) => idx !== i))
    setExpanded((prev) => { const next = new Set(prev); next.delete(id); return next })
  }

  return (
    <div className="space-y-1.5">
      {fields.map((f, i) => (
        <div key={f.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="flex cursor-pointer items-center gap-2 px-3 py-2.5 hover:bg-slate-50 transition" onClick={() => toggle(f.id)}>
            <span className="text-slate-300 text-xs">☰</span>
            <span className="flex-1 truncate text-[13px] font-medium text-slate-700">{f.label}</span>
            <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-mono text-slate-500">{f.type}</span>
            {f.required && <span className="rounded-md bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-600">req</span>}
            <span className="text-slate-400 text-[10px]">{expanded.has(f.id) ? '▴' : '▾'}</span>
          </div>
          {expanded.has(f.id) && (
            <div className="border-t border-slate-100 bg-slate-50/60 p-3 space-y-2.5">
              <div>
                <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-widest text-slate-400">Label</label>
                <input value={f.label} onChange={(e) => update(i, { label: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[13px] outline-none focus:border-blue-400 transition" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-widest text-slate-400">Type</label>
                  <select value={f.type} onChange={(e) => update(i, { type: e.target.value as FieldType })}
                    className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-[12px] outline-none focus:border-blue-400">
                    {FIELD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-widest text-slate-400">Required</label>
                  <button
                    onClick={() => update(i, { required: !f.required, validation: !f.required ? [{ type: 'required', message: `${f.label} is required` }] : [] })}
                    className={`mt-0.5 flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-[12px] font-medium transition ${
                      f.required ? 'border-blue-200 bg-blue-50 text-blue-600' : 'border-slate-200 bg-white text-slate-500'
                    }`}
                  >
                    <span className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${f.required ? 'bg-blue-500' : 'bg-slate-300'}`} />
                    {f.required ? 'Yes' : 'No'}
                  </button>
                </div>
              </div>
              <button onClick={() => remove(i)} className="text-[11px] font-semibold text-red-400 hover:text-red-500 transition">
                Remove field
              </button>
            </div>
          )}
        </div>
      ))}
      <button
        onClick={add}
        className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-200 py-2.5 text-[12px] font-semibold text-slate-400 transition hover:border-blue-300 hover:text-blue-500 hover:bg-blue-50"
      >
        + Add field
      </button>
    </div>
  )
}

// ─── Primitives ───────────────────────────────────────────────────────────────
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="px-4 py-4 space-y-2">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">{label}</p>
      {children}
    </div>
  )
}

function Input({ value, onChange, placeholder, mono }: { value: string; onChange: (v: string) => void; placeholder?: string; mono?: boolean }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-[14px] text-slate-800 outline-none placeholder:text-slate-300 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/10 transition ${mono ? 'font-mono text-[12px]' : ''}`}
    />
  )
}

function NumberInput({ value, onChange, min, max }: { value: number; onChange: (v: number) => void; min?: number; max?: number }) {
  return (
    <input type="number" value={value} min={min} max={max}
      onChange={(e) => onChange(parseInt(e.target.value, 10) || 0)}
      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-[14px] text-slate-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/10 transition"
    />
  )
}

function Select({ value, options, onChange }: { value: string; options: { value: string; label: string }[]; onChange: (v: string) => void }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-[14px] text-slate-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/10 transition"
    >
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )
}
