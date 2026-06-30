import type { Edge } from 'reactflow'
import type { WfNode } from './store'

export type IssueSeverity = 'error' | 'warning' | 'info'

export interface ValidationIssue {
  id: string                    // unique key for React rendering
  severity: IssueSeverity
  kind: string                  // for grouping/filtering
  message: string
  nodeId?: string               // for click-to-focus
  edgeId?: string
}

interface ValidateInput {
  nodes: WfNode[]
  edges: Edge[]
  knownFlowIds: string[]        // for flow_connector reference checking
  currentFlowId: string         // to detect self-reference
}

/**
 * Walk the entire graph and surface every structural / semantic issue.
 * Cheap enough to run on every store change.
 */
export function validateWorkflow({ nodes, edges, knownFlowIds, currentFlowId }: ValidateInput): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const nodeById = new Map(nodes.map((n) => [n.id, n]))
  const incoming = new Map<string, Edge[]>()
  const outgoing = new Map<string, Edge[]>()

  for (const e of edges) {
    if (!incoming.has(e.target)) incoming.set(e.target, [])
    if (!outgoing.has(e.source)) outgoing.set(e.source, [])
    incoming.get(e.target)!.push(e)
    outgoing.get(e.source)!.push(e)
  }

  // ── Start node ──────────────────────────────────────────────────────────
  const startNodes = nodes.filter((n) => n.data.nodeType === 'start')
  if (startNodes.length === 0) {
    issues.push({
      id: 'no-start',
      severity: 'error',
      kind: 'structure',
      message: 'Workflow has no Start node — borrowers cannot enter the flow.',
    })
  } else if (startNodes.length > 1) {
    for (const n of startNodes.slice(1)) {
      issues.push({
        id: `multi-start-${n.id}`,
        severity: 'error',
        kind: 'structure',
        message: 'Multiple Start nodes — only one is allowed.',
        nodeId: n.id,
      })
    }
  }

  // ── Per-node checks ─────────────────────────────────────────────────────
  for (const node of nodes) {
    const d = node.data
    const inEdges = incoming.get(node.id) ?? []
    const outEdges = outgoing.get(node.id) ?? []

    // Orphan: no in AND no out (start is allowed to have no incoming)
    if (d.nodeType !== 'start' && inEdges.length === 0 && outEdges.length === 0) {
      issues.push({
        id: `orphan-${node.id}`,
        severity: 'warning',
        kind: 'orphan',
        message: `"${d.label || node.id}" has no connections — it will never run.`,
        nodeId: node.id,
      })
      continue
    }

    // Start without outgoing
    if (d.nodeType === 'start' && outEdges.length === 0) {
      issues.push({
        id: `start-no-out-${node.id}`,
        severity: 'error',
        kind: 'wiring',
        message: 'Start node has no outgoing edge — nothing happens after entry.',
        nodeId: node.id,
      })
    }

    // End with outgoing — allowed only if ALL outgoing edges are explicit retry/continue paths
    // (a common pattern for failure states like AADHAAR_FAILED that offer a recovery action).
    if (d.nodeType === 'end' && outEdges.length > 0) {
      const allRetryLabeled = outEdges.every((e) => {
        const lbl = typeof e.label === 'string' ? e.label : ''
        return /retry|continue|resume|back/i.test(lbl)
      })
      if (!allRetryLabeled) {
        issues.push({
          id: `end-has-out-${node.id}`,
          severity: 'error',
          kind: 'wiring',
          message: `End node "${d.label || node.id}" has outgoing edges — should be terminal. (Tip: label the edge "Retry…" if it's a recovery path.)`,
          nodeId: node.id,
        })
      }
    }

    // Non-end nodes with no outgoing edge — but allow:
    //  - polling tasks (SDK advances them via /sessions/poll, not via a graph edge).
    //    Task nodes default to polling=3s in flow-compiler when the field is unset,
    //    so we mirror that default here. A polling=0 task is the explicit opt-out.
    //  - flow_connector (next step decided by parent flow after child completes).
    if (d.nodeType !== 'end' && d.nodeType !== 'start' && outEdges.length === 0) {
      const isPollingTask =
        (d.nodeType === 'task' || d.nodeType === 'wait') &&
        (d.pollingIntervalSeconds ?? 3) > 0
      const isSubFlow = d.nodeType === 'flow_connector' || d.nodeType === 'connector'

      if (!isPollingTask && !isSubFlow) {
        issues.push({
          id: `dead-end-${node.id}`,
          severity: 'error',
          kind: 'wiring',
          message: `"${d.label || node.id}" has no outgoing edge — flow stalls here.`,
          nodeId: node.id,
        })
      }
    }

    // edge_operation needs both true and false branches
    if (d.nodeType === 'edge_operation' || d.nodeType === 'condition') {
      const hasTrue = outEdges.some((e) => e.sourceHandle === 'true')
      const hasFalse = outEdges.some((e) => e.sourceHandle === 'false')
      if (!hasTrue) {
        issues.push({
          id: `cond-no-true-${node.id}`,
          severity: 'error',
          kind: 'wiring',
          message: `Condition "${d.label || node.id}" has no TRUE branch — the green handle is unwired.`,
          nodeId: node.id,
        })
      }
      if (!hasFalse) {
        issues.push({
          id: `cond-no-false-${node.id}`,
          severity: 'warning',
          kind: 'wiring',
          message: `Condition "${d.label || node.id}" has no FALSE branch — the red handle is unwired.`,
          nodeId: node.id,
        })
      }
      if (!d.condition || !d.condition.trim()) {
        issues.push({
          id: `cond-empty-${node.id}`,
          severity: 'error',
          kind: 'config',
          message: `Condition "${d.label || node.id}" has no expression to evaluate.`,
          nodeId: node.id,
        })
      }
    }

    // api_request — endpoint required + retry/timeout sanity
    if (d.nodeType === 'api_request' || d.nodeType === 'api') {
      if (!d.endpoint || !d.endpoint.trim()) {
        issues.push({
          id: `api-no-endpoint-${node.id}`,
          severity: 'error',
          kind: 'config',
          message: `API node "${d.label || node.id}" has no endpoint configured.`,
          nodeId: node.id,
        })
      }
      // Timeout sanity
      const timeout = d.timeoutSeconds ?? 30
      if (timeout < 1 || timeout > 600) {
        issues.push({
          id: `api-timeout-${node.id}`,
          severity: 'warning',
          kind: 'config',
          message: `API "${d.label || node.id}" timeout ${timeout}s is outside the typical 1-600s range.`,
          nodeId: node.id,
        })
      }
      // Retry count sanity
      const retries = d.retryCount ?? 0
      if (retries > 5) {
        issues.push({
          id: `api-retries-${node.id}`,
          severity: 'warning',
          kind: 'config',
          message: `API "${d.label || node.id}" has ${retries} retries — high count can cascade load on the upstream service.`,
          nodeId: node.id,
        })
      }
      // Validate retry status codes are numeric
      if (d.retryOnStatusCodes) {
        const codes = d.retryOnStatusCodes.split(',').map((s) => s.trim()).filter(Boolean)
        const bad = codes.filter((c) => !/^\d{3}$/.test(c))
        if (bad.length > 0) {
          issues.push({
            id: `api-retry-codes-${node.id}`,
            severity: 'error',
            kind: 'config',
            message: `API "${d.label || node.id}" retry codes ${bad.join(', ')} are not valid 3-digit HTTP status codes.`,
            nodeId: node.id,
          })
        }
      }
      // Validate JSON-shaped fields parse cleanly
      for (const [field, raw] of [
        ['headers', d.headers],
        ['queryParams', d.queryParams],
        ['mockResponse', d.mockResponse],
      ] as Array<[string, string | undefined]>) {
        if (raw && raw.trim()) {
          try { JSON.parse(raw) } catch {
            issues.push({
              id: `api-${field}-${node.id}`,
              severity: 'error',
              kind: 'config',
              message: `API "${d.label || node.id}" ${field} is not valid JSON.`,
              nodeId: node.id,
            })
          }
        }
      }
    }

    // flow_connector checks
    if (d.nodeType === 'flow_connector' || d.nodeType === 'connector') {
      if (!d.flowId || !d.flowId.trim()) {
        issues.push({
          id: `subflow-no-id-${node.id}`,
          severity: 'error',
          kind: 'config',
          message: `Flow Connector "${d.label || node.id}" has no target flow ID.`,
          nodeId: node.id,
        })
      } else {
        if (d.flowId === currentFlowId) {
          issues.push({
            id: `subflow-self-${node.id}`,
            severity: 'warning',
            kind: 'config',
            message: `Flow Connector "${d.label || node.id}" references its own flow — infinite loop risk.`,
            nodeId: node.id,
          })
        } else if (knownFlowIds.length > 0 && !knownFlowIds.includes(d.flowId)) {
          issues.push({
            id: `subflow-unknown-${node.id}`,
            severity: 'error',
            kind: 'reference',
            message: `Flow Connector references unknown flow "${d.flowId}".`,
            nodeId: node.id,
          })
        }
      }
    }

    // webhook — mode-specific required fields
    if (d.nodeType === 'webhook') {
      const mode = d.webhookMode ?? 'redirect'
      if (mode === 'redirect') {
        const url = d.redirectUrl || d.webhookUrl
        if (!url || !url.trim()) {
          issues.push({
            id: `webhook-no-redirect-${node.id}`,
            severity: 'error',
            kind: 'config',
            message: `Redirect webhook "${d.label || node.id}" has no redirect URL.`,
            nodeId: node.id,
          })
        }
      }
      if (mode === 'sdk') {
        if (!d.sdkProvider || !d.sdkProvider.trim()) {
          issues.push({
            id: `webhook-no-sdk-provider-${node.id}`,
            severity: 'error',
            kind: 'config',
            message: `SDK webhook "${d.label || node.id}" has no provider configured.`,
            nodeId: node.id,
          })
        }
        if (!d.sdkCredentialsEndpoint || !d.sdkCredentialsEndpoint.trim()) {
          issues.push({
            id: `webhook-no-sdk-creds-${node.id}`,
            severity: 'warning',
            kind: 'config',
            message: `SDK webhook "${d.label || node.id}" has no credentials endpoint — the SDK won't get an auth token.`,
            nodeId: node.id,
          })
        }
      }
      if (mode === 'listener') {
        if (!d.expectedEvents || !d.expectedEvents.trim()) {
          issues.push({
            id: `webhook-no-events-${node.id}`,
            severity: 'warning',
            kind: 'config',
            message: `Listener webhook "${d.label || node.id}" accepts no expected events — all incoming payloads will be rejected.`,
            nodeId: node.id,
          })
        }
        if (!d.webhookSecret || !d.webhookSecret.trim()) {
          issues.push({
            id: `webhook-no-secret-${node.id}`,
            severity: 'warning',
            kind: 'config',
            message: `Listener webhook "${d.label || node.id}" has no HMAC secret — incoming payloads can't be verified.`,
            nodeId: node.id,
          })
        }
      }
    }

    // web_form / document — field validation
    if (d.nodeType === 'web_form' || d.nodeType === 'form' || d.nodeType === 'document') {
      const fields = d.fields ?? []
      if (fields.length === 0 && d.nodeType !== 'document') {
        issues.push({
          id: `form-no-fields-${node.id}`,
          severity: 'warning',
          kind: 'config',
          message: `Form "${d.label || node.id}" has no fields — borrower has nothing to fill.`,
          nodeId: node.id,
        })
      }
      for (const f of fields) {
        if (!f.id || !f.id.trim()) {
          issues.push({
            id: `field-no-id-${node.id}-${f.label}`,
            severity: 'error',
            kind: 'config',
            message: `Field "${f.label}" in "${d.label || node.id}" has no ID.`,
            nodeId: node.id,
          })
        }
        if (!f.label || !f.label.trim()) {
          issues.push({
            id: `field-no-label-${node.id}-${f.id}`,
            severity: 'warning',
            kind: 'config',
            message: `A field in "${d.label || node.id}" has no label.`,
            nodeId: node.id,
          })
        }
        if (f.type === 'select' && (!f.options || f.options.length === 0)) {
          issues.push({
            id: `field-no-options-${node.id}-${f.id}`,
            severity: 'error',
            kind: 'config',
            message: `Select field "${f.label}" in "${d.label || node.id}" has no options.`,
            nodeId: node.id,
          })
        }
      }
    }

    // OTP node — channel/maxAttempts sanity
    if (d.nodeType === 'otp') {
      if (d.maxAttempts !== undefined && (d.maxAttempts < 1 || d.maxAttempts > 10)) {
        issues.push({
          id: `otp-attempts-${node.id}`,
          severity: 'warning',
          kind: 'config',
          message: `OTP "${d.label || node.id}" max attempts is ${d.maxAttempts} — recommended 3-5.`,
          nodeId: node.id,
        })
      }
    }

    // task / wait — polling sanity
    if (d.nodeType === 'task' || d.nodeType === 'wait') {
      const interval = d.pollingIntervalSeconds ?? 3
      const timeout = d.pollingTimeoutSeconds ?? 120
      if (interval > timeout) {
        issues.push({
          id: `poll-interval-${node.id}`,
          severity: 'error',
          kind: 'config',
          message: `Task "${d.label || node.id}" polling interval (${interval}s) exceeds timeout (${timeout}s) — will never check.`,
          nodeId: node.id,
        })
      }
    }
  }

  // ── Reachability: every non-start node should be reachable from start ───
  if (startNodes.length > 0) {
    const start = startNodes[0]!
    const reachable = new Set<string>([start.id])
    const queue: string[] = [start.id]
    while (queue.length > 0) {
      const cur = queue.shift()!
      for (const e of outgoing.get(cur) ?? []) {
        if (!reachable.has(e.target)) {
          reachable.add(e.target)
          queue.push(e.target)
        }
      }
    }
    for (const node of nodes) {
      if (!reachable.has(node.id) && node.data.nodeType !== 'start') {
        // Skip if already flagged as orphan
        if (issues.some((i) => i.nodeId === node.id && i.kind === 'orphan')) continue
        issues.push({
          id: `unreachable-${node.id}`,
          severity: 'warning',
          kind: 'reachability',
          message: `"${node.data.label || node.id}" is unreachable from the Start node.`,
          nodeId: node.id,
        })
      }
    }
  }

  // Sort: errors first, then warnings, then info
  const order: Record<IssueSeverity, number> = { error: 0, warning: 1, info: 2 }
  issues.sort((a, b) => order[a.severity] - order[b.severity])

  return issues
}
