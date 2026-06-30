'use client'

import { useState, useEffect } from 'react'
import { Handle, Position, type NodeProps, type NodeTypes } from 'reactflow'
import type { WorkflowNodeData } from '@platform/core'
import { NODE_META } from '@/lib/constants'
import { useBuilderStore } from '@/lib/store'

// ─── Handles ─────────────────────────────────────────────────────────────────
const H       = { width: 8, height: 8, background: '#1e293b', border: '2px solid #fff', borderRadius: '50%' }
const H_TRUE  = { ...H, background: '#22c55e' }
const H_FALSE = { ...H, background: '#ef4444' }

// ─── Per-type pastel palette ──────────────────────────────────────────────────
const PALETTE: Record<string, { bg: string; border: string; text: string; iconBg: string }> = {
  start:          { bg: '#f0fdf4', border: '#bbf7d0', text: '#15803d', iconBg: '#dcfce7' },
  end:            { bg: '#fef2f2', border: '#fecaca', text: '#dc2626', iconBg: '#fee2e2' },
  web_form:       { bg: '#eff6ff', border: '#bfdbfe', text: '#2563eb', iconBg: '#dbeafe' },
  api_request:    { bg: '#fdf2f8', border: '#fbcfe8', text: '#db2777', iconBg: '#fce7f3' },
  layout:         { bg: '#f5f3ff', border: '#ddd6fe', text: '#7c3aed', iconBg: '#ede9fe' },
  policy_engine:  { bg: '#fffbeb', border: '#fde68a', text: '#b45309', iconBg: '#fef3c7' },
  task:           { bg: '#fef3c7', border: '#fcd34d', text: '#92400e', iconBg: '#fde68a' },
  flow_connector: { bg: '#ecfeff', border: '#a5f3fc', text: '#0891b2', iconBg: '#cffafe' },
  edge_operation: { bg: '#f8fafc', border: '#e2e8f0', text: '#475569', iconBg: '#f1f5f9' },
  webhook:        { bg: '#fff7ed', border: '#fed7aa', text: '#c2410c', iconBg: '#ffedd5' },
  otp:            { bg: '#f5f3ff', border: '#ddd6fe', text: '#7c3aed', iconBg: '#ede9fe' },
  document:       { bg: '#ecfeff', border: '#a5f3fc', text: '#0891b2', iconBg: '#cffafe' },
  // backward compat fallbacks
  form:           { bg: '#eff6ff', border: '#bfdbfe', text: '#2563eb', iconBg: '#dbeafe' },
  api:            { bg: '#fdf2f8', border: '#fbcfe8', text: '#db2777', iconBg: '#fce7f3' },
  condition:      { bg: '#fffbeb', border: '#fde68a', text: '#b45309', iconBg: '#fef3c7' },
  connector:      { bg: '#ecfeff', border: '#a5f3fc', text: '#0891b2', iconBg: '#cffafe' },
  policy:         { bg: '#ecfeff', border: '#a5f3fc', text: '#0891b2', iconBg: '#cffafe' },
  wait:           { bg: '#f8fafc', border: '#e2e8f0', text: '#475569', iconBg: '#f1f5f9' },
}

// ─── Context menu ─────────────────────────────────────────────────────────────
function DotMenu({ nodeId }: { nodeId: string }) {
  const [open, setOpen] = useState(false)
  const deleteNode = useBuilderStore((s) => s.deleteNode)

  useEffect(() => {
    if (!open) return
    const t = setTimeout(() => {
      const close = () => setOpen(false)
      document.addEventListener('click', close, { once: true })
    }, 10)
    return () => clearTimeout(t)
  }, [open])

  return (
    <div className="relative nodrag nopan" onClick={(e) => e.stopPropagation()}>
      <button
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v) }}
        className="flex h-5 w-5 items-center justify-center rounded opacity-50 hover:opacity-100 hover:bg-black/8 transition text-xs leading-none font-bold"
        title="Options"
      >
        ···
      </button>
      {open && (
        <div className="absolute right-0 top-full z-[9999] mt-1 w-32 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl">
          <button
            onClick={() => { deleteNode(nodeId); setOpen(false) }}
            className="flex w-full items-center gap-2 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 transition"
          >
            <span>🗑</span> Delete
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Base card ────────────────────────────────────────────────────────────────
function Card({
  id, data, selected, children, noTarget, noSource,
}: {
  id: string; data: WorkflowNodeData; selected: boolean
  children?: React.ReactNode; noTarget?: boolean; noSource?: boolean
}) {
  const meta = NODE_META[data.nodeType]
  const pal  = PALETTE[data.nodeType] ?? PALETTE.wait

  return (
    <div
      className={`w-[220px] rounded-2xl overflow-hidden transition-all ${
        selected
          ? 'shadow-[0_0_0_2px_#3b82f6,0_8px_24px_rgba(59,130,246,0.18)]'
          : 'shadow-[0_1px_4px_rgba(0,0,0,0.07),0_2px_12px_rgba(0,0,0,0.05)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.12)]'
      }`}
      style={{ background: '#fff', border: `1.5px solid ${selected ? '#3b82f6' : pal.border}` }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 px-2.5 py-2"
        style={{ background: pal.bg }}
      >
        <span
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[13px]"
          style={{ background: pal.iconBg }}
        >
          {meta.icon}
        </span>
        <span className="flex-1 text-[11px] font-bold truncate" style={{ color: pal.text }}>
          {meta.label}
        </span>
        <DotMenu nodeId={id} />
      </div>

      {/* Body */}
      <div className="bg-white px-2.5 py-2 border-t" style={{ borderColor: pal.border }}>
        <p className="text-[12px] font-semibold text-slate-700 leading-snug truncate">{data.label}</p>
        {children && <div className="mt-1.5">{children}</div>}
      </div>

      {!noTarget && <Handle type="target" position={Position.Left}  style={H} />}
      {!noSource && <Handle type="source" position={Position.Right} style={H} />}
    </div>
  )
}

// ─── Chips ────────────────────────────────────────────────────────────────────
function Chip({ children, color = 'slate' }: { children: React.ReactNode; color?: string }) {
  const map: Record<string, string> = {
    slate:  'bg-slate-100 text-slate-500',
    blue:   'bg-blue-100  text-blue-600',
    green:  'bg-emerald-100 text-emerald-600',
    amber:  'bg-amber-100  text-amber-700',
    red:    'bg-red-100    text-red-600',
    pink:   'bg-pink-100   text-pink-600',
    purple: 'bg-violet-100 text-violet-600',
    cyan:   'bg-cyan-100   text-cyan-600',
  }
  return (
    <span className={`inline-block rounded-md px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${map[color] ?? map.slate}`}>
      {children}
    </span>
  )
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center gap-1 text-[10px] text-slate-400 leading-tight">{children}</div>
}

// ─── Node variants ────────────────────────────────────────────────────────────

function StartNode({ id, data, selected }: NodeProps<WorkflowNodeData>) {
  return (
    <Card id={id} data={data} selected={selected} noTarget>
      <Row><span className="text-slate-400 italic text-[10px]">Entry point</span></Row>
    </Card>
  )
}

function EndNode({ id, data, selected }: NodeProps<WorkflowNodeData>) {
  // Explicit variant wins; fall back to label heuristic
  const isSuccess = data.variant
    ? data.variant === 'approved'
    : /live|complete|success|approved/i.test(data.label ?? '')
  return (
    <Card id={id} data={data} selected={selected} noSource>
      <Row>
        <span className={`text-[10px] font-medium ${isSuccess ? 'text-emerald-600' : 'text-red-500'}`}>
          {isSuccess ? '✓ Approved' : '✗ Rejected'}
        </span>
      </Row>
    </Card>
  )
}

function FormNode({ id, data, selected }: NodeProps<WorkflowNodeData>) {
  const fields = data.fields ?? []
  return (
    <Card id={id} data={data} selected={selected}>
      {data.subtitle && (
        <p className="text-[9px] text-slate-400 italic truncate mb-1">{data.subtitle}</p>
      )}
      {fields.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {fields.slice(0, 4).map((f) => (
            <span key={f.id} className="rounded-md border border-slate-100 bg-slate-50 px-1.5 py-0.5 text-[9px] font-medium text-slate-500">
              {f.label}
            </span>
          ))}
          {fields.length > 4 && (
            <span className="text-[9px] text-slate-400 self-center">+{fields.length - 4}</span>
          )}
        </div>
      ) : (
        <Row><span className="italic text-[10px]">No fields</span></Row>
      )}
    </Card>
  )
}

function OtpNode({ id, data, selected }: NodeProps<WorkflowNodeData>) {
  return (
    <Card id={id} data={data} selected={selected}>
      <Row><Chip color="purple">{data.channel ?? 'sms'}</Chip><span>· max {data.maxAttempts ?? 3} attempts</span></Row>
    </Card>
  )
}

function DocumentNode({ id, data, selected }: NodeProps<WorkflowNodeData>) {
  const n = data.fields?.length ?? 0
  return (
    <Card id={id} data={data} selected={selected}>
      <Row><span>{n} file field{n !== 1 ? 's' : ''}</span></Row>
    </Card>
  )
}

const METHOD_COLOR: Record<string, string> = {
  GET: 'green', POST: 'blue', PUT: 'amber', PATCH: 'amber', DELETE: 'red',
}

function ApiNode({ id, data, selected }: NodeProps<WorkflowNodeData>) {
  const path = data.endpoint
    ? data.endpoint.replace(/^https?:\/\/[^/]+/, '').substring(0, 26)
    : ''
  return (
    <Card id={id} data={data} selected={selected}>
      <div className="space-y-1">
        {data.method && (
          <Row>
            <Chip color={METHOD_COLOR[data.method] ?? 'slate'}>{data.method}</Chip>
            {path && <code className="truncate text-[9px] font-mono text-slate-400">{path}</code>}
          </Row>
        )}
      </div>
    </Card>
  )
}

function LayoutNode({ id, data, selected }: NodeProps<WorkflowNodeData>) {
  return (
    <Card id={id} data={data} selected={selected}>
      <Row><span className="italic text-[10px]">Page layout — elements</span></Row>
    </Card>
  )
}

function PolicyEngineNode({ id, data, selected }: NodeProps<WorkflowNodeData>) {
  return (
    <Card id={id} data={data} selected={selected} noSource>
      {data.policyId && (
        <Row><code className="text-[9px] font-mono text-amber-600 truncate">{data.policyId}</code></Row>
      )}
      <div className="flex items-center justify-between mt-1">
        <span className="flex items-center gap-1 text-[9px] font-bold text-emerald-600">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block" />
          PASS
        </span>
        <span className="flex items-center gap-1 text-[9px] font-bold text-red-500">
          FAIL
          <span className="h-1.5 w-1.5 rounded-full bg-red-500 inline-block" />
        </span>
      </div>
      <Handle type="target" position={Position.Left} style={H} />
      <Handle id="pass" type="source" position={Position.Right} style={{ ...H_TRUE,  top: '42%' }} />
      <Handle id="fail" type="source" position={Position.Right} style={{ ...H_FALSE, top: '72%' }} />
    </Card>
  )
}

function TaskNode({ id, data, selected }: NodeProps<WorkflowNodeData>) {
  return (
    <Card id={id} data={data} selected={selected}>
      <Row>
        <Chip color="amber">{data.assignedRole ?? 'credit_officer'}</Chip>
        {data.dueHours && <span className="text-slate-400">SLA {data.dueHours}h</span>}
      </Row>
    </Card>
  )
}

function FlowConnectorNode({ id, data, selected }: NodeProps<WorkflowNodeData>) {
  return (
    <Card id={id} data={data} selected={selected}>
      {data.flowId ? (
        <>
          <Row><code className="text-[9px] font-mono text-cyan-600 truncate">{data.flowId}</code></Row>
          <a
            href={`/builder/${data.flowId}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="nodrag mt-1 inline-flex items-center gap-0.5 text-[9px] font-semibold text-cyan-600 hover:text-cyan-800 hover:underline transition"
          >
            Open ↗
          </a>
        </>
      ) : (
        <Row><span className="italic text-[10px] text-slate-400">No target flow set</span></Row>
      )}
    </Card>
  )
}

function EdgeOperationNode({ id, data, selected }: NodeProps<WorkflowNodeData>) {
  return (
    <Card id={id} data={data} selected={selected} noSource>
      {data.condition && (
        <div className="rounded-lg bg-slate-50 border border-slate-100 px-2 py-1 mb-1.5">
          <code className="block truncate text-[9px] font-mono text-slate-500">{data.condition}</code>
        </div>
      )}
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1 text-[9px] font-bold text-emerald-600">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block" />
          {data.trueLabel ?? 'True'}
        </span>
        <span className="flex items-center gap-1 text-[9px] font-bold text-red-500">
          {data.falseLabel ?? 'False'}
          <span className="h-1.5 w-1.5 rounded-full bg-red-500 inline-block" />
        </span>
      </div>
      <Handle type="target" position={Position.Left} style={H} />
      <Handle id="true"  type="source" position={Position.Right} style={{ ...H_TRUE,  top: '42%' }} />
      <Handle id="false" type="source" position={Position.Right} style={{ ...H_FALSE, top: '72%' }} />
    </Card>
  )
}

// ─── Legacy node components (kept for backward compat with old-type nodes) ─────
function ConditionNode({ id, data, selected }: NodeProps<WorkflowNodeData>) {
  return (
    <Card id={id} data={data} selected={selected} noSource>
      {data.condition && (
        <div className="rounded-lg bg-amber-50 border border-amber-100 px-2 py-1 mb-1.5">
          <code className="block truncate text-[9px] font-mono text-amber-700">{data.condition}</code>
        </div>
      )}
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1 text-[9px] font-bold text-emerald-600">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block" />
          {data.trueLabel ?? 'True'}
        </span>
        <span className="flex items-center gap-1 text-[9px] font-bold text-red-500">
          {data.falseLabel ?? 'False'}
          <span className="h-1.5 w-1.5 rounded-full bg-red-500 inline-block" />
        </span>
      </div>
      <Handle type="target" position={Position.Left} style={H} />
      <Handle id="true"  type="source" position={Position.Right} style={{ ...H_TRUE,  top: '42%' }} />
      <Handle id="false" type="source" position={Position.Right} style={{ ...H_FALSE, top: '72%' }} />
    </Card>
  )
}

function WebhookNode({ id, data, selected }: NodeProps<WorkflowNodeData>) {
  const variantMap: Record<string, string> = {
    digilocker: 'DigiLocker',
    selfie: 'HyperVerge Selfie',
    enach: 'eNach',
    external: 'External',
  }
  const displayVariant = data.variant && data.variant !== 'auto' ? variantMap[data.variant] ?? data.variant : null
  return (
    <Card id={id} data={data} selected={selected}>
      {displayVariant && (
        <Row><Chip color="pink">{displayVariant}</Chip></Row>
      )}
      {data.webhookUrl ? (
        <Row><code className="truncate text-[9px] font-mono text-slate-400">{data.webhookUrl.substring(0, 30)}</code></Row>
      ) : (
        <Row><span className="italic text-[10px]">External flow</span></Row>
      )}
    </Card>
  )
}

// ─── Export ───────────────────────────────────────────────────────────────────
export const nodeTypes: NodeTypes = {
  start:          StartNode,
  end:            EndNode,
  web_form:       FormNode,           // new name
  api_request:    ApiNode,            // new name
  layout:         LayoutNode,         // new
  policy_engine:  PolicyEngineNode,   // new name
  task:           TaskNode,           // new name
  flow_connector: FlowConnectorNode,  // new name
  edge_operation: EdgeOperationNode,  // new name
  webhook:        WebhookNode,
  otp:            OtpNode,
  document:       DocumentNode,
  // backward compat for old nodes still in the DB / mock data
  form:           FormNode,
  api:            ApiNode,
  condition:      ConditionNode,
  connector:      FlowConnectorNode,
  policy:         PolicyEngineNode,
  wait:           TaskNode,
}
