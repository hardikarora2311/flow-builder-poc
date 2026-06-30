// ─── Engine State ────────────────────────────────────────────────────────────

export type EngineState =
  | 'idle'
  | 'loading'
  | 'active'
  | 'submitting'
  | 'complete'
  | 'error'

// ─── Variable context (used by interpolate() utility) ────────────────────────

export interface VariableContext {
  init: Record<string, unknown>
  context: Record<string, Record<string, unknown>>
  response: Record<string, unknown>
  session: { sessionId: string; flowId: string; tenantId: string }
}

// ─── Config ──────────────────────────────────────────────────────────────────

export interface StepOverrideProps {
  step: StepDefinition
  isSubmitting: boolean
  onSubmit: (data: Record<string, unknown>) => void
  onBack: () => void
}

export interface FlowConfig {
  flowId: string
  sessionToken: string
  apiBaseUrl: string
  theme?: Partial<ThemeConfig>
  onComplete?: (result: FlowResult) => void
  onError?: (error: FlowError) => void
  // DX extensions
  initialData?: Record<string, unknown>
  getRefreshedToken?: () => Promise<string>
  onStepChange?: (step: StepDefinition, session: FlowSession) => void
  stepOverrides?: Record<string, unknown>
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

export type StepType = 'form' | 'otp' | 'document' | 'decision' | 'loading' | 'complete' | 'sub-flow'

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
  // Polling (task/loading steps)
  pollingInterval?: number
  pollingTimeout?: number
  // Sub-flow (flow_connector steps)
  childFlowId?: string
  inputMap?: string
  outputMap?: string
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
  // Universal step display — apply to any UI-producing node
  subtitle?: string       // supporting text shown below the title
  allowBack?: boolean     // show/hide back button (overrides flow-compiler index heuristic)
  submitLabel?: string    // CTA button text (overrides hardcoded defaults)
  backLabel?: string      // back button text (overrides hardcoded "Back")
  variant?: string        // display variant: 'approved'|'rejected' for end, 'selfie'|'digilocker'|'enach'|'external'|'auto' for webhook, 'credit-offer' for layout
  // Form / web_form node
  stepTitle?: string
  fields?: FieldDefinition[]
  // API / api_request node
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  endpoint?: string
  auth?: 'none' | 'bearer' | 'apikey'
  requestBody?: string
  responseMapping?: string
  /** JSON-string object of header name → value. Values support {{variables}}. */
  headers?: string
  /** JSON-string object of query param name → value. Values support {{variables}}. */
  queryParams?: string
  /** Request timeout in seconds (default 30). */
  timeoutSeconds?: number
  /** Number of automatic retries on transient failures (default 0). */
  retryCount?: number
  /** Backoff strategy between retries. */
  retryBackoff?: 'none' | 'linear' | 'exponential'
  /** Comma-separated HTTP status codes that trigger a retry (e.g. "502,503,504"). */
  retryOnStatusCodes?: string
  /** Mock JSON response used when the SDK runs in sandbox mode. */
  mockResponse?: string
  /** Optional connection ID (saved credentials in the platform). Replaces inline auth. */
  connectionId?: string
  // Condition / edge_operation node
  condition?: string
  trueLabel?: string
  falseLabel?: string
  // Webhook node — three distinct modes
  /** Discriminates between external redirect, SDK launch, and incoming webhook listener. */
  webhookMode?: 'redirect' | 'sdk' | 'listener'
  // Redirect mode (DigiLocker, NACH bank portal)
  redirectUrl?: string
  returnUrl?: string
  // SDK launch mode (HyperVerge, Onfido, Jumio)
  sdkProvider?: string
  sdkCredentialsEndpoint?: string
  sdkWorkflowId?: string
  // Listener mode (incoming webhook for NPCI mandate confirmation etc.)
  /** Comma-separated event names this listener accepts (e.g. "mandate.registered,mandate.failed"). */
  expectedEvents?: string
  /** Header name used to verify HMAC signature (e.g. "X-NPCI-Signature"). */
  signatureHeader?: string
  // Legacy single-mode fields (kept for backward compat with existing webhooks)
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
  pollingIntervalSeconds?: number
  pollingTimeoutSeconds?: number
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
