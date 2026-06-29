import type { StepDefinition, WorkflowNodeData } from '@platform/core'

// Minimal node/edge shapes accepted from either reactflow nodes (builder store)
// or domain WorkflowNodes (a fetched workflow).
export interface CompileNode {
  id: string
  data: WorkflowNodeData
}
export interface CompileEdge {
  source: string
  target: string
  sourceHandle?: string | null
}

export interface RuntimeFlow {
  order: string[]
  steps: Record<string, StepDefinition>
}

/** Turn one graph node into a runtime step (or null for non-UI nodes). */
function buildStep(node: CompileNode, index: number): StepDefinition | null {
  const d = node.data
  const allowBack = index > 0

  switch (d.nodeType) {
    case 'web_form':
    case 'form': // backward compat
      return {
        id: node.id,
        type: 'form',
        title: d.stepTitle || d.label || 'Form',
        allowBack,
        copy: { submitLabel: 'Continue', backLabel: 'Back' },
        uiConfig: {},
        fields: d.fields ?? [],
      }
    case 'layout':
      return {
        id: node.id,
        type: 'decision',
        title: d.label || 'Layout',
        subtitle: '',
        allowBack: false,
        copy: { submitLabel: 'Continue' },
        uiConfig: {},
        fields: [],
      }
    case 'document':
      return {
        id: node.id,
        type: 'form',
        title: d.label || 'Upload document',
        allowBack,
        copy: { submitLabel: 'Continue', backLabel: 'Back' },
        uiConfig: {},
        fields:
          d.fields ?? [
            {
              id: 'document',
              type: 'file',
              label: 'Upload document',
              required: true,
              validation: [{ type: 'required', message: 'Please upload a document' }],
            },
          ],
      }
    case 'otp':
      return {
        id: node.id,
        type: 'otp',
        title: 'Verify your mobile number',
        subtitle: 'Enter the 6-digit code we sent you',
        allowBack,
        copy: { submitLabel: 'Verify OTP', backLabel: 'Back' },
        uiConfig: {},
        fields: [],
      }
    case 'end': {
      const rejected = /reject|deni|declin|fail/i.test(d.label ?? '')
      const isPlainEnd = !d.label || d.label.toLowerCase() === 'end'
      return {
        id: node.id,
        type: 'decision',
        title: isPlainEnd
          ? rejected
            ? 'Application not approved'
            : 'You are approved'
          : d.label,
        subtitle: rejected
          ? 'Unfortunately we could not approve your application.'
          : 'Your application has been approved.',
        allowBack: false,
        copy: { submitLabel: 'Done' },
        uiConfig: { variant: rejected ? 'rejected' : 'approved' },
        fields: [],
      }
    }
    case 'webhook': {
      // External SDK / redirect node — auto-detect provider from label for preview variant
      const lbl = (d.label ?? '').toLowerCase()
      const variant = lbl.includes('digi') ? 'digilocker'
        : lbl.includes('hyper') || lbl.includes('selfie') || lbl.includes('face') ? 'selfie'
        : lbl.includes('nach') || lbl.includes('enach') ? 'enach'
        : 'external'
      return {
        id: node.id,
        type: 'form',
        title: d.label || 'External SDK',
        allowBack: false,
        copy: { submitLabel: 'Continue' },
        uiConfig: { variant },
        fields: [],
      }
    }
    case 'task':
    case 'wait': // backward compat
      return {
        id: node.id,
        type: 'decision',
        title: d.label || 'Awaiting Approval',
        subtitle: `Assigned to ${d.assignedRole ?? 'credit officer'} — SLA ${d.dueHours ?? 24}h`,
        allowBack: false,
        copy: { submitLabel: 'Continue' },
        uiConfig: { variant: 'awaiting' },
        fields: [],
      }
    case 'flow_connector':
    case 'connector': // backward compat
      return null  // transparent sub-flow — no UI step
    default:
      // start, api_request, api, edge_operation, condition, policy_engine, policy → no rendered step (walked through server-side)
      return null
  }
}

/**
 * Walks the graph from the start node along the happy path (taking the "true"
 * branch at conditions) and produces an ordered list of runtime steps. Returns
 * null when there's no reachable UI step (e.g. nothing wired to Start) so the
 * caller can fall back to the canned demo.
 */
export function compileFlow(nodes: CompileNode[], edges: CompileEdge[]): RuntimeFlow | null {
  const start = nodes.find((n) => n.data.nodeType === 'start')
  if (!start) return null

  const byId = new Map(nodes.map((n) => [n.id, n]))
  const outgoing = new Map<string, CompileEdge[]>()
  for (const e of edges) {
    const arr = outgoing.get(e.source)
    if (arr) arr.push(e)
    else outgoing.set(e.source, [e])
  }

  const order: string[] = []
  const steps: Record<string, StepDefinition> = {}
  const visited = new Set<string>()
  let current: CompileNode | undefined = start
  let guard = 0

  while (current && guard++ < 200) {
    if (visited.has(current.id)) break
    visited.add(current.id)

    const step = buildStep(current, order.length)
    if (step) {
      steps[step.id] = step
      order.push(step.id)
      if (current.data.nodeType === 'end') break
    }

    const outs = outgoing.get(current.id) ?? []
    if (outs.length === 0) break
    let chosen = outs[0]
    if (current.data.nodeType === 'condition' || current.data.nodeType === 'edge_operation') {
      chosen = outs.find((e) => e.sourceHandle === 'true') ?? outs[0]
    }
    current = byId.get(chosen.target)
  }

  if (order.length === 0) return null
  return { order, steps }
}

// ─── Registry shared with the MSW handlers (same page JS context) ───────────────

const flows = new Map<string, RuntimeFlow>()
const stepIndex = new Map<string, StepDefinition>()

/** Compile + register a graph so the MSW runtime serves it for `flowId`. */
export function registerRuntimeFlow(
  flowId: string,
  nodes: CompileNode[],
  edges: CompileEdge[]
): RuntimeFlow | null {
  const flow = compileFlow(nodes, edges)
  if (!flow) {
    flows.delete(flowId)
    return null
  }
  flows.set(flowId, flow)
  for (const id of flow.order) stepIndex.set(id, flow.steps[id])
  return flow
}

export function getRuntimeFlow(flowId: string): RuntimeFlow | undefined {
  return flows.get(flowId)
}

export function getRuntimeStep(stepId: string): StepDefinition | undefined {
  return stepIndex.get(stepId)
}

/** Compile a single node to a StepDefinition for instant step preview (no session needed). */
export function compileSingleNode(node: { id: string; data: WorkflowNodeData }): StepDefinition | null {
  return buildStep(node, 1)
}
