'use client'

import { useMemo, useRef, useState } from 'react'
import type { FieldDefinition, FieldType, SelectOption, ValidationRule, WorkflowNodeData } from '@platform/core'
import { useBuilderStore } from '@/lib/store'
import { NODE_META } from '@/lib/constants'
import { getAvailableVariables, type VariableGroup } from '@/lib/flow-compiler'
import type { CompileNode, CompileEdge } from '@/lib/flow-compiler'

const FIELD_TYPES: FieldType[] = ['text', 'phone', 'email', 'date', 'select', 'file', 'checkbox']

// ─── Layout node API variable tokens ─────────────────────────────────────────
const LAYOUT_TOKENS = [
  { token: '{{loanAmount}}',   hint: 'currentResponse.loanAmount — approved credit limit' },
  { token: '{{roi}}',          hint: 'currentResponse.roi — interest rate (% per month)' },
  { token: '{{tenure}}',       hint: 'Loan tenure in months' },
  { token: '{{processingFee}}',hint: 'Processing fee amount' },
  { token: '{{uniqueId}}',     hint: 'currentResponse.uniqueId — DigiLocker token' },
  { token: '{{requestId}}',    hint: 'currentResponse.requestId — DigiLocker request ID' },
  { token: '{{nachUrl}}',      hint: 'currentResponse.nachUrl — bank portal redirect URL' },
  { token: '{{url}}',          hint: 'nextResponse.url — sanction letter PDF URL' },
]

export function NodeInspector() {
  const selectedId = useBuilderStore((s) => s.selectedNodeId)
  const node = useBuilderStore((s) => s.nodes.find((n) => n.id === s.selectedNodeId) ?? null)
  const nodes = useBuilderStore((s) => s.nodes)
  const edges = useBuilderStore((s) => s.edges)
  const updateNodeData = useBuilderStore((s) => s.updateNodeData)
  const deleteNode = useBuilderStore((s) => s.deleteNode)
  const selectNode = useBuilderStore((s) => s.selectNode)
  const [tab, setTab] = useState<'config' | 'permissions' | 'edges'>('config')

  // useMemo must be called unconditionally — before any early return
  const availableVars = useMemo(
    () => selectedId ? getAvailableVariables(nodes as CompileNode[], edges as CompileEdge[], selectedId) : [],
    [nodes, edges, selectedId]
  )

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
          <ConfigTab data={data} selectedId={selectedId} patch={patch} availableVars={availableVars} />
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
  data, selectedId, patch, availableVars,
}: {
  data: WorkflowNodeData
  selectedId: string
  patch: (p: Partial<WorkflowNodeData>) => void
  availableVars: VariableGroup[]
}) {
  const isForm = data.nodeType === 'web_form' || data.nodeType === 'form'
  const isOtp  = data.nodeType === 'otp'
  const isDoc  = data.nodeType === 'document'

  return (
    <div className="divide-y divide-slate-100">
      {/* Label — always shown */}
      <Field label="Label">
        <Input value={data.label} onChange={(v) => patch({ label: v })} placeholder="Node label" />
      </Field>

      {/* ── web_form ── */}
      {isForm && (
        <>
          <Field label="Step title">
            <Input value={data.stepTitle ?? ''} onChange={(v) => patch({ stepTitle: v })} placeholder="Shown as heading above the form" />
          </Field>
          <Field label="Subtitle">
            <Input value={data.subtitle ?? ''} onChange={(v) => patch({ subtitle: v })} placeholder="Supporting text below the heading" />
          </Field>
          <Field label="Fields">
            <FieldsEditor fields={data.fields ?? []} onChange={(fields) => patch({ fields })} />
          </Field>
          <CopySection data={data} patch={patch} showBack />
        </>
      )}

      {/* ── otp ── */}
      {isOtp && (
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
          <Field label="Subtitle">
            <Input value={data.subtitle ?? ''} onChange={(v) => patch({ subtitle: v })} placeholder="e.g. Enter the 6-digit code we sent you" />
          </Field>
          <CopySection data={data} patch={patch} showBack />
        </>
      )}

      {/* ── document ── */}
      {isDoc && (
        <>
          <Field label="Subtitle">
            <Input value={data.subtitle ?? ''} onChange={(v) => patch({ subtitle: v })} placeholder="e.g. Please upload a clear scan or photo" />
          </Field>
          <Field label="Fields">
            <FieldsEditor fields={data.fields ?? []} onChange={(fields) => patch({ fields })} />
          </Field>
          <CopySection data={data} patch={patch} showBack />
        </>
      )}

      {/* ── api_request ── */}
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
            <Input value={data.endpoint ?? ''} onChange={(v) => patch({ endpoint: v })} placeholder="/credit/loan/v1/transition_state" mono />
            <p className="mt-1.5 text-[10px] text-slate-400">Use <code className="font-mono bg-slate-100 px-0.5 rounded">{'{{variables}}'}</code> for dynamic path segments, e.g. <code className="font-mono text-[9px]">/users/{'{{init.userId}}'}/state</code></p>
          </Field>
          <Field label="Auth">
            <Select
              value={data.auth ?? 'none'}
              options={[
                { value: 'none',    label: 'None' },
                { value: 'bearer',  label: 'Bearer token' },
                { value: 'apikey',  label: 'API key' },
              ]}
              onChange={(v) => patch({ auth: v as WorkflowNodeData['auth'] })}
            />
          </Field>
          <Field label="Request body">
            <RequestBodyEditor
              value={data.requestBody ?? ''}
              onChange={(v) => patch({ requestBody: v })}
              availableVars={availableVars}
            />
          </Field>
          <Field label="Response mapping">
            <Textarea
              value={data.responseMapping ?? ''}
              onChange={(v) => patch({ responseMapping: v })}
              placeholder={'nextState -> context.transition.nextState\nloanAmount -> context.offer.amount'}
              rows={3}
              mono
            />
            <p className="mt-1.5 text-[10px] text-slate-400 leading-relaxed">
              One mapping per line: <code className="font-mono bg-slate-100 px-0.5 rounded">responseField → context.namespace.key</code>
              <br />Response data is then available as <code className="font-mono bg-slate-100 px-0.5 rounded">{'{{response.responseField}}'}</code> in subsequent nodes.
            </p>
          </Field>
        </>
      )}

      {/* ── edge_operation / condition ── */}
      {(data.nodeType === 'edge_operation' || data.nodeType === 'condition') && (
        <>
          <Field label="Condition">
            <Input
              value={data.condition ?? ''}
              onChange={(v) => patch({ condition: v })}
              placeholder='e.g. currentState === "ADD_EMAIL"'
              mono
            />
            <p className="mt-1.5 text-[10px] text-slate-400 leading-relaxed">
              JavaScript expression. Available: <code className="font-mono bg-slate-100 px-0.5 rounded">currentState</code>{' '}
              <code className="font-mono bg-slate-100 px-0.5 rounded">nextState</code>{' '}
              <code className="font-mono bg-slate-100 px-0.5 rounded">response.*</code>
            </p>
            {/* Compact variable hint chips */}
            <div className="mt-2 flex flex-wrap gap-1">
              {availableVars.filter((v) => v.namespace === 'response' || v.namespace === 'context').slice(0, 8).map((v) => (
                <button
                  key={v.token}
                  onClick={() => navigator.clipboard.writeText(v.token.replace(/\{\{(.+)\}\}/, '$1')).catch(() => {})}
                  title={v.hint}
                  className="rounded-md border border-slate-100 bg-slate-50 px-1.5 py-0.5 text-[9px] font-mono text-slate-500 hover:border-blue-200 hover:text-blue-600 transition"
                >
                  {v.token.replace(/\{\{(.+)\}\}/, '$1')}
                </button>
              ))}
            </div>
          </Field>
          <Field label="True branch label">
            <Input value={data.trueLabel ?? 'True'} onChange={(v) => patch({ trueLabel: v })} placeholder="e.g. ADD_EMAIL" />
          </Field>
          <Field label="False branch label">
            <Input value={data.falseLabel ?? 'False'} onChange={(v) => patch({ falseLabel: v })} placeholder="e.g. → next" />
          </Field>
          <div className="px-4 pb-4">
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-[11px] text-slate-500 leading-relaxed">
              <p className="font-semibold text-slate-600 mb-1">Wiring branches</p>
              <p><span className="inline-block h-2 w-2 rounded-full bg-emerald-500 align-middle mr-1" />Drag from <strong>green handle</strong> → node that runs when <strong>true</strong>.</p>
              <p className="mt-1"><span className="inline-block h-2 w-2 rounded-full bg-red-500 align-middle mr-1" />Drag from <strong>red handle</strong> → next router or error node when <strong>false</strong>.</p>
            </div>
          </div>
        </>
      )}

      {/* ── policy_engine ── */}
      {(data.nodeType === 'policy_engine' || data.nodeType === 'policy') && (
        <Field label="Policy ID">
          <Input value={data.policyId ?? ''} onChange={(v) => patch({ policyId: v })} placeholder="e.g. POLICY-credit-eligibility-v2" mono />
        </Field>
      )}

      {/* ── task ── */}
      {(data.nodeType === 'task' || data.nodeType === 'wait') && (
        <>
          <Field label="Assigned role">
            <Select
              value={data.assignedRole ?? 'credit_officer'}
              options={[
                { value: 'credit_officer', label: 'Credit Officer' },
                { value: 'ops_team',       label: 'Ops Team' },
                { value: 'compliance',     label: 'Compliance' },
                { value: 'custom',         label: 'Custom…' },
              ]}
              onChange={(v) => patch({ assignedRole: v })}
            />
            {data.assignedRole === 'custom' && (
              <Input
                value={''}
                onChange={(v) => patch({ assignedRole: v })}
                placeholder="Type custom role name"
              />
            )}
          </Field>
          <Field label="SLA (hours)">
            <NumberInput value={data.dueHours ?? 24} min={1} max={720} onChange={(v) => patch({ dueHours: v })} />
            <p className="text-[10px] text-slate-400 mt-1.5">Max time before this task is flagged as overdue.</p>
          </Field>
          <Field label="Subtitle shown to borrower">
            <Input
              value={data.subtitle ?? ''}
              onChange={(v) => patch({ subtitle: v })}
              placeholder="e.g. We're verifying your mandate. This usually takes a few seconds."
            />
            <p className="text-[10px] text-slate-400 mt-1.5">If blank, auto-generates: "Assigned to [role] — SLA [N]h"</p>
          </Field>
          <Field label="Polling interval (seconds)">
            <NumberInput value={data.pollingIntervalSeconds ?? 3} min={1} max={60} onChange={(v) => patch({ pollingIntervalSeconds: v })} />
            <p className="text-[10px] text-slate-400 mt-1.5">How often the SDK checks for state change. 0 = no polling (requires manual advance).</p>
          </Field>
          <Field label="Polling timeout (seconds)">
            <NumberInput value={data.pollingTimeoutSeconds ?? 120} min={10} max={600} onChange={(v) => patch({ pollingTimeoutSeconds: v })} />
            <p className="text-[10px] text-slate-400 mt-1.5">Show timeout error after this many seconds if state never advances.</p>
          </Field>
        </>
      )}

      {/* ── flow_connector ── */}
      {(data.nodeType === 'flow_connector' || data.nodeType === 'connector') && (
        <>
          <Field label="Target flow ID">
            <Input value={data.flowId ?? ''} onChange={(v) => patch({ flowId: v })} placeholder="e.g. demo-flow" mono />
            {data.flowId ? (
              <a
                href={`/builder/${data.flowId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 flex items-center gap-1.5 text-[12px] font-semibold text-blue-600 hover:text-blue-700 transition"
              >
                <span>Open "{data.flowId}" in builder</span>
                <span className="text-[10px]">↗</span>
              </a>
            ) : (
              <p className="mt-1.5 text-[10px] text-slate-400">The child flow must be published. It will run nested inside this step.</p>
            )}
          </Field>
          <Field label="Input map">
            <Textarea
              value={data.inputMap ?? ''}
              onChange={(v) => patch({ inputMap: v })}
              placeholder={'{{init.userId}} -> child.init.userId\n{{context.n-email-form.email}} -> child.init.email'}
              rows={4}
              mono
            />
            <p className="mt-1.5 text-[10px] text-slate-400 leading-relaxed">
              One mapping per line: <code className="font-mono bg-slate-100 px-0.5 rounded">{'{{source}}'} -{'>'} child.init.key</code>
              <br />Left side is a variable from this flow's context. Right side seeds the child flow's <code className="font-mono text-[9px]">initialData</code>.
            </p>
            <VariablePicker groups={availableVars} compact />
          </Field>
          <Field label="Output map">
            <Textarea
              value={data.outputMap ?? ''}
              onChange={(v) => patch({ outputMap: v })}
              placeholder={'{{child.result.status}} -> context.kyc.status\n{{child.result.verified}} -> context.kyc.verified'}
              rows={3}
              mono
            />
            <p className="mt-1.5 text-[10px] text-slate-400 leading-relaxed">
              Maps the child flow's completion data back into this flow's session context.
            </p>
          </Field>
        </>
      )}

      {/* ── layout ── */}
      {data.nodeType === 'layout' && (
        <>
          <Field label="Variant">
            <Select
              value={data.variant ?? 'credit-offer'}
              options={[
                { value: 'credit-offer', label: 'Credit Offer (pre-approval card with limit + ROI)' },
                { value: 'loan-offer',   label: 'Sanction Letter / KFS (full KFS table + accept)' },
                { value: 'approved',     label: 'Approved (simple congrats screen)' },
                { value: 'rejected',     label: 'Rejected (failure screen)' },
              ]}
              onChange={(v) => patch({ variant: v })}
            />
            <p className="mt-1.5 text-[10px] text-slate-400">
              Determines which display style this screen uses. <strong>Credit Offer</strong> shows the pre-approval card; <strong>KFS</strong> shows the full Key Fact Statement table.
            </p>
          </Field>
          <Field label="Heading">
            <Input
              value={data.stepTitle ?? ''}
              onChange={(v) => patch({ stepTitle: v })}
              placeholder="e.g. Congratulations! You're Pre-Approved"
            />
          </Field>
          <Field label="Subheading">
            <Input
              value={data.subtitle ?? ''}
              onChange={(v) => patch({ subtitle: v })}
              placeholder="e.g. Complete your KYC to activate your credit line."
            />
          </Field>
          <Field label="Button label">
            <Input
              value={data.submitLabel ?? ''}
              onChange={(v) => patch({ submitLabel: v })}
              placeholder="e.g. Proceed to KYC"
            />
          </Field>
          {(data.variant === 'credit-offer' || data.variant === 'loan-offer' || !data.variant) && (
            <Field label="Preview values">
              <LayoutValuesEditor
                value={data.requestBody ?? ''}
                onChange={(v) => patch({ requestBody: v })}
                variant={data.variant ?? 'credit-offer'}
              />
            </Field>
          )}
        </>
      )}

      {/* ── webhook ── */}
      {data.nodeType === 'webhook' && (
        <>
          <Field label="Display variant">
            <Select
              value={data.variant ?? 'auto'}
              options={[
                { value: 'auto',        label: 'Auto-detect from label' },
                { value: 'digilocker', label: 'DigiLocker — Aadhaar OAuth' },
                { value: 'selfie',     label: 'Selfie — HyperVerge KYC' },
                { value: 'enach',      label: 'eNach — NACH Mandate' },
                { value: 'external',   label: 'Generic external redirect' },
              ]}
              onChange={(v) => patch({ variant: v })}
            />
            <p className="mt-1.5 text-[10px] text-slate-400">Controls the UI shown to the borrower while waiting for the external callback.</p>
          </Field>
          <Field label="Webhook URL">
            <Input value={data.webhookUrl ?? ''} onChange={(v) => patch({ webhookUrl: v })} placeholder="https://example.com/webhook" mono />
          </Field>
          <Field label="Signing secret">
            <Input value={data.webhookSecret ?? ''} onChange={(v) => patch({ webhookSecret: v })} placeholder="Optional — used to verify payload signatures" />
          </Field>
          <Field label="Button label">
            <Input value={data.submitLabel ?? ''} onChange={(v) => patch({ submitLabel: v })} placeholder="e.g. Continue" />
          </Field>
        </>
      )}

      {/* ── end ── */}
      {data.nodeType === 'end' && (
        <>
          <Field label="Outcome">
            <Select
              value={data.variant ?? 'approved'}
              options={[
                { value: 'approved', label: '✓ Approved — success screen' },
                { value: 'rejected', label: '✗ Rejected — failure screen' },
              ]}
              onChange={(v) => patch({ variant: v })}
            />
          </Field>
          <Field label="Subtitle">
            <Input
              value={data.subtitle ?? ''}
              onChange={(v) => patch({ subtitle: v })}
              placeholder={
                (data.variant ?? 'approved') === 'rejected'
                  ? 'e.g. Unfortunately we could not approve your application at this time.'
                  : 'e.g. Your application has been approved. We will be in touch shortly.'
              }
            />
            <p className="mt-1.5 text-[10px] text-slate-400">If blank, auto-generates based on the outcome type.</p>
          </Field>
          <Field label="Button label">
            <Input value={data.submitLabel ?? ''} onChange={(v) => patch({ submitLabel: v })} placeholder="e.g. Done" />
          </Field>
        </>
      )}

      {/* ── Node ID ── */}
      <Field label="Node ID">
        <code className="block w-full rounded-xl border border-slate-100 bg-slate-50 px-3.5 py-2.5 text-[12px] font-mono text-slate-500 select-all">
          {selectedId}
        </code>
      </Field>
    </div>
  )
}

// ─── Shared copy section (submit/back labels + allowBack toggle) ───────────────
function CopySection({
  data, patch, showBack,
}: {
  data: WorkflowNodeData
  patch: (p: Partial<WorkflowNodeData>) => void
  showBack?: boolean
}) {
  const allowBack = data.allowBack ?? true
  return (
    <>
      <Field label="Button label">
        <Input value={data.submitLabel ?? ''} onChange={(v) => patch({ submitLabel: v })} placeholder="e.g. Continue" />
      </Field>
      {showBack && (
        <>
          <Field label="Allow back button">
            <Toggle
              value={allowBack}
              onChange={(v) => patch({ allowBack: v })}
              label={allowBack ? 'Shown' : 'Hidden'}
            />
          </Field>
          {allowBack && (
            <Field label="Back button label">
              <Input value={data.backLabel ?? ''} onChange={(v) => patch({ backLabel: v })} placeholder="Back" />
            </Field>
          )}
        </>
      )}
    </>
  )
}

// ─── Layout values editor with API token picker ───────────────────────────────
function LayoutValuesEditor({ value, onChange, variant = 'credit-offer' }: {
  value: string
  onChange: (v: string) => void
  variant?: string
}) {
  type Row = { key: string; val: string }
  const lastFocusedValRef = useRef<{ index: number; el: HTMLInputElement | null }>({ index: -1, el: null })

  const parseRows = (raw: string): Row[] => {
    try {
      const obj = raw ? JSON.parse(raw) as Record<string, string> : {}
      const rows = Object.entries(obj).map(([key, val]) => ({ key, val }))
      return rows.length > 0 ? rows : defaultRows()
    } catch {
      return defaultRows()
    }
  }

  const defaultRows = (): Row[] => variant === 'loan-offer' ? [
    { key: 'principalAmount', val: '₹1,00,000' },
    { key: 'disbursedAmount', val: '₹98,500' },
    { key: 'tenure',          val: '24 months' },
    { key: 'emiAmount',       val: '₹5,166 / month' },
    { key: 'interestRate',    val: '24% p.a. (APR)' },
    { key: 'totalInterest',   val: '₹23,984' },
    { key: 'processingFee',   val: '₹1,500 (incl. GST)' },
    { key: 'totalRepayable',  val: '₹1,23,984' },
  ] : [
    { key: 'loanAmount',    val: '₹2,00,000' },
    { key: 'roi',           val: '1.5% per month' },
    { key: 'tenure',        val: 'Up to 12 months' },
    { key: 'processingFee', val: 'Nil' },
  ]

  const [rows, setRows] = useState<Row[]>(() => parseRows(value))

  const save = (next: Row[]) => {
    setRows(next)
    const obj = Object.fromEntries(next.filter((r) => r.key.trim()).map((r) => [r.key, r.val]))
    onChange(JSON.stringify(obj))
  }

  const updateRow = (i: number, patch: Partial<Row>) => save(rows.map((r, idx) => idx === i ? { ...r, ...patch } : r))
  const addRow = () => save([...rows, { key: '', val: '' }])
  const removeRow = (i: number) => save(rows.filter((_, idx) => idx !== i))

  const insertToken = (token: string) => {
    const { index, el } = lastFocusedValRef.current
    if (index >= 0 && el) {
      const start = el.selectionStart ?? el.value.length
      const end = el.selectionEnd ?? el.value.length
      const newVal = el.value.slice(0, start) + token + el.value.slice(end)
      updateRow(index, { val: newVal })
      requestAnimationFrame(() => {
        el.focus()
        el.setSelectionRange(start + token.length, start + token.length)
      })
    } else {
      navigator.clipboard.writeText(token).catch(() => {})
    }
  }

  return (
    <div className="space-y-2">
      {/* Rows */}
      {rows.map((row, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <input
            value={row.key}
            onChange={(e) => updateRow(i, { key: e.target.value })}
            placeholder="key"
            className="w-[90px] shrink-0 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11px] font-mono text-slate-600 outline-none focus:border-blue-400"
          />
          <input
            ref={(el) => {
              if (document.activeElement === el) lastFocusedValRef.current = { index: i, el }
            }}
            value={row.val}
            onChange={(e) => updateRow(i, { val: e.target.value })}
            onFocus={(e) => { lastFocusedValRef.current = { index: i, el: e.currentTarget } }}
            placeholder="value or {{token}}"
            className={`flex-1 rounded-lg border bg-white px-2 py-1.5 text-[11px] outline-none transition focus:border-blue-400 ${
              /^\{\{.+\}\}$/.test(row.val.trim())
                ? 'border-blue-300 text-blue-600 italic'
                : 'border-slate-200 text-slate-700'
            }`}
          />
          <button
            onClick={() => removeRow(i)}
            className="shrink-0 text-[11px] text-slate-300 hover:text-red-400 transition px-1"
          >
            ✕
          </button>
        </div>
      ))}

      <button
        onClick={addRow}
        className="text-[11px] font-semibold text-blue-500 hover:text-blue-600 transition"
      >
        + Add row
      </button>

      {/* Token picker */}
      <div className="rounded-xl border border-slate-100 bg-slate-50 p-2.5 mt-1">
        <p className="text-[10px] font-semibold text-slate-500 mb-1.5">API variables — click to insert</p>
        <div className="flex flex-wrap gap-1">
          {LAYOUT_TOKENS.map((t) => (
            <button
              key={t.token}
              onClick={() => insertToken(t.token)}
              title={t.hint}
              className="rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-mono text-blue-600 hover:border-blue-300 hover:bg-blue-50 transition"
            >
              {t.token}
            </button>
          ))}
        </div>
        <p className="text-[9px] text-slate-400 mt-1.5 leading-relaxed">
          Click a token to insert it at cursor (or copy it). <span className="italic text-blue-500">Blue italic</span> values are API variables — at runtime the backend substitutes the real value.
        </p>
      </div>
    </div>
  )
}

// ─── Variable picker — reusable for api_request, flow_connector, edge_operation ──
function VariablePicker({ groups, compact = false }: { groups: VariableGroup[]; compact?: boolean }) {
  const NS_LABELS: Record<string, string> = {
    init: 'From initialData',
    context: 'From form steps',
    session: 'Session',
    response: 'API response',
  }
  const NS_COLORS: Record<string, string> = {
    init: 'text-violet-600 bg-violet-50 border-violet-200',
    context: 'text-blue-600 bg-blue-50 border-blue-200',
    session: 'text-slate-500 bg-slate-50 border-slate-200',
    response: 'text-emerald-600 bg-emerald-50 border-emerald-200',
  }

  const byNs = groups.reduce<Record<string, VariableGroup[]>>((acc, g) => {
    if (!acc[g.namespace]) acc[g.namespace] = []
    acc[g.namespace]!.push(g)
    return acc
  }, {})

  if (compact) {
    return (
      <div className="mt-1.5 flex flex-wrap gap-1">
        {groups.slice(0, 12).map((g) => (
          <button
            key={g.token}
            onClick={() => navigator.clipboard.writeText(g.token).catch(() => {})}
            title={`${g.hint}\nClick to copy`}
            className={`rounded-md border px-1.5 py-0.5 text-[9px] font-mono transition hover:opacity-80 ${NS_COLORS[g.namespace] ?? ''}`}
          >
            {g.token}
          </button>
        ))}
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 p-2.5 space-y-2">
      <p className="text-[10px] font-semibold text-slate-500">Available variables — click to copy</p>
      {Object.entries(byNs).map(([ns, vars]) => (
        <div key={ns}>
          <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wide mb-1">{NS_LABELS[ns] ?? ns}</p>
          <div className="flex flex-wrap gap-1">
            {vars.map((g) => (
              <button
                key={g.token}
                onClick={() => navigator.clipboard.writeText(g.token).catch(() => {})}
                title={`${g.hint}\nClick to copy`}
                className={`rounded-md border px-1.5 py-0.5 text-[9px] font-mono transition hover:opacity-80 ${NS_COLORS[ns] ?? ''}`}
              >
                {g.token}
              </button>
            ))}
          </div>
        </div>
      ))}
      <p className="text-[9px] text-slate-400 leading-relaxed">
        Click any token to copy. Paste into request body, endpoint, or condition fields.
        At runtime the SDK (or backend) substitutes the real value from the session context.
      </p>
    </div>
  )
}

// ─── Request body editor with variable picker ─────────────────────────────────
function RequestBodyEditor({ value, onChange, availableVars }: {
  value: string
  onChange: (v: string) => void
  availableVars: VariableGroup[]
}) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  const insertAtCursor = (token: string) => {
    const el = textareaRef.current
    if (!el) { navigator.clipboard.writeText(token).catch(() => {}); return }
    const start = el.selectionStart ?? value.length
    const end = el.selectionEnd ?? value.length
    const newVal = value.slice(0, start) + token + value.slice(end)
    onChange(newVal)
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(start + token.length, start + token.length)
    })
  }

  return (
    <div className="space-y-2">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={'{\n  "graphId": "sm_los_workflow",\n  "currentState": "{{response.currentState}}",\n  "userId": "{{init.userId}}"\n}'}
        rows={5}
        className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-[12px] font-mono text-slate-700 outline-none placeholder:text-slate-300 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/10 transition resize-none"
      />
      <p className="text-[10px] text-slate-400">
        Use <code className="font-mono bg-slate-100 px-0.5 rounded">{'{{variables}}'}</code> for dynamic values. Click a token below to insert at cursor.
      </p>
      <VariablePicker groups={availableVars} />
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
    onChange([...fields, { id, type: 'text', label: 'New field', placeholder: '', required: false, validation: [] }])
    setExpanded((prev) => new Set(prev).add(id))
  }
  const remove = (i: number) => {
    const id = fields[i]?.id ?? ''
    onChange(fields.filter((_, idx) => idx !== i))
    setExpanded((prev) => { const next = new Set(prev); next.delete(id); return next })
  }

  return (
    <div className="space-y-1.5">
      {fields.map((f, i) => (
        <div key={f.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          {/* Collapsed row */}
          <div
            className="flex cursor-pointer items-center gap-2 px-3 py-2.5 hover:bg-slate-50 transition"
            onClick={() => toggle(f.id)}
          >
            <span className="text-slate-300 text-xs">☰</span>
            <span className="flex-1 truncate text-[13px] font-medium text-slate-700">{f.label}</span>
            <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-mono text-slate-500">{f.type}</span>
            {f.required && <span className="rounded-md bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-600">req</span>}
            <span className="text-slate-400 text-[10px]">{expanded.has(f.id) ? '▴' : '▾'}</span>
          </div>

          {/* Expanded config */}
          {expanded.has(f.id) && (
            <div className="border-t border-slate-100 bg-slate-50/60 p-3 space-y-2.5">
              {/* Label */}
              <div>
                <FieldLabel>Label</FieldLabel>
                <input
                  value={f.label}
                  onChange={(e) => update(i, { label: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[13px] outline-none focus:border-blue-400 transition"
                />
              </div>

              {/* Placeholder */}
              <div>
                <FieldLabel>Placeholder</FieldLabel>
                <input
                  value={f.placeholder ?? ''}
                  onChange={(e) => update(i, { placeholder: e.target.value })}
                  placeholder="Hint text shown inside the input"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[13px] outline-none focus:border-blue-400 transition placeholder:text-slate-300"
                />
              </div>

              {/* Type + Required */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <FieldLabel>Type</FieldLabel>
                  <select
                    value={f.type}
                    onChange={(e) => update(i, { type: e.target.value as FieldType, options: e.target.value === 'select' ? (f.options ?? []) : undefined })}
                    className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-[12px] outline-none focus:border-blue-400"
                  >
                    {FIELD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <FieldLabel>Required</FieldLabel>
                  <button
                    onClick={() => update(i, {
                      required: !f.required,
                      validation: !f.required
                        ? [{ type: 'required', message: `${f.label} is required` }]
                        : f.validation.filter((v) => v.type !== 'required'),
                    })}
                    className={`mt-0.5 flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-[12px] font-medium transition ${
                      f.required ? 'border-blue-200 bg-blue-50 text-blue-600' : 'border-slate-200 bg-white text-slate-500'
                    }`}
                  >
                    <span className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${f.required ? 'bg-blue-500' : 'bg-slate-300'}`} />
                    {f.required ? 'Yes' : 'No'}
                  </button>
                </div>
              </div>

              {/* Select options editor */}
              {f.type === 'select' && (
                <div>
                  <FieldLabel>Options</FieldLabel>
                  <SelectOptionsEditor
                    options={f.options ?? []}
                    onChange={(options) => update(i, { options })}
                  />
                </div>
              )}

              {/* Validation rules */}
              <ValidationEditor
                rules={f.validation}
                fieldLabel={f.label}
                onChange={(validation) => update(i, { validation })}
              />

              <button
                onClick={() => remove(i)}
                className="text-[11px] font-semibold text-red-400 hover:text-red-500 transition"
              >
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

// ─── Select options editor ────────────────────────────────────────────────────
function SelectOptionsEditor({ options, onChange }: { options: SelectOption[]; onChange: (o: SelectOption[]) => void }) {
  const update = (i: number, patch: Partial<SelectOption>) =>
    onChange(options.map((o, idx) => idx === i ? { ...o, ...patch } : o))
  const add = () => onChange([...options, { label: '', value: '' }])
  const remove = (i: number) => onChange(options.filter((_, idx) => idx !== i))

  return (
    <div className="space-y-1.5">
      {options.map((opt, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <input
            value={opt.label}
            onChange={(e) => update(i, { label: e.target.value })}
            placeholder="Label"
            className="flex-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[12px] outline-none focus:border-blue-400"
          />
          <input
            value={opt.value}
            onChange={(e) => update(i, { value: e.target.value })}
            placeholder="value"
            className="w-[80px] rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11px] font-mono text-slate-600 outline-none focus:border-blue-400"
          />
          <button onClick={() => remove(i)} className="text-[11px] text-slate-300 hover:text-red-400 transition">✕</button>
        </div>
      ))}
      <button
        onClick={add}
        className="text-[11px] font-semibold text-blue-500 hover:text-blue-600 transition"
      >
        + Add option
      </button>
    </div>
  )
}

// ─── Validation rules editor ──────────────────────────────────────────────────
function ValidationEditor({
  rules, fieldLabel, onChange,
}: {
  rules: ValidationRule[]
  fieldLabel: string
  onChange: (r: ValidationRule[]) => void
}) {
  const has = (type: ValidationRule['type']) => rules.some((r) => r.type === type)
  const remove = (type: ValidationRule['type']) => onChange(rules.filter((r) => r.type !== type))
  const updateMsg = (type: ValidationRule['type'], message: string) =>
    onChange(rules.map((r) => r.type === type ? { ...r, message } : r))
  const updateVal = (type: ValidationRule['type'], value: string | number) =>
    onChange(rules.map((r) => r.type === type ? { ...r, value } : r))

  const addRule = (type: ValidationRule['type'], defaults: Partial<ValidationRule> = {}) => {
    if (has(type)) return
    const defaultMessages: Record<string, string> = {
      minLength: `${fieldLabel} is too short`,
      maxLength: `${fieldLabel} is too long`,
      pattern:   `${fieldLabel} format is invalid`,
      phone:     'Enter a valid phone number',
    }
    onChange([...rules, { type, message: defaultMessages[type] ?? 'Invalid', ...defaults }])
  }

  const nonRequired = rules.filter((r) => r.type !== 'required')

  return (
    <div>
      <FieldLabel>Validation rules</FieldLabel>
      <div className="space-y-1.5">
        {nonRequired.map((rule, i) => (
          <div key={i} className="rounded-lg border border-slate-200 bg-white p-2 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{rule.type}</span>
              <button onClick={() => remove(rule.type)} className="text-[10px] text-slate-300 hover:text-red-400">✕</button>
            </div>
            {(rule.type === 'minLength' || rule.type === 'maxLength') && (
              <input
                type="number"
                value={rule.value as number ?? ''}
                onChange={(e) => updateVal(rule.type, parseInt(e.target.value, 10) || 0)}
                placeholder="Characters"
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[12px] outline-none focus:border-blue-400"
              />
            )}
            {rule.type === 'pattern' && (
              <input
                value={rule.value as string ?? ''}
                onChange={(e) => updateVal(rule.type, e.target.value)}
                placeholder="Regex pattern e.g. [A-Z]{5}[0-9]{4}[A-Z]"
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-mono outline-none focus:border-blue-400"
              />
            )}
            <input
              value={rule.message}
              onChange={(e) => updateMsg(rule.type, e.target.value)}
              placeholder="Error message shown to user"
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[12px] outline-none focus:border-blue-400"
            />
          </div>
        ))}
        <div className="flex flex-wrap gap-1">
          {(['minLength', 'maxLength', 'pattern', 'phone'] as const).map((type) => !has(type) && (
            <button
              key={type}
              onClick={() => addRule(type)}
              className="rounded-md border border-dashed border-slate-200 px-2 py-0.5 text-[10px] text-slate-400 hover:border-blue-300 hover:text-blue-500 transition"
            >
              + {type}
            </button>
          ))}
        </div>
      </div>
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

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-400">{children}</p>
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

function Textarea({ value, onChange, placeholder, rows, mono }: { value: string; onChange: (v: string) => void; placeholder?: string; rows?: number; mono?: boolean }) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows ?? 3}
      className={`w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-[14px] text-slate-800 outline-none placeholder:text-slate-300 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/10 transition resize-none ${mono ? 'font-mono text-[12px]' : ''}`}
    />
  )
}

function NumberInput({ value, onChange, min, max }: { value: number; onChange: (v: number) => void; min?: number; max?: number }) {
  return (
    <input
      type="number"
      value={value}
      min={min}
      max={max}
      onChange={(e) => onChange(parseInt(e.target.value, 10) || 0)}
      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-[14px] text-slate-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/10 transition"
    />
  )
}

function Select({ value, options, onChange }: { value: string; options: { value: string; label: string }[]; onChange: (v: string) => void }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-[14px] text-slate-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/10 transition"
    >
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )
}

function Toggle({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={`flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-[14px] font-medium transition w-full ${
        value ? 'border-blue-200 bg-blue-50 text-blue-600' : 'border-slate-200 bg-white text-slate-500'
      }`}
    >
      <span className={`h-4 w-7 rounded-full flex items-center transition-colors ${value ? 'bg-blue-500' : 'bg-slate-300'}`}>
        <span className={`h-3 w-3 rounded-full bg-white shadow transition-transform mx-0.5 ${value ? 'translate-x-3' : 'translate-x-0'}`} />
      </span>
      {label}
    </button>
  )
}
