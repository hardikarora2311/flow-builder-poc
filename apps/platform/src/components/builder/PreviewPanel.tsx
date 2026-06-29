'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { FlowProvider, FlowRenderer } from '@platform/react'
import { ThemeProvider, StepLayout, FormStep, OTPStep, DecisionStep } from '@platform/ui'
import { useBuilderStore } from '@/lib/store'
import { createMockSessionToken } from '@/lib/mock-token'
import { registerRuntimeFlow, compileSingleNode } from '@/lib/flow-compiler'

const UI_NODE_TYPES = new Set(['web_form', 'layout', 'otp', 'document', 'end', 'form']) // 'form' for backward compat

export function PreviewPanel() {
  const theme = useBuilderStore((s) => s.theme)
  const nodes = useBuilderStore((s) => s.nodes)
  const edges = useBuilderStore((s) => s.edges)
  const workflowId = useBuilderStore((s) => s.workflowId)
  const selectedNodeId = useBuilderStore((s) => s.selectedNodeId)
  const flowId = workflowId ?? 'demo-flow'
  const [runKey, setRunKey] = useState(0)
  const [mode, setMode] = useState<'node' | 'flow'>('flow')
  const [booting, setBooting] = useState(true)

  // Selected node (if any)
  const selectedNode = useMemo(
    () => nodes.find((n) => n.id === selectedNodeId) ?? null,
    [nodes, selectedNodeId]
  )

  // Whether we can show a static step preview for the selected node
  const canPreviewNode =
    selectedNode != null && UI_NODE_TYPES.has(selectedNode.data.nodeType)

  const compiledStep = useMemo(() => {
    if (!selectedNode) return null
    return compileSingleNode(selectedNode)
  }, [selectedNode])

  // ─── Full-flow preview ──────────────────────────────────────────────────
  const graphSig = useMemo(
    () =>
      JSON.stringify(nodes.map((n) => [n.id, n.data])) +
      '|' +
      JSON.stringify(edges.map((e) => [e.source, e.target, e.sourceHandle])),
    [nodes, edges]
  )

  registerRuntimeFlow(flowId, nodes, edges)

  // Boot animation: show "starting…" splash before rendering the flow
  useEffect(() => {
    setBooting(true)
    const t = setTimeout(() => setBooting(false), 800)
    return () => clearTimeout(t)
  }, [runKey])

  const firstRun = useRef(true)
  useEffect(() => {
    if (firstRun.current) { firstRun.current = false; return }
    const t = setTimeout(() => setRunKey((k) => k + 1), 300)
    return () => clearTimeout(t)
  }, [theme, graphSig])

  const token = useMemo(
    () => createMockSessionToken({ flowId, themeHash: flowId, theme }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [flowId, runKey]
  )

  // ─── Header ─────────────────────────────────────────────────────────────
  const headerLabel =
    mode === 'node' && selectedNode
      ? selectedNode.data.label
      : 'Full flow'
  const headerSub =
    mode === 'node' && selectedNode
      ? `${selectedNode.data.nodeType} step preview`
      : 'Running graph through SDK + mock backend'

  return (
    <aside className="flex w-[400px] shrink-0 flex-col border-l border-slate-200 bg-slate-50">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-2.5">
        <div className="min-w-0">
          <span className="block truncate text-sm font-semibold text-slate-800">{headerLabel}</span>
          <p className="text-[11px] text-slate-400 truncate">{headerSub}</p>
        </div>
        <div className="ml-2 flex shrink-0 items-center gap-1">
          {/* Mode toggle */}
          <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs">
            <button
              onClick={() => setMode('node')}
              disabled={!canPreviewNode}
              className={`rounded-md px-2 py-0.5 font-medium transition ${
                mode === 'node'
                  ? 'bg-white shadow-sm text-slate-800'
                  : 'text-slate-400 hover:text-slate-600 disabled:cursor-not-allowed disabled:opacity-30'
              }`}
            >
              Step
            </button>
            <button
              onClick={() => setMode('flow')}
              className={`rounded-md px-2 py-0.5 font-medium transition ${
                mode === 'flow'
                  ? 'bg-white shadow-sm text-slate-800'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Flow
            </button>
          </div>
          {mode === 'flow' && (
            <button
              onClick={() => { setBooting(true); setRunKey((k) => k + 1) }}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
              title="Restart flow"
            >
              ↻
            </button>
          )}
        </div>
      </div>

      {/* Phone frame */}
      <div className="flex flex-1 items-start justify-center overflow-y-auto p-5">
        <div className="w-full max-w-[340px] overflow-hidden rounded-[2rem] border-[6px] border-slate-800 bg-white shadow-xl">
          {/* Notch */}
          <div className="flex items-center justify-center bg-slate-800 py-1">
            <div className="h-1 w-14 rounded-full bg-slate-600" />
          </div>

          <div className="min-h-[500px]">
            {mode === 'node' && compiledStep ? (
              // ── Static single-step preview ──
              <ThemeProvider theme={theme}>
                <StepLayout step={compiledStep} isSubmitting={false} onBack={() => {}}>
                  {compiledStep.type === 'form' && (
                    <FormStep step={compiledStep} isSubmitting={false} onSubmit={() => {}} />
                  )}
                  {compiledStep.type === 'otp' && (
                    <OTPStep step={compiledStep} isSubmitting={false} onSubmit={() => {}} />
                  )}
                  {compiledStep.type === 'decision' && (
                    <DecisionStep step={compiledStep} />
                  )}
                </StepLayout>
              </ThemeProvider>
            ) : mode === 'node' && !compiledStep ? (
              // ── Non-UI node selected ──
              <div className="flex h-[500px] flex-col items-center justify-center gap-2 px-6 text-center">
                <span className="text-3xl opacity-30">⚙️</span>
                <p className="text-sm font-medium text-slate-500">No user-facing step</p>
                <p className="text-xs text-slate-400">
                  {selectedNode?.data.nodeType} nodes run server-side and don&apos;t produce a UI step.
                </p>
              </div>
            ) : booting ? (
              // ── Boot splash ──
              <div className="flex h-[500px] flex-col items-center justify-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600" />
                </div>
                <p className="text-sm font-medium text-slate-500">Starting flow…</p>
                <p className="text-xs text-slate-400">Step 1 of {token ? '' : ''}the journey</p>
              </div>
            ) : (
              // ── Full SDK flow ──
              <div className="p-4">
                <FlowProvider
                  key={runKey}
                  apiBaseUrl="/mock-api"
                  flowId={flowId}
                  sessionToken={token}
                  theme={theme}
                >
                  <FlowRenderer />
                </FlowProvider>
              </div>
            )}
          </div>
        </div>
      </div>
    </aside>
  )
}
