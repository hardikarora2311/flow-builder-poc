import type { NodeType, WorkflowNodeData } from '@platform/core'

export interface NodeMeta {
  type: NodeType
  label: string
  icon: string
  accent: string
  description: string
}

/** Palette catalogue — the node types an admin can drop on the canvas. */
export const NODE_CATALOG: NodeMeta[] = [
  { type: 'start',          label: 'Start',          icon: '▶',  accent: '#16a34a', description: 'Entry point of the flow' },
  { type: 'web_form',       label: 'Web Form',        icon: '⊕',  accent: '#2563eb', description: 'Collect user input or show a page layout' },
  { type: 'api_request',    label: 'API Request',     icon: '☁',  accent: '#db2777', description: 'Server-side HTTP call to an external API' },
  { type: 'layout',         label: 'Layout',          icon: '⊞',  accent: '#7c3aed', description: 'Result / info page with elements' },
  { type: 'policy_engine',  label: 'Policy Engine',   icon: '⚖',  accent: '#d97706', description: 'Evaluate BRE policy — PASS or FAIL' },
  { type: 'task',           label: 'Task',            icon: '👤', accent: '#92400e', description: 'Manual approval task for credit officer' },
  { type: 'flow_connector', label: 'Flow Connector',  icon: '⇄',  accent: '#0891b2', description: 'Link to a child sub-flow' },
  { type: 'edge_operation', label: 'Edge Operation',  icon: '◇',  accent: '#64748b', description: 'Pure routing — no config, edges only' },
  { type: 'webhook',        label: 'Webhook',         icon: '📡', accent: '#ea580c', description: 'External SDK / webhook callback' },
  { type: 'end',            label: 'End',             icon: '⏹', accent: '#dc2626', description: 'Terminal state' },
]

// Internal-only types not in the palette but still renderable on the canvas
const INTERNAL_META: NodeMeta[] = [
  { type: 'otp',      label: 'OTP',      icon: '🔑', accent: '#7c3aed', description: 'OTP verification' },
  { type: 'document', label: 'Document', icon: '📄', accent: '#0891b2', description: 'Document upload' },
]

export const NODE_META: Record<NodeType, NodeMeta> = Object.fromEntries(
  [...NODE_CATALOG, ...INTERNAL_META].map((m) => [m.type, m])
) as Record<NodeType, NodeMeta>

/** Sensible default data for a freshly-dropped node. */
export function createDefaultNodeData(type: NodeType): WorkflowNodeData {
  const meta = NODE_META[type]
  const base: WorkflowNodeData = { label: meta.label, nodeType: type }

  switch (type) {
    case 'web_form':
    case 'form':
      return {
        ...base,
        stepTitle: 'New form step',
        subtitle: '',
        allowBack: true,
        submitLabel: 'Continue',
        backLabel: 'Back',
        fields: [
          {
            id: 'field_1',
            type: 'text',
            label: 'Field label',
            placeholder: '',
            required: true,
            validation: [{ type: 'required', message: 'This field is required' }],
          },
        ],
      }
    case 'otp':
      return {
        ...base,
        channel: 'sms',
        maxAttempts: 3,
        subtitle: 'Enter the 6-digit code we sent you',
        allowBack: true,
        submitLabel: 'Verify OTP',
        backLabel: 'Back',
      }
    case 'document':
      return {
        ...base,
        subtitle: '',
        allowBack: true,
        submitLabel: 'Continue',
        backLabel: 'Back',
        fields: [],
      }
    case 'api_request':
    case 'api':
      return { ...base, method: 'POST', endpoint: 'https://api.example.com/resource', auth: 'bearer' }
    case 'edge_operation':
    case 'condition':
      return { ...base, condition: 'value == true', trueLabel: 'Yes', falseLabel: 'No' }
    case 'webhook':
      return { ...base, variant: 'auto', webhookUrl: 'https://example.com/webhook', submitLabel: 'Continue' }
    case 'flow_connector':
    case 'connector':
      return { ...base, label: 'Flow Connector', flowId: '' }
    case 'policy_engine':
    case 'policy':
      return { ...base, policyId: '' }
    case 'task':
    case 'wait':
      return { ...base, assignedRole: 'credit_officer', dueHours: 24, subtitle: '', pollingIntervalSeconds: 3, pollingTimeoutSeconds: 120 }
    case 'layout':
      return {
        ...base,
        label: 'Layout',
        stepTitle: '',
        subtitle: '',
        submitLabel: 'Continue',
        variant: 'approved',
      }
    case 'end':
      return { ...base, variant: 'approved', subtitle: '' }
    default:
      return base
  }
}
