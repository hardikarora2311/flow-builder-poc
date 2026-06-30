'use client'

import { useMemo } from 'react'
import { useReactFlow } from 'reactflow'
import { useBuilderStore } from '@/lib/store'
import { useWorkflows } from '@/lib/api'
import { validateWorkflow, type ValidationIssue, type IssueSeverity } from '@/lib/validate'

const SEVERITY_STYLES: Record<IssueSeverity, { icon: string; bg: string; border: string; text: string; pill: string }> = {
  error: {
    icon: '⚠',
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-700',
    pill: 'bg-red-100 text-red-700',
  },
  warning: {
    icon: '!',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-800',
    pill: 'bg-amber-100 text-amber-700',
  },
  info: {
    icon: 'i',
    bg: 'bg-slate-50',
    border: 'border-slate-200',
    text: 'text-slate-700',
    pill: 'bg-slate-100 text-slate-600',
  },
}

export function IssuesPanel() {
  const nodes = useBuilderStore((s) => s.nodes)
  const edges = useBuilderStore((s) => s.edges)
  const workflowId = useBuilderStore((s) => s.workflowId)
  const selectNode = useBuilderStore((s) => s.selectNode)
  const { data: workflows } = useWorkflows()

  const knownFlowIds = useMemo(() => workflows?.map((w) => w.id) ?? [], [workflows])

  const issues = useMemo(
    () => validateWorkflow({
      nodes,
      edges,
      knownFlowIds,
      currentFlowId: workflowId ?? '',
    }),
    [nodes, edges, knownFlowIds, workflowId]
  )

  const errorCount = issues.filter((i) => i.severity === 'error').length
  const warningCount = issues.filter((i) => i.severity === 'warning').length

  // Focus the canvas on the clicked node — page-level ReactFlowProvider guarantees this works
  const { setCenter } = useReactFlow()

  const focusNode = (nodeId: string) => {
    const node = nodes.find((n) => n.id === nodeId)
    selectNode(nodeId)
    if (node) {
      setCenter(node.position.x + 110, node.position.y + 45, { duration: 600, zoom: 1.1 })
    }
  }

  if (issues.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-8 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-2xl text-emerald-600">
          ✓
        </div>
        <div>
          <p className="text-sm font-semibold text-emerald-700">All checks passed</p>
          <p className="mt-1 text-xs text-slate-400 leading-relaxed">
            No structural or configuration issues found in this workflow.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col bg-white">
      {/* Header summary */}
      <div className="flex shrink-0 items-center gap-3 border-b border-slate-100 px-4 py-3">
        {errorCount > 0 && (
          <span className="flex items-center gap-1.5 rounded-full bg-red-100 px-2.5 py-1 text-[11px] font-bold text-red-700">
            <span className="text-[12px] leading-none">⚠</span>
            {errorCount} error{errorCount === 1 ? '' : 's'}
          </span>
        )}
        {warningCount > 0 && (
          <span className="flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-700">
            <span className="text-[12px] leading-none">!</span>
            {warningCount} warning{warningCount === 1 ? '' : 's'}
          </span>
        )}
        <p className="ml-auto text-[10px] text-slate-400">Click any issue to focus on canvas</p>
      </div>

      {/* Issue list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {issues.map((issue) => (
          <IssueRow key={issue.id} issue={issue} onFocus={focusNode} />
        ))}
      </div>
    </div>
  )
}

function IssueRow({ issue, onFocus }: { issue: ValidationIssue; onFocus: (nodeId: string) => void }) {
  const styles = SEVERITY_STYLES[issue.severity]
  const clickable = !!issue.nodeId

  return (
    <button
      onClick={() => issue.nodeId && onFocus(issue.nodeId)}
      disabled={!clickable}
      className={`w-full text-left rounded-xl border ${styles.border} ${styles.bg} p-3 transition ${
        clickable ? 'hover:shadow-md cursor-pointer hover:-translate-y-px' : 'cursor-default opacity-90'
      }`}
    >
      <div className="flex items-start gap-2.5">
        <span
          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${styles.pill}`}
        >
          {styles.icon}
        </span>
        <div className="min-w-0 flex-1">
          <p className={`text-[12px] font-medium leading-snug ${styles.text}`}>
            {issue.message}
          </p>
          <div className="mt-1.5 flex items-center gap-2">
            <span className={`rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${styles.pill}`}>
              {issue.kind}
            </span>
            {issue.nodeId && (
              <span className="text-[10px] text-slate-400 font-mono truncate">
                {issue.nodeId}
              </span>
            )}
          </div>
        </div>
        {clickable && (
          <span className="shrink-0 text-[11px] text-slate-400 mt-0.5">→</span>
        )}
      </div>
    </button>
  )
}

/**
 * Lightweight count badge for the toolbar — runs the same validation cheaply.
 */
export function IssueCount({ onClick }: { onClick?: () => void }) {
  const nodes = useBuilderStore((s) => s.nodes)
  const edges = useBuilderStore((s) => s.edges)
  const workflowId = useBuilderStore((s) => s.workflowId)
  const { data: workflows } = useWorkflows()
  const knownFlowIds = useMemo(() => workflows?.map((w) => w.id) ?? [], [workflows])

  const counts = useMemo(() => {
    const issues = validateWorkflow({
      nodes, edges, knownFlowIds, currentFlowId: workflowId ?? '',
    })
    return {
      errors: issues.filter((i) => i.severity === 'error').length,
      warnings: issues.filter((i) => i.severity === 'warning').length,
    }
  }, [nodes, edges, knownFlowIds, workflowId])

  if (counts.errors === 0 && counts.warnings === 0) {
    return (
      <button
        onClick={onClick}
        className="flex items-center gap-1.5 rounded-lg border border-emerald-100 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
        title="No issues"
      >
        <span className="text-[11px]">✓</span>
        No issues
      </button>
    )
  }

  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition ${
        counts.errors > 0
          ? 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100'
          : 'border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100'
      }`}
      title="View issues"
    >
      {counts.errors > 0 && <span className="text-[11px]">⚠ {counts.errors}</span>}
      {counts.warnings > 0 && <span className="text-[11px]">! {counts.warnings}</span>}
      Issues
    </button>
  )
}
