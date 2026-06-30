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
  // allowBack: use explicit node setting if set, otherwise fall back to position heuristic
  const allowBack = d.allowBack ?? (index > 0)

  switch (d.nodeType) {
    case 'web_form':
    case 'form':
      return {
        id: node.id,
        type: 'form',
        title: d.stepTitle || d.label || 'Form',
        subtitle: d.subtitle || '',
        allowBack,
        copy: { submitLabel: d.submitLabel || 'Continue', backLabel: d.backLabel || 'Back' },
        uiConfig: {},
        fields: d.fields ?? [],
      }
    case 'layout': {
      // Parse preview values from requestBody JSON
      let kfs: Record<string, string> | undefined
      try { if (d.requestBody) kfs = JSON.parse(d.requestBody) } catch { /* ignore */ }

      // Explicit variant wins; fall back to heuristic on title/label
      const resolvedVariant = d.variant && d.variant !== 'auto'
        ? d.variant
        : /offer|approv|credit/i.test(d.stepTitle ?? d.label ?? '') ? 'credit-offer' : 'approved'

      const isOffer = resolvedVariant === 'credit-offer'
      return {
        id: node.id,
        type: isOffer ? 'form' : 'decision',
        title: d.stepTitle || d.label || 'Layout',
        subtitle: d.subtitle || '',
        allowBack: false,
        copy: { submitLabel: d.submitLabel || 'Continue' },
        uiConfig: isOffer ? { variant: 'credit-offer', ...(kfs ? { kfs } : {}) } : { variant: resolvedVariant },
        fields: [],
      }
    }
    case 'document':
      return {
        id: node.id,
        type: 'form',
        title: d.label || 'Upload document',
        subtitle: d.subtitle || '',
        allowBack,
        copy: { submitLabel: d.submitLabel || 'Continue', backLabel: d.backLabel || 'Back' },
        uiConfig: {},
        fields: d.fields ?? [
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
        title: d.label || 'Verify your mobile number',
        subtitle: d.subtitle || 'Enter the 6-digit code we sent you',
        allowBack,
        copy: { submitLabel: d.submitLabel || 'Verify OTP', backLabel: d.backLabel || 'Back' },
        uiConfig: {},
        fields: [],
      }
    case 'end': {
      // Explicit variant wins; fall back to label heuristic
      const endVariant = d.variant ?? (/reject|deni|declin|fail/i.test(d.label ?? '') ? 'rejected' : 'approved')
      const isPlainEnd = !d.label || d.label.toLowerCase() === 'end'
      const autoTitle = endVariant === 'rejected' ? 'Application not approved' : 'You are approved'
      const autoSubtitle = endVariant === 'rejected'
        ? 'Unfortunately we could not approve your application.'
        : 'Your application has been approved.'
      return {
        id: node.id,
        type: 'decision',
        title: isPlainEnd ? autoTitle : d.label,
        subtitle: d.subtitle || autoSubtitle,
        allowBack: false,
        copy: { submitLabel: d.submitLabel || 'Done' },
        uiConfig: { variant: endVariant },
        fields: [],
      }
    }
    case 'webhook': {
      // Explicit variant wins; fall back to label keyword detection
      let webhookVariant: string
      if (d.variant && d.variant !== 'auto') {
        webhookVariant = d.variant
      } else {
        const lbl = (d.label ?? '').toLowerCase()
        webhookVariant = lbl.includes('digi') ? 'digilocker'
          : lbl.includes('hyper') || lbl.includes('selfie') || lbl.includes('face') ? 'selfie'
          : lbl.includes('nach') || lbl.includes('enach') ? 'enach'
          : 'external'
      }
      return {
        id: node.id,
        type: 'form',
        title: d.label || 'External SDK',
        subtitle: d.subtitle || '',
        allowBack: false,
        copy: { submitLabel: d.submitLabel || 'Continue' },
        uiConfig: { variant: webhookVariant },
        fields: [],
      }
    }
    case 'task':
    case 'wait':
      return {
        id: node.id,
        type: 'loading',
        title: d.label || 'Awaiting Approval',
        subtitle: d.subtitle || `Assigned to ${d.assignedRole ?? 'credit officer'} — SLA ${d.dueHours ?? 24}h`,
        allowBack: false,
        copy: { submitLabel: '' },
        uiConfig: {
          variant: 'awaiting',
          pollingInterval: d.pollingIntervalSeconds ?? 3,
          pollingTimeout: d.pollingTimeoutSeconds ?? 120,
        },
        fields: [],
      }
    case 'flow_connector':
    case 'connector':
      return {
        id: node.id,
        type: 'sub-flow',
        title: d.label || 'Sub-flow',
        subtitle: d.subtitle || '',
        allowBack: false,
        copy: { submitLabel: '' },
        uiConfig: {
          childFlowId: d.flowId ?? '',
          inputMap: d.inputMap ?? '',
          outputMap: d.outputMap ?? '',
        },
        fields: [],
      }
    default:
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

// ─── Variable introspection ───────────────────────────────────────────────────

export interface VariableGroup {
  token: string   // e.g. "{{context.n-email-form.email}}"
  label: string   // human-readable label
  hint: string    // which step/source it comes from
  namespace: 'init' | 'context' | 'session' | 'response'
}

/**
 * Returns all {{variables}} available at the point in the graph where
 * targetNodeId is reached — i.e. only form fields from preceding steps.
 * Also includes universal variables (session, response).
 */
export function getAvailableVariables(
  nodes: CompileNode[],
  edges: CompileEdge[],
  targetNodeId: string
): VariableGroup[] {
  const result: VariableGroup[] = []

  // Walk the happy path up to (but not including) targetNodeId
  const flow = compileFlow(nodes, edges)
  if (flow) {
    const targetIdx = flow.order.indexOf(targetNodeId)
    const priorStepIds = targetIdx >= 0 ? flow.order.slice(0, targetIdx) : flow.order

    for (const stepId of priorStepIds) {
      const step = flow.steps[stepId]
      if (!step || step.type !== 'form') continue
      for (const field of step.fields) {
        result.push({
          token: `{{context.${stepId}.${field.id}}}`,
          label: field.label,
          hint: `From "${step.title}" (${stepId})`,
          namespace: 'context',
        })
      }
    }
  }

  // Universal session variables
  result.push(
    { token: '{{session.sessionId}}', label: 'Session ID',  hint: 'Current session identifier',  namespace: 'session' },
    { token: '{{session.flowId}}',    label: 'Flow ID',     hint: 'Current flow identifier',      namespace: 'session' },
    { token: '{{session.tenantId}}',  label: 'Tenant ID',   hint: 'Tenant identifier',            namespace: 'session' },
  )

  // Common response variables
  result.push(
    { token: '{{response.nextState}}',    label: 'Next state',    hint: 'State returned by last transition', namespace: 'response' },
    { token: '{{response.currentState}}', label: 'Current state', hint: 'State from getCurrentState()',      namespace: 'response' },
    { token: '{{response.graphId}}',      label: 'Graph ID',      hint: 'State machine graph identifier',    namespace: 'response' },
    { token: '{{response.version}}',      label: 'Version',       hint: 'State machine version',             namespace: 'response' },
  )

  // initialData variables (user-defined — show placeholder)
  result.push(
    { token: '{{init.userId}}',   label: 'User ID',      hint: 'From initialData passed at SDK init', namespace: 'init' },
    { token: '{{init.mobile}}',   label: 'Mobile',       hint: 'From initialData passed at SDK init', namespace: 'init' },
    { token: '{{init.pan}}',      label: 'PAN',          hint: 'From initialData passed at SDK init', namespace: 'init' },
    { token: '{{init.email}}',    label: 'Email',        hint: 'From initialData passed at SDK init', namespace: 'init' },
    { token: '{{init.flowToken}}',label: 'Flow Token',   hint: 'From initialData passed at SDK init', namespace: 'init' },
  )

  return result
}
