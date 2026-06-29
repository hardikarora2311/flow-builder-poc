// ─── Engine State ────────────────────────────────────────────────────────────

export type EngineState =
  | 'idle'
  | 'loading'
  | 'active'
  | 'submitting'
  | 'complete'
  | 'error'

// ─── Config ──────────────────────────────────────────────────────────────────

export interface FlowConfig {
  flowId: string
  sessionToken: string
  apiBaseUrl: string
  theme?: Partial<ThemeConfig>
  onComplete?: (result: FlowResult) => void
  onError?: (error: FlowError) => void
}

// ─── Session ─────────────────────────────────────────────────────────────────

export interface FlowSession {
  sessionId: string
  flowId: string
  tenantId: string
  currentStepId: string
  context: Record<string, unknown>
  startedAt: string
}

export interface SessionTokenPayload {
  sessionId: string
  tenantId: string
  flowId: string
  userId: string
  iat: number
  exp: number
  themeHash: string
  themeCore: {
    primary: string
    background: string
    fontFamily: string
    borderRadiusButton: string
  }
}

// ─── Steps ───────────────────────────────────────────────────────────────────

export type StepType = 'form' | 'otp' | 'document' | 'decision' | 'loading' | 'complete'

export interface StepDefinition {
  id: string
  type: StepType
  title: string
  subtitle?: string
  fields: FieldDefinition[]
  uiConfig: StepUIConfig
  allowBack: boolean
  copy: {
    submitLabel: string
    backLabel?: string
  }
}

export interface StepUIConfig {
  layout?: 'default' | 'centered' | 'split'
  illustration?: string
  variant?: string
  kfs?: Record<string, string>
}

// ─── Fields ──────────────────────────────────────────────────────────────────

export type FieldType = 'text' | 'phone' | 'email' | 'date' | 'select' | 'file' | 'checkbox'

export interface FieldDefinition {
  id: string
  type: FieldType
  label: string
  placeholder?: string
  required: boolean
  validation: ValidationRule[]
  options?: SelectOption[]
}

export interface SelectOption {
  label: string
  value: string
}

export interface ValidationRule {
  type: 'required' | 'minLength' | 'maxLength' | 'pattern' | 'phone'
  value?: string | number
  message: string
}

// ─── Theme ───────────────────────────────────────────────────────────────────

export interface ThemeConfig {
  colors: {
    primary: string
    secondary: string
    background: string
    surface: string
    text: string
    textMuted: string
    error: string
    success: string
  }
  typography: {
    fontFamily: string
    baseFontSize: string
    headingWeight: '500' | '600' | '700'
  }
  spacing: {
    containerMaxWidth: string
    containerPadding: string
    fieldGap: string
  }
  borderRadius: {
    button: string
    input: string
    card: string
  }
  logo?: {
    url: string
    position: 'left' | 'center'
  }
}

export const DEFAULT_THEME: ThemeConfig = {
  colors: {
    primary: '#2563EB',
    secondary: '#64748B',
    background: '#FFFFFF',
    surface: '#F8FAFC',
    text: '#111827',
    textMuted: '#6B7280',
    error: '#DC2626',
    success: '#16A34A',
  },
  typography: {
    fontFamily: 'system-ui, -apple-system, sans-serif',
    baseFontSize: '16px',
    headingWeight: '600',
  },
  spacing: {
    containerMaxWidth: '480px',
    containerPadding: '24px',
    fieldGap: '16px',
  },
  borderRadius: {
    button: '8px',
    input: '8px',
    card: '12px',
  },
}

// ─── Workflow Graph ───────────────────────────────────────────────────────────

export type NodeType =
  | 'start'
  | 'end'
  | 'web_form'
  | 'api_request'
  | 'layout'
  | 'policy_engine'
  | 'task'
  | 'flow_connector'
  | 'edge_operation'
  | 'webhook'
  | 'otp'
  | 'document'
  // backward compat aliases
  | 'form'
  | 'api'
  | 'condition'
  | 'connector'
  | 'policy'
  | 'wait'

export interface WorkflowNodeData {
  label: string
  nodeType: NodeType
  // Form / web_form node
  stepTitle?: string
  fields?: FieldDefinition[]
  // API / api_request node
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  endpoint?: string
  auth?: 'none' | 'bearer' | 'apikey'
  requestBody?: string
  responseMapping?: string
  // Condition / edge_operation node
  condition?: string
  trueLabel?: string
  falseLabel?: string
  // Webhook node
  webhookUrl?: string
  webhookSecret?: string
  // OTP node
  channel?: 'sms' | 'email'
  maxAttempts?: number
  // Policy engine node
  policyId?: string
  // Task node
  assignedRole?: string
  dueHours?: number
  // Flow connector node
  flowId?: string
  inputMap?: string
  outputMap?: string
  // Layout node
  elements?: unknown[]
}

export interface WorkflowDefinition {
  id: string
  name: string
  tenantId: string
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
  theme: ThemeConfig
  status: 'draft' | 'published'
  createdAt: string
  updatedAt: string
}

export interface WorkflowNode {
  id: string
  type: NodeType
  position: { x: number; y: number }
  data: WorkflowNodeData
}

export interface WorkflowEdge {
  id: string
  source: string
  target: string
  sourceHandle?: string | null
  label?: string
}

// ─── Results & Errors ────────────────────────────────────────────────────────

export interface FlowResult {
  sessionId: string
  completedAt: string
  data: Record<string, unknown>
}

export interface FlowError {
  code: string
  message: string
  retryable: boolean
  fieldErrors?: Record<string, string>
}

// ─── Events ──────────────────────────────────────────────────────────────────

// Declared as a `type` (not `interface`) so it satisfies the
// `Record<string, unknown>` constraint on EventEmitter — interfaces don't
// get an implicit index signature, type aliases of object literals do.
export type FlowEngineEvents = {
  stateChange: { from: EngineState; to: EngineState }
  stepChange: { step: StepDefinition; session: FlowSession }
  complete: { result: FlowResult }
  error: { error: Error; context: string; retryable: boolean }
}
