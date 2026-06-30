import { http, HttpResponse } from 'msw'
import type {
  FieldDefinition,
  FlowSession,
  StepDefinition,
  ThemeConfig,
  WorkflowDefinition,
} from '@platform/core'
import { DEFAULT_THEME } from '@platform/core'
import { getRuntimeFlow, getRuntimeStep, registerRuntimeFlow } from '@/lib/flow-compiler'

const BASE = '/mock-api'

// Shared KYC fields — used by both the seeded demo node and the canned step.
const KYC_FIELDS: FieldDefinition[] = [
  {
    id: 'fullName',
    type: 'text',
    label: 'Full name',
    placeholder: 'As per PAN card',
    required: true,
    validation: [
      { type: 'required', message: 'Full name is required' },
      { type: 'minLength', value: 3, message: 'Name must be at least 3 characters' },
    ],
  },
  {
    id: 'pan',
    type: 'text',
    label: 'PAN number',
    placeholder: 'ABCDE1234F',
    required: true,
    validation: [
      { type: 'required', message: 'PAN is required' },
      { type: 'pattern', value: '[A-Z]{5}[0-9]{4}[A-Z]{1}', message: 'Invalid PAN format' },
    ],
  },
  {
    id: 'phone',
    type: 'phone',
    label: 'Mobile number',
    placeholder: '+91 98765 43210',
    required: true,
    validation: [
      { type: 'required', message: 'Mobile number is required' },
      { type: 'phone', message: 'Invalid mobile number' },
    ],
  },
  {
    id: 'income',
    type: 'select',
    label: 'Annual income',
    required: true,
    validation: [{ type: 'required', message: 'Please select your income range' }],
    options: [
      { label: '₹0 – ₹5L', value: '0-5' },
      { label: '₹5L – ₹10L', value: '5-10' },
      { label: '₹10L – ₹25L', value: '10-25' },
      { label: '₹25L+', value: '25+' },
    ],
  },
]

// ─── PICE LOS Journey — fields ────────────────────────────────────────────────

const PICE_THEME: ThemeConfig = {
  colors: {
    primary: '#1741C6',
    secondary: '#4B5563',
    background: '#FAFAFA',
    surface: '#FFFFFF',
    text: '#111827',
    textMuted: '#6B7280',
    error: '#DC2626',
    success: '#064E3B',
  },
  typography: { fontFamily: 'system-ui, -apple-system, sans-serif', baseFontSize: '16px', headingWeight: '600' },
  spacing: { containerMaxWidth: '480px', containerPadding: '24px', fieldGap: '16px' },
  borderRadius: { button: '8px', input: '8px', card: '12px' },
  logo: { url: 'https://pice.one/logo.png', position: 'left' },
}

const BANK_FIELDS: FieldDefinition[] = [
  {
    id: 'accountNumber',
    type: 'text',
    label: 'Account Number',
    placeholder: '000123456789',
    required: true,
    validation: [
      { type: 'required', message: 'Account number is required' },
      { type: 'minLength', value: 9, message: 'Enter a valid account number' },
    ],
  },
  {
    id: 'ifscCode',
    type: 'text',
    label: 'IFSC Code',
    placeholder: 'HDFC0001234',
    required: true,
    validation: [
      { type: 'required', message: 'IFSC code is required' },
      { type: 'pattern', value: '[A-Z]{4}0[A-Z0-9]{6}', message: 'Invalid IFSC format (e.g. HDFC0001234)' },
    ],
  },
  {
    id: 'accountType',
    type: 'select',
    label: 'Account Type',
    required: true,
    validation: [{ type: 'required', message: 'Please select account type' }],
    options: [
      { label: 'Savings', value: 'SAVINGS' },
      { label: 'Current', value: 'CURRENT' },
    ],
  },
]

const KFS_FIELDS: FieldDefinition[] = [
  {
    id: 'termsAccepted',
    type: 'checkbox',
    label: 'I have read and accept the Key Fact Statement (KFS) and loan agreement terms',
    required: true,
    validation: [{ type: 'required', message: 'You must accept the terms to proceed' }],
  },
]

// ─── In-memory workflow store (POC; persists per page load) ────────────────────

const workflows = new Map<string, WorkflowDefinition>()

const now = () => new Date().toISOString()

// Seed a demo workflow (published) so the dashboard and embed demo work
// out of the box.
workflows.set('demo-flow', {
  id: 'demo-flow',
  name: 'Personal Loan KYC',
  tenantId: 'mock-tenant',
  status: 'published',
  theme: DEFAULT_THEME,
  createdAt: now(),
  updatedAt: now(),
  nodes: [
    { id: 'start', type: 'start', position: { x: 80, y: 220 }, data: { label: 'Start', nodeType: 'start' } },
    {
      id: 'kyc-form',
      type: 'web_form',
      position: { x: 400, y: 200 },
      data: {
        label: 'KYC Details',
        nodeType: 'web_form',
        stepTitle: 'Personal Information',
        fields: KYC_FIELDS,
      },
    },
    {
      id: 'otp-verify',
      type: 'otp',
      position: { x: 720, y: 200 },
      data: { label: 'OTP Verification', nodeType: 'otp', channel: 'sms', maxAttempts: 3 },
    },
    {
      id: 'decision',
      type: 'edge_operation',
      position: { x: 1360, y: 200 },
      data: {
        label: 'Credit Check',
        nodeType: 'edge_operation',
        condition: 'creditScore >= 650',
        trueLabel: 'Approved',
        falseLabel: 'Rejected',
      },
    },
    { id: 'approved', type: 'end', position: { x: 1060, y: 100 }, data: { label: 'Approved', nodeType: 'end' } },
    { id: 'rejected', type: 'end', position: { x: 1060, y: 320 }, data: { label: 'Rejected', nodeType: 'end' } },
  ],
  edges: [
    { id: 'e1', source: 'start', target: 'kyc-form' },
    { id: 'e2', source: 'kyc-form', target: 'otp-verify' },
    { id: 'e3', source: 'otp-verify', target: 'decision' },
    { id: 'e4', source: 'decision', target: 'approved', sourceHandle: 'true', label: 'Approved' },
    { id: 'e5', source: 'decision', target: 'rejected', sourceHandle: 'false', label: 'Rejected' },
  ],
})

// ─── OTP Agreement Signing — reusable sub-workflow ────────────────────────────
// This is the "Sign with OTP" concern extracted as a standalone flow.
// Referenced by pice-los-journey via flow_connector node.

workflows.set('otp-signing-flow', {
  id: 'otp-signing-flow',
  name: 'OTP Agreement Signing',
  tenantId: 'mock-tenant',
  status: 'published',
  theme: PICE_THEME,
  createdAt: now(),
  updatedAt: now(),
  nodes: [
    { id: 'otp-sf-start',       type: 'start',          position: { x: 80,   y: 200 }, data: { label: 'Start',                       nodeType: 'start' } },
    { id: 'otp-sf-gen-api',     type: 'api_request',    position: { x: 480,  y: 200 }, data: { label: 'Generate Agreement OTP',       nodeType: 'api_request', method: 'POST', endpoint: '/credit/drawdown/v1/generate_loan_agreement_otp', auth: 'bearer', requestBody: '{"sessionId": "{{init.sessionId}}"}' } },
    { id: 'otp-sf-otp',         type: 'otp',             position: { x: 880,  y: 200 }, data: { label: 'Sign Agreement — OTP',         nodeType: 'otp', channel: 'sms', maxAttempts: 3, subtitle: 'Enter the OTP sent to your registered mobile to digitally sign the loan agreement.' } },
    { id: 'otp-sf-verify-api',  type: 'api_request',    position: { x: 1280, y: 200 }, data: { label: 'Verify Agreement OTP',          nodeType: 'api_request', method: 'POST', endpoint: '/credit/drawdown/v1/verify_loan_agreement_otp', auth: 'bearer' } },
    { id: 'otp-sf-cond',        type: 'edge_operation', position: { x: 1680, y: 200 }, data: { label: 'Signed?',                       nodeType: 'edge_operation', condition: 'data.isAgreementSigned === true', trueLabel: 'Signed', falseLabel: 'Failed' } },
    { id: 'otp-sf-transition',  type: 'api_request',    position: { x: 2080, y: 200 }, data: { label: 'Transition: SANCTION_LETTER',   nodeType: 'api_request', method: 'POST', endpoint: '/credit/loan/v1/transition_state', auth: 'bearer' } },
    { id: 'otp-sf-signed',      type: 'end',             position: { x: 2480, y: 200 }, data: { label: 'Agreement Signed',              nodeType: 'end', variant: 'approved', subtitle: 'Your loan agreement has been signed successfully.' } },
    { id: 'otp-sf-failed',      type: 'end',             position: { x: 1680, y: 520 }, data: { label: 'OTP Verification Failed',       nodeType: 'end', variant: 'rejected', subtitle: 'OTP attempts exhausted. Please contact support.' } },
  ],
  edges: [
    { id: 'otp-e1', source: 'otp-sf-start',      target: 'otp-sf-gen-api' },
    { id: 'otp-e2', source: 'otp-sf-gen-api',    target: 'otp-sf-otp' },
    { id: 'otp-e3', source: 'otp-sf-otp',        target: 'otp-sf-verify-api' },
    { id: 'otp-e4', source: 'otp-sf-verify-api', target: 'otp-sf-cond' },
    { id: 'otp-e5', source: 'otp-sf-cond',       target: 'otp-sf-transition', sourceHandle: 'true',  label: 'Signed' },
    { id: 'otp-e6', source: 'otp-sf-cond',       target: 'otp-sf-failed',     sourceHandle: 'false', label: 'Failed' },
    { id: 'otp-e7', source: 'otp-sf-transition', target: 'otp-sf-signed' },
  ],
})

// Pre-register so the SDK runtime can serve it without builder compile
{
  const wf = workflows.get('otp-signing-flow')!
  registerRuntimeFlow('otp-signing-flow', wf.nodes, wf.edges)
}

// ─── PICE LOS Journey (published) ─────────────────────────────────────────────

workflows.set('pice-los-journey', {
  id: 'pice-los-journey',
  name: 'PICE LOS Journey',
  tenantId: 'mock-tenant',
  status: 'published',
  theme: PICE_THEME,
  createdAt: now(),
  updatedAt: now(),
  nodes: [
    // ── Init ──────────────────────────────────────────────────────────────
    { id: 'n-start',       type: 'start',         position: { x: 80,   y: 200 }, data: { label: 'Start',                          nodeType: 'start' } },
    { id: 'n-get-state',   type: 'api_request',   position: { x: 400,  y: 200 }, data: { label: 'GET Current State',              nodeType: 'api_request',   method: 'GET',  endpoint: '/credit/loan/v1/current_state',    auth: 'bearer' } },
    // ── State router chain — re-entry routing for all StateMachineStates ─────
    // Each node checks one state and branches true→ that step, false→ next router.
    // ── State router chain (x:880, 240px vertical gap) ───────────────────
    { id: 'n-state-router',   type: 'edge_operation', position: { x: 880, y: 200  }, data: { label: 'Route: ADD_EMAIL?',           nodeType: 'edge_operation', condition: 'currentState === "ADD_EMAIL"',            trueLabel: 'ADD_EMAIL',           falseLabel: '→ next' } },
    { id: 'n-router-2',       type: 'edge_operation', position: { x: 880, y: 440  }, data: { label: 'Route: ADD_BANK?',            nodeType: 'edge_operation', condition: 'currentState === "ADD_BANK"',             trueLabel: 'ADD_BANK',            falseLabel: '→ next' } },
    { id: 'n-router-3',       type: 'edge_operation', position: { x: 880, y: 680  }, data: { label: 'Route: OFFER_SCREEN_GROMOR?', nodeType: 'edge_operation', condition: 'currentState === "OFFER_SCREEN_GROMOR"',  trueLabel: 'OFFER_SCREEN_GROMOR', falseLabel: '→ next' } },
    { id: 'n-router-4',       type: 'edge_operation', position: { x: 880, y: 920  }, data: { label: 'Route: SELFIE_INIT?',         nodeType: 'edge_operation', condition: 'currentState === "SELFIE_INITIALISATION"', trueLabel: 'SELFIE_INIT',         falseLabel: '→ next' } },
    { id: 'n-router-5',       type: 'edge_operation', position: { x: 880, y: 1160 }, data: { label: 'Route: ENACH_INITIATION?',    nodeType: 'edge_operation', condition: 'currentState === "ENACH_INITIATION"',     trueLabel: 'ENACH_INITIATION',    falseLabel: '→ next' } },
    { id: 'n-router-6',       type: 'edge_operation', position: { x: 880, y: 1400 }, data: { label: 'Route: WAITING_ENACH?',       nodeType: 'edge_operation', condition: 'currentState === "WAITING_ENACH"',        trueLabel: 'WAITING_ENACH',       falseLabel: '→ next' } },
    { id: 'n-router-7',       type: 'edge_operation', position: { x: 880, y: 1640 }, data: { label: 'Route: SANCTION_LETTER?',     nodeType: 'edge_operation', condition: 'currentState === "SANCTION_LETTER"',      trueLabel: 'SANCTION_LETTER',     falseLabel: '→ next' } },
    { id: 'n-router-8',       type: 'edge_operation', position: { x: 880, y: 1880 }, data: { label: 'Route: PRE_CREDIT_LIVE?',     nodeType: 'edge_operation', condition: 'currentState === "PRE_CREDIT_LIVE"',      trueLabel: 'PRE_CREDIT_LIVE',     falseLabel: '→ next' } },
    { id: 'n-router-9',       type: 'edge_operation', position: { x: 880, y: 2120 }, data: { label: 'Route: CREDIT_LIVE?',         nodeType: 'edge_operation', condition: 'currentState === "CREDIT_LIVE"',          trueLabel: 'CREDIT_LIVE',         falseLabel: 'WAITING / fallback' } },
    { id: 'n-waiting-state',  type: 'task',           position: { x: 880, y: 2360 }, data: { label: 'WAITING — Processing',        nodeType: 'task',           assignedRole: 'credit_officer', dueHours: 24 } },

    // ── Step 1: Email (x:1440, 400px gap to each node) ───────────────────
    {
      id: 'n-email-form', type: 'web_form', position: { x: 1440, y: 200 },
      data: { label: 'Add Email', nodeType: 'web_form', stepTitle: 'Add Your Work Email',
        fields: [
          { id: 'email', type: 'email', label: 'Work Email', placeholder: 'you@company.com', required: true, validation: [{ type: 'required', message: 'Email is required' }] },
        ],
      },
    },
    { id: 'n-email-transition-api', type: 'api_request', position: { x: 1840, y: 200 }, data: { label: 'Transition: ADD_EMAIL', nodeType: 'api_request', method: 'POST', endpoint: '/credit/loan/v1/transition_state', auth: 'bearer' } },

    // ── Step 2: Bank Account ──────────────────────────────────────────────
    {
      id: 'n-add-bank-form', type: 'web_form', position: { x: 2240, y: 200 },
      data: { label: 'Add Bank Account', nodeType: 'web_form', stepTitle: 'Add Your Bank Account',
        fields: [
          { id: 'accountNumber', type: 'text',   label: 'Account Number', placeholder: 'Enter account number', required: true, validation: [{ type: 'required', message: 'Account number is required' }] },
          { id: 'ifscCode',      type: 'text',   label: 'IFSC Code',      placeholder: 'e.g. HDFC0001234',    required: true, validation: [{ type: 'required', message: 'IFSC code is required' }] },
          { id: 'accountType',   type: 'select', label: 'Account Type',   required: true, options: [{ label: 'Savings', value: 'SAVINGS' }, { label: 'Current', value: 'CURRENT' }], validation: [{ type: 'required', message: 'Select account type' }] },
        ],
      },
    },
    { id: 'n-add-bank-api', type: 'api_request', position: { x: 2640, y: 200 }, data: { label: 'Transition: ADD_BANK', nodeType: 'api_request', method: 'POST', endpoint: '/credit/loan/v1/transition_state', auth: 'bearer' } },

    // ── Step 3: Credit Offer — OFFER_SCREEN_GROMOR ───────────────────────
    { id: 'n-offer-screen-gromor', type: 'layout',      position: { x: 3040, y: 200 }, data: { label: 'Credit Offer Screen', nodeType: 'layout', stepTitle: "Congratulations! You're Pre-Approved", condition: 'Your credit line is ready. Complete KYC to activate it instantly.', trueLabel: 'Proceed to KYC' } },
    { id: 'n-gromor-transition',   type: 'api_request', position: { x: 3440, y: 200 }, data: { label: 'Transition: OFFER_SCREEN_GROMOR (Stage 1)', nodeType: 'api_request', method: 'POST', endpoint: '/credit/loan/v1/transition_state', auth: 'bearer' } },

    // ── Step 4: Aadhaar / DigiLocker ─────────────────────────────────────
    { id: 'n-digilocker-form',     type: 'webhook',        position: { x: 3840, y: 200 }, data: { label: 'DigiLocker — Aadhaar OAuth',    nodeType: 'webhook',        webhookUrl: 'digilocker.meripehchaan.gov.in · opens in new tab, waits for OAuth callback' } },
    { id: 'n-digilocker-confirm',  type: 'api_request',    position: { x: 4240, y: 200 }, data: { label: 'Aadhaar Callback Received',       nodeType: 'api_request',    method: 'POST', endpoint: '/credit/loan/v1/transition_state', auth: 'bearer' } },
    { id: 'n-aadhaar-result-cond', type: 'edge_operation', position: { x: 4640, y: 200 }, data: { label: 'Aadhaar Result?',                 nodeType: 'edge_operation', condition: 'nextState === "SELFIE_INITIALISATION"', trueLabel: '→ Selfie', falseLabel: 'AADHAAR_FAILED' } },

    // ── Step 5: Selfie / HyperVerge SDK ──────────────────────────────────
    { id: 'n-selfie-creds-api',   type: 'api_request',    position: { x: 5040, y: 200 }, data: { label: 'Transition: SELFIE_INITIALISATION (Stage 1)', nodeType: 'api_request',    method: 'POST', endpoint: '/credit/loan/v1/transition_state', auth: 'bearer' } },
    { id: 'n-selfie-form',        type: 'webhook',         position: { x: 5440, y: 200 }, data: { label: 'HyperVerge KYC SDK — Selfie',                 nodeType: 'webhook',         webhookUrl: 'HyperKyc.launch(authToken, workflowId) · SDK callback fires on complete' } },
    { id: 'n-selfie-confirm-api', type: 'api_request',    position: { x: 5840, y: 200 }, data: { label: 'Transition: SELFIE_INITIALISATION (Stage 2)', nodeType: 'api_request',    method: 'POST', endpoint: '/credit/loan/v1/transition_state', auth: 'bearer' } },
    { id: 'n-selfie-result-cond', type: 'edge_operation', position: { x: 6240, y: 200 }, data: { label: 'Selfie Result?',                               nodeType: 'edge_operation', condition: 'nextState === "ENACH_INITIATION"', trueLabel: '→ eNach', falseLabel: 'Failed' } },

    // ── Step 6: eNach — NACH Bank Portal ─────────────────────────────────
    { id: 'n-enach-init-api',    type: 'api_request',    position: { x: 6640, y: 200 }, data: { label: 'Transition: ENACH_INITIATION (Stage 1)', nodeType: 'api_request',    method: 'POST', endpoint: '/credit/loan/v1/transition_state', auth: 'bearer' } },
    { id: 'n-enach-form',        type: 'webhook',         position: { x: 7040, y: 200 }, data: { label: 'NACH Bank Portal — Mandate Setup',     nodeType: 'webhook',         webhookUrl: 'nach.npci.org.in · redirects to bank portal, webhook on mandate registration' } },
    { id: 'n-enach-wait-api',    type: 'api_request',    position: { x: 7440, y: 200 }, data: { label: 'Transition: WAITING_ENACH',             nodeType: 'api_request',    method: 'POST', endpoint: '/credit/loan/v1/transition_state', auth: 'bearer' } },
    { id: 'n-waiting-enach',     type: 'task',            position: { x: 7840, y: 200 }, data: { label: 'WAITING_ENACH — Poll for Mandate',      nodeType: 'task',            assignedRole: 'credit_officer', dueHours: 24 } },
    { id: 'n-enach-result-cond', type: 'edge_operation',  position: { x: 8240, y: 200 }, data: { label: 'eNach Confirmed?',                      nodeType: 'edge_operation',  condition: 'nextState === "SANCTION_LETTER"', trueLabel: '→ Sanction Letter', falseLabel: 'ENACH_FAILED' } },

    // ── Step 7: Sanction Letter / KFS ─────────────────────────────────────
    { id: 'n-kfs-api', type: 'api_request', position: { x: 8640, y: 200 }, data: { label: 'GET Current State (SANCTION_LETTER response)', nodeType: 'api_request', method: 'GET', endpoint: '/credit/loan/v1/current_state', auth: 'bearer' } },
    {
      id: 'n-offer-screen', type: 'layout', position: { x: 9040, y: 200 },
      data: {
        label: 'Sanction Letter / KFS',
        nodeType: 'layout',
        variant: 'loan-offer',
        stepTitle: 'Your Loan Offer',
        subtitle: 'Review your Key Financial Statement (KFS) and accept the final loan offer',
        submitLabel: 'Accept & Sign',
        // KFS values for preview — at runtime, the backend replaces these from currentResponse
        requestBody: JSON.stringify({
          principalAmount: '₹1,00,000',
          disbursedAmount: '₹98,500',
          tenure: '24 months',
          emiAmount: '₹5,166 / month',
          interestRate: '24% p.a. (APR)',
          totalInterest: '₹23,984',
          processingFee: '₹1,500 (incl. GST)',
          totalRepayable: '₹1,23,984',
        }),
      },
    },

    // ── Step 8: OTP Agreement Signing — sub-workflow ──────────────────────
    {
      id: 'n-otp-signing-connector', type: 'flow_connector', position: { x: 9440, y: 200 },
      data: {
        label: 'OTP Agreement Signing',
        nodeType: 'flow_connector',
        flowId: 'otp-signing-flow',
        subtitle: 'Reusable sub-flow: generate OTP → user signs → verify → transition SANCTION_LETTER',
        inputMap: '{{session.sessionId}} -> child.init.sessionId\n{{init.userId}} -> child.init.userId',
        outputMap: '{{child.result.status}} -> context.signing.result',
      },
    },

    // ── Step 9: Activation ────────────────────────────────────────────────
    { id: 'n-pre-credit-live', type: 'task', position: { x: 9840, y: 200 }, data: { label: 'PRE_CREDIT_LIVE — Activating', nodeType: 'task', assignedRole: 'credit_officer', dueHours: 24 } },

    // ── Terminal ──────────────────────────────────────────────────────────
    { id: 'n-credit-live', type: 'end', position: { x: 10240, y: 200 }, data: { label: 'CREDIT_LIVE — Journey Complete', nodeType: 'end' } },

    // ── Error / retry states (y = 720, well below the main flow) ─────────
    { id: 'n-bank-failed',    type: 'end', position: { x: 2800,  y: 720 }, data: { label: 'Bank Verification Failed',           nodeType: 'end' } },
    { id: 'n-aadhaar-failed', type: 'end', position: { x: 4800,  y: 720 }, data: { label: 'AADHAAR_FAILED — Retry DigiLocker', nodeType: 'end' } },
    { id: 'n-selfie-failed',  type: 'end', position: { x: 6400,  y: 720 }, data: { label: 'SELFIE_VERIFICATION_FAILED',        nodeType: 'end' } },
    { id: 'n-enach-failed',   type: 'end', position: { x: 8400,  y: 720 }, data: { label: 'ENACH_FAILED — Retry',              nodeType: 'end' } },
    { id: 'n-video-kyc',      type: 'end', position: { x: 6400,  y: 1000 }, data: { label: 'VIDEO_KYC_PENDING',                nodeType: 'end' } },
    { id: 'n-terminate',      type: 'end', position: { x: 9600,  y: 720 }, data: { label: 'TERMINATION — Application Rejected',nodeType: 'end' } },

    // ── BUREAU_FAILED recovery flow (y = 1000, below error row) ──────────
    {
      id: 'n-bureau-pan-form', type: 'web_form', position: { x: 4640, y: 1000 },
      data: { label: 'PAN Journey — Mobile Verify', nodeType: 'web_form', stepTitle: 'Verify Your PAN-Linked Mobile',
        fields: [
          { id: 'mobileNumber', type: 'phone', label: 'PAN-Linked Mobile Number', placeholder: '+91 98765 43210', required: true, validation: [{ type: 'required', message: 'Mobile number is required' }, { type: 'phone', message: 'Enter a valid mobile number' }] },
        ],
      },
    },
    { id: 'n-bureau-otp',       type: 'otp',         position: { x: 5040, y: 1000 }, data: { label: 'Bureau OTP — Verify Mobile', nodeType: 'otp',         channel: 'sms', maxAttempts: 3 } },
    { id: 'n-bureau-transition', type: 'api_request', position: { x: 5440, y: 1000 }, data: { label: 'Transition: BUREAU_FAILED',  nodeType: 'api_request', method: 'POST', endpoint: '/credit/loan/v1/transition_state', auth: 'bearer' } },
  ],
  edges: [
    // ── Init + full state router chain ───────────────────────────────────
    { id: 'e1',  source: 'n-start',     target: 'n-get-state' },
    { id: 'e2',  source: 'n-get-state', target: 'n-state-router' },
    // Router chain — each false branch falls to the next router
    { id: 'e-r1-true',  source: 'n-state-router', target: 'n-email-form',        sourceHandle: 'true',  label: 'ADD_EMAIL' },
    { id: 'e-r1-false', source: 'n-state-router', target: 'n-router-2',          sourceHandle: 'false' },
    { id: 'e-r2-true',  source: 'n-router-2',     target: 'n-add-bank-form',     sourceHandle: 'true',  label: 'ADD_BANK' },
    { id: 'e-r2-false', source: 'n-router-2',     target: 'n-router-3',          sourceHandle: 'false' },
    { id: 'e-r3-true',  source: 'n-router-3',     target: 'n-offer-screen-gromor',sourceHandle: 'true', label: 'OFFER_SCREEN_GROMOR' },
    { id: 'e-r3-false', source: 'n-router-3',     target: 'n-router-4',          sourceHandle: 'false' },
    { id: 'e-r4-true',  source: 'n-router-4',     target: 'n-selfie-creds-api',  sourceHandle: 'true',  label: 'SELFIE_INIT' },
    { id: 'e-r4-false', source: 'n-router-4',     target: 'n-router-5',          sourceHandle: 'false' },
    { id: 'e-r5-true',  source: 'n-router-5',     target: 'n-enach-init-api',    sourceHandle: 'true',  label: 'ENACH_INITIATION' },
    { id: 'e-r5-false', source: 'n-router-5',     target: 'n-router-6',          sourceHandle: 'false' },
    { id: 'e-r6-true',  source: 'n-router-6',     target: 'n-waiting-enach',     sourceHandle: 'true',  label: 'WAITING_ENACH' },
    { id: 'e-r6-false', source: 'n-router-6',     target: 'n-router-7',          sourceHandle: 'false' },
    { id: 'e-r7-true',  source: 'n-router-7',     target: 'n-kfs-api',           sourceHandle: 'true',  label: 'SANCTION_LETTER' },
    { id: 'e-r7-false', source: 'n-router-7',     target: 'n-router-8',          sourceHandle: 'false' },
    { id: 'e-r8-true',  source: 'n-router-8',     target: 'n-pre-credit-live',   sourceHandle: 'true',  label: 'PRE_CREDIT_LIVE' },
    { id: 'e-r8-false', source: 'n-router-8',     target: 'n-router-9',          sourceHandle: 'false' },
    { id: 'e-r9-true',  source: 'n-router-9',     target: 'n-credit-live',       sourceHandle: 'true',  label: 'CREDIT_LIVE' },
    { id: 'e-r9-false', source: 'n-router-9',     target: 'n-waiting-state',     sourceHandle: 'false', label: 'WAITING / fallback' },

    // ── Step 1: Email ─────────────────────────────────────────────────────
    { id: 'e5', source: 'n-email-form',           target: 'n-email-transition-api' },
    { id: 'e6', source: 'n-email-transition-api', target: 'n-add-bank-form' },

    // ── Step 2: Bank Account ──────────────────────────────────────────────
    { id: 'e7',  source: 'n-add-bank-form', target: 'n-add-bank-api' },
    { id: 'e8',  source: 'n-add-bank-api',  target: 'n-offer-screen-gromor', label: 'ADD_BANK → next state' },
    { id: 'e9',  source: 'n-add-bank-api',  target: 'n-bank-failed', label: 'Failed' },

    // ── Step 3: Credit Offer ──────────────────────────────────────────────
    { id: 'e10', source: 'n-offer-screen-gromor', target: 'n-gromor-transition' },
    { id: 'e11', source: 'n-gromor-transition',   target: 'n-digilocker-form', label: '→ DigiLocker URL' },

    // ── Step 4: Aadhaar / DigiLocker ─────────────────────────────────────
    { id: 'e12', source: 'n-digilocker-form',     target: 'n-digilocker-confirm' },
    { id: 'e13', source: 'n-digilocker-confirm',  target: 'n-aadhaar-result-cond' },
    { id: 'e14', source: 'n-aadhaar-result-cond', target: 'n-selfie-creds-api',  sourceHandle: 'true',  label: '→ Selfie' },
    { id: 'e15', source: 'n-aadhaar-result-cond', target: 'n-aadhaar-failed',    sourceHandle: 'false', label: 'AADHAAR_FAILED' },
    { id: 'e16', source: 'n-aadhaar-result-cond', target: 'n-bureau-pan-form',   label: 'BUREAU_FAILED' },

    // ── AADHAAR_FAILED retry ──────────────────────────────────────────────
    { id: 'e-aadhaar-retry', source: 'n-aadhaar-failed', target: 'n-gromor-transition', label: 'Retry DigiLocker' },

    // ── Step 5: Selfie ────────────────────────────────────────────────────
    { id: 'e17', source: 'n-selfie-creds-api',   target: 'n-selfie-form' },
    { id: 'e18', source: 'n-selfie-form',         target: 'n-selfie-confirm-api' },
    { id: 'e19', source: 'n-selfie-confirm-api',  target: 'n-selfie-result-cond' },
    { id: 'e20', source: 'n-selfie-result-cond',  target: 'n-enach-init-api',   sourceHandle: 'true',  label: '→ eNach' },
    { id: 'e21', source: 'n-selfie-result-cond',  target: 'n-selfie-failed',    sourceHandle: 'false', label: 'SELFIE_FAILED' },
    { id: 'e22', source: 'n-selfie-result-cond',  target: 'n-video-kyc',        label: 'VIDEO_KYC_PENDING' },

    // ── SELFIE_FAILED retry ───────────────────────────────────────────────
    { id: 'e-selfie-retry', source: 'n-selfie-failed', target: 'n-selfie-creds-api', label: 'Retry Selfie' },

    // ── Step 6: eNach ────────────────────────────────────────────────────
    { id: 'e23', source: 'n-enach-init-api',    target: 'n-enach-form' },
    { id: 'e24', source: 'n-enach-form',         target: 'n-enach-wait-api' },
    { id: 'e25', source: 'n-enach-wait-api',     target: 'n-waiting-enach' },
    { id: 'e26', source: 'n-waiting-enach',      target: 'n-enach-result-cond' },
    { id: 'e27', source: 'n-enach-result-cond',  target: 'n-kfs-api',        sourceHandle: 'true',  label: '→ Sanction Letter' },
    { id: 'e28', source: 'n-enach-result-cond',  target: 'n-enach-failed',   sourceHandle: 'false', label: 'ENACH_FAILED' },

    // ── ENACH_FAILED retry ────────────────────────────────────────────────
    { id: 'e-enach-retry', source: 'n-enach-failed', target: 'n-enach-init-api', label: 'Retry eNach' },

    // ── Step 7: Sanction Letter ───────────────────────────────────────────
    { id: 'e29', source: 'n-kfs-api',      target: 'n-offer-screen' },

    // ── Step 8: OTP Signing sub-workflow ─────────────────────────────────
    { id: 'e30', source: 'n-offer-screen',          target: 'n-otp-signing-connector', label: 'KFS accepted → sign' },
    { id: 'e31', source: 'n-otp-signing-connector', target: 'n-pre-credit-live',       label: 'Signed ✓' },

    // ── Step 9: Activation ────────────────────────────────────────────────
    { id: 'e37', source: 'n-pre-credit-live', target: 'n-credit-live', label: 'CREDIT_LIVE' },

    // ── BUREAU_FAILED recovery ────────────────────────────────────────────
    { id: 'e-bureau-pan',    source: 'n-bureau-pan-form',  target: 'n-bureau-otp' },
    { id: 'e-bureau-otp',    source: 'n-bureau-otp',       target: 'n-bureau-transition' },
    { id: 'e-bureau-resume', source: 'n-bureau-transition',target: 'n-selfie-creds-api', label: 'Resume → Selfie' },
  ],
})

// ─── Step definitions (the SDK runtime fetches these) ──────────────────────────

const stepDefs = new Map<string, StepDefinition>([
  [
    'step-kyc',
    {
      id: 'step-kyc',
      type: 'form',
      title: 'Personal Information',
      subtitle: 'Please provide your details to proceed',
      allowBack: false,
      copy: { submitLabel: 'Continue' },
      uiConfig: {},
      fields: KYC_FIELDS,
    },
  ],
  [
    'step-otp',
    {
      id: 'step-otp',
      type: 'otp',
      title: 'Verify your mobile number',
      subtitle: 'We sent a 6-digit OTP to your registered mobile number',
      allowBack: true,
      copy: { submitLabel: 'Verify OTP', backLabel: 'Back' },
      uiConfig: {},
      fields: [],
    },
  ],
  [
    'step-approved',
    {
      id: 'step-approved',
      type: 'decision',
      title: 'Congratulations! You are pre-approved',
      subtitle: 'Your loan application is pre-approved for up to ₹5,00,000',
      allowBack: false,
      copy: { submitLabel: 'Continue' },
      uiConfig: { variant: 'approved' },
      fields: [],
    },
  ],
  [
    'step-rejected',
    {
      id: 'step-rejected',
      type: 'decision',
      title: 'Application not approved',
      subtitle: 'Unfortunately we are unable to approve your application at this time',
      allowBack: false,
      copy: { submitLabel: 'Done' },
      uiConfig: { variant: 'rejected' },
      fields: [],
    },
  ],

  // ── PICE LOS Journey step definitions ──────────────────────────────────
  [
    'n-email-form',
    {
      id: 'n-email-form',
      type: 'form',
      title: 'Add Your Work Email',
      subtitle: 'We will send important loan updates to this address',
      allowBack: false,
      copy: { submitLabel: 'Continue' },
      uiConfig: {},
      fields: [
        { id: 'email', type: 'email', label: 'Work Email', placeholder: 'you@company.com', required: true, validation: [{ type: 'required', message: 'Email is required' }] },
      ],
    },
  ],
  [
    'n-add-bank-form',
    {
      id: 'n-add-bank-form',
      type: 'form',
      title: 'Add Bank Account',
      subtitle: 'Enter your bank account details for verification',
      allowBack: true,
      copy: { submitLabel: 'Verify Account', backLabel: 'Back' },
      uiConfig: {},
      fields: [
        { id: 'accountNumber', type: 'text',   label: 'Account Number', placeholder: 'Enter account number', required: true, validation: [{ type: 'required', message: 'Account number is required' }] },
        { id: 'ifscCode',      type: 'text',   label: 'IFSC Code',      placeholder: 'e.g. HDFC0001234',    required: true, validation: [{ type: 'required', message: 'IFSC code is required' }] },
        { id: 'accountType',   type: 'select', label: 'Account Type',   options: [{ label: 'Savings', value: 'SAVINGS' }, { label: 'Current', value: 'CURRENT' }], required: true, validation: [{ type: 'required', message: 'Select account type' }] },
      ],
    },
  ],
  [
    'n-confirm-bank-form',
    {
      id: 'n-confirm-bank-form',
      type: 'form',
      title: 'Confirm Bank Details',
      subtitle: 'Please verify the account holder name returned by your bank',
      allowBack: true,
      copy: { submitLabel: 'Confirm & Continue', backLabel: 'Back' },
      uiConfig: {},
      fields: [
        { id: 'accountName', type: 'text', label: 'Account Holder Name (as per bank)', required: true, validation: [{ type: 'required', message: 'Confirm the account name' }] },
      ],
    },
  ],
  [
    'n-digilocker-form',
    {
      id: 'n-digilocker-form',
      type: 'form',
      title: 'Verify Aadhaar via DigiLocker',
      subtitle: 'We will fetch your Aadhaar details securely through DigiLocker — a Government of India service',
      allowBack: false,
      copy: { submitLabel: 'Proceed to DigiLocker' },
      uiConfig: { variant: 'digilocker' },
      fields: [],
    },
  ],
  [
    'n-selfie-form',
    {
      id: 'n-selfie-form',
      type: 'form',
      title: 'Face Verification',
      subtitle: 'A quick selfie to complete your KYC — powered by HyperVerge',
      allowBack: false,
      copy: { submitLabel: 'Start Face Scan' },
      uiConfig: { variant: 'selfie' },
      fields: [],
    },
  ],
  [
    'n-enach-form',
    {
      id: 'n-enach-form',
      type: 'form',
      title: 'Set Up Auto-Repayment',
      subtitle: 'Authorise a NACH mandate to auto-debit your EMI on the due date each month',
      allowBack: false,
      copy: { submitLabel: 'Proceed to Bank Portal' },
      uiConfig: { variant: 'enach' },
      fields: [],
    },
  ],
  [
    'n-offer-screen',
    {
      id: 'n-offer-screen',
      type: 'form',
      title: 'Your Loan Offer',
      subtitle: 'Review your Key Financial Statement (KFS) and accept the final loan offer',
      allowBack: false,
      copy: { submitLabel: 'Accept & Sign' },
      uiConfig: {
        variant: 'loan-offer',
        kfs: {
          principalAmount: '₹1,00,000',
          disbursedAmount: '₹98,500',
          tenure: '24 months',
          emiAmount: '₹5,166 / month',
          interestRate: '24% p.a. (APR)',
          totalInterest: '₹23,984',
          processingFee: '₹1,500 (incl. GST)',
          totalRepayable: '₹1,23,984',
        },
      },
      fields: [],
    },
  ],
  [
    'n-otp-sign',
    {
      id: 'n-otp-sign',
      type: 'otp',
      title: 'Sign Your Loan Agreement',
      subtitle: 'Enter the 6-digit OTP sent to your registered mobile number',
      allowBack: false,
      copy: { submitLabel: 'Sign Agreement', backLabel: 'Back' },
      uiConfig: {},
      fields: [],
    },
  ],
  [
    'n-credit-live',
    {
      id: 'n-credit-live',
      type: 'decision',
      title: 'Credit Line Activated!',
      subtitle: 'Your PICE credit line is now live. You can start using it immediately.',
      allowBack: false,
      copy: { submitLabel: 'Go to Dashboard' },
      uiConfig: { variant: 'approved' },
      fields: [],
    },
  ],
  [
    'n-waiting-state',
    {
      id: 'n-waiting-state',
      type: 'loading',
      title: 'Processing Your Application',
      subtitle: 'We are running a quick check. This usually takes a few seconds.',
      allowBack: false,
      copy: { submitLabel: '' },
      uiConfig: { variant: 'awaiting' },
      fields: [],
    },
  ],
  [
    'n-offer-screen-gromor',
    {
      id: 'n-offer-screen-gromor',
      type: 'form',
      title: 'Congratulations! You\'re Pre-Approved',
      subtitle: 'Complete your KYC to activate your credit line and get instant access to funds.',
      allowBack: false,
      copy: { submitLabel: 'Proceed to KYC' },
      uiConfig: {
        variant: 'credit-offer',
        kfs: {
          loanAmount:    '₹2,00,000',
          roi:           '1.5% per month',
          tenure:        'Up to 12 months',
          processingFee: 'Nil',
        },
      },
      fields: [],
    },
  ],
  [
    'n-pre-credit-live',
    {
      id: 'n-pre-credit-live',
      type: 'loading',
      title: 'Activating Your Credit Line',
      subtitle: 'Almost there! We are setting up your credit line. This may take a moment.',
      allowBack: false,
      copy: { submitLabel: '' },
      uiConfig: { variant: 'awaiting' },
      fields: [],
    },
  ],
  [
    'n-bureau-pan-form',
    {
      id: 'n-bureau-pan-form',
      type: 'form',
      title: 'Verify Your Identity',
      subtitle: 'Please enter the mobile number linked to your PAN to continue.',
      allowBack: false,
      copy: { submitLabel: 'Send OTP' },
      uiConfig: {},
      fields: [
        { id: 'mobileNumber', type: 'phone', label: 'PAN-Linked Mobile Number', placeholder: '+91 98765 43210', required: true, validation: [{ type: 'required', message: 'Mobile number is required' }, { type: 'phone', message: 'Enter a valid 10-digit mobile number' }] },
      ],
    },
  ],
  [
    'n-bureau-otp',
    {
      id: 'n-bureau-otp',
      type: 'otp',
      title: 'Verify Your Mobile',
      subtitle: 'Enter the 6-digit OTP sent to your PAN-linked mobile number',
      allowBack: true,
      copy: { submitLabel: 'Verify OTP', backLabel: 'Back' },
      uiConfig: {},
      fields: [],
    },
  ],
  [
    'n-bank-failed',
    {
      id: 'n-bank-failed',
      type: 'decision',
      title: 'Bank Verification Failed',
      subtitle: 'We could not verify your bank account. Please check the details and try again.',
      allowBack: false,
      copy: { submitLabel: 'Retry' },
      uiConfig: { variant: 'rejected' },
      fields: [],
    },
  ],
  [
    'n-aadhaar-failed',
    {
      id: 'n-aadhaar-failed',
      type: 'decision',
      title: 'Aadhaar Verification Failed',
      subtitle: 'We could not verify your Aadhaar via DigiLocker. Please try again.',
      allowBack: false,
      copy: { submitLabel: 'Retry' },
      uiConfig: { variant: 'rejected' },
      fields: [],
    },
  ],
  [
    'n-selfie-failed',
    {
      id: 'n-selfie-failed',
      type: 'decision',
      title: 'Selfie Verification Failed',
      subtitle: 'Face match unsuccessful. Please ensure good lighting and retry.',
      allowBack: false,
      copy: { submitLabel: 'Retry Selfie' },
      uiConfig: { variant: 'rejected' },
      fields: [],
    },
  ],
  [
    'n-enach-failed',
    {
      id: 'n-enach-failed',
      type: 'decision',
      title: 'eNach Setup Failed',
      subtitle: 'The NACH mandate could not be set up. Please try again with your bank.',
      allowBack: false,
      copy: { submitLabel: 'Retry Mandate' },
      uiConfig: { variant: 'rejected' },
      fields: [],
    },
  ],
  [
    'n-bureau-failed',
    {
      id: 'n-bureau-failed',
      type: 'decision',
      title: 'Bureau Check Failed',
      subtitle: 'We were unable to complete the bureau verification. Please continue via PAN journey.',
      allowBack: false,
      copy: { submitLabel: 'Retry' },
      uiConfig: { variant: 'rejected' },
      fields: [],
    },
  ],
  [
    'n-video-kyc',
    {
      id: 'n-video-kyc',
      type: 'decision',
      title: 'Video KYC Required',
      subtitle: 'Your application requires a video KYC step. Our team will contact you shortly.',
      allowBack: false,
      copy: { submitLabel: 'OK' },
      uiConfig: { variant: 'rejected' },
      fields: [],
    },
  ],
  [
    'n-terminate',
    {
      id: 'n-terminate',
      type: 'decision',
      title: 'Application Rejected',
      subtitle: 'Unfortunately your application has been rejected at this time.',
      allowBack: false,
      copy: { submitLabel: 'Done' },
      uiConfig: { variant: 'rejected' },
      fields: [],
    },
  ],

  // ── otp-signing-flow step definitions ─────────────────────────────────────
  [
    'otp-sf-otp',
    {
      id: 'otp-sf-otp',
      type: 'otp',
      title: 'Sign Your Loan Agreement',
      subtitle: 'Enter the OTP sent to your registered mobile to digitally sign the agreement.',
      allowBack: false,
      copy: { submitLabel: 'Sign Agreement' },
      uiConfig: {},
      fields: [],
    },
  ],
  [
    'otp-sf-signed',
    {
      id: 'otp-sf-signed',
      type: 'decision',
      title: 'Agreement Signed!',
      subtitle: 'Your loan agreement has been digitally signed. Activating your credit line…',
      allowBack: false,
      copy: { submitLabel: 'Continue' },
      uiConfig: { variant: 'approved' },
      fields: [],
    },
  ],
  [
    'otp-sf-failed',
    {
      id: 'otp-sf-failed',
      type: 'decision',
      title: 'OTP Verification Failed',
      subtitle: 'OTP attempts exhausted. Please contact support to complete your application.',
      allowBack: false,
      copy: { submitLabel: 'Done' },
      uiConfig: { variant: 'rejected' },
      fields: [],
    },
  ],
])

// Linear happy-path transitions for the runtime demo flow.
const NEXT_STEP: Record<string, string> = {
  'step-kyc': 'step-otp',
  'step-otp': 'step-approved',
  // PICE LOS — happy path (UI steps only; API nodes are walked server-side)
  'n-email-form':           'n-add-bank-form',
  'n-add-bank-form':        'n-offer-screen-gromor',
  'n-offer-screen-gromor':  'n-digilocker-form',
  'n-digilocker-form':      'n-selfie-form',
  'n-selfie-form':          'n-enach-form',
  'n-enach-form':           'n-offer-screen',
  'n-waiting-enach':        'n-offer-screen',            // mandate confirmed → KFS
  'n-offer-screen':         'n-otp-signing-connector',  // → sub-flow
  'n-otp-signing-connector':'n-pre-credit-live',         // parent resumes after sub-flow
  'n-pre-credit-live':      'n-credit-live',
  // bureau recovery
  'n-bureau-pan-form':      'n-bureau-otp',
  'n-bureau-otp':           'n-selfie-form',
  // OTP signing sub-flow (otp-signing-flow)
  'otp-sf-otp':             'otp-sf-signed',
}
const PREV_STEP: Record<string, string> = {
  'step-otp':               'step-kyc',
  'n-add-bank-form':        'n-email-form',
  'n-offer-screen-gromor':  'n-add-bank-form',
  'n-digilocker-form':      'n-offer-screen-gromor',
  'n-selfie-form':          'n-digilocker-form',
  'n-enach-form':           'n-selfie-form',
  'n-offer-screen':         'n-enach-form',
  'n-otp-signing-connector':'n-offer-screen',
  'n-bureau-otp':           'n-bureau-pan-form',
}
const TERMINAL_STEPS = new Set([
  'step-approved', 'step-rejected',
  'n-credit-live',
  'n-bank-failed', 'n-aadhaar-failed', 'n-selfie-failed', 'n-enach-failed',
  'n-video-kyc', 'n-terminate',
  // sub-flow terminals
  'otp-sf-signed', 'otp-sf-failed',
])

// ─── Runtime session store ─────────────────────────────────────────────────────

interface SessionRecord {
  sessionId: string
  flowId: string
  tenantId: string
  currentStepId: string
  context: Record<string, unknown>
  lastResponse: Record<string, unknown>
  // Tracks how many times each step has been polled — used to auto-advance in the mock
  pollCounts: Record<string, number>
}
const sessions = new Map<string, SessionRecord>()

// How many poll calls before the mock auto-advances a WAITING/task step.
// With a 3-second polling interval: 3 polls = ~9 seconds.
// Change this to make the mock advance faster or slower.
const MOCK_ADVANCE_AFTER_POLLS = 3

const uid = (prefix: string) =>
  `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`

// ─── Handlers ──────────────────────────────────────────────────────────────────

export const handlers = [
  // ===== Workflow CRUD (admin builder + dashboard) =====

  http.get(`${BASE}/workflows`, () => {
    return HttpResponse.json(Array.from(workflows.values()))
  }),

  http.post(`${BASE}/workflows`, async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as { name?: string }
    const id = uid('wf')
    const wf: WorkflowDefinition = {
      id,
      name: body.name?.trim() || 'Untitled workflow',
      tenantId: 'mock-tenant',
      status: 'draft',
      theme: DEFAULT_THEME,
      createdAt: now(),
      updatedAt: now(),
      nodes: [{ id: 'start', type: 'start', position: { x: 120, y: 200 }, data: { label: 'Start', nodeType: 'start' } }],
      edges: [],
    }
    workflows.set(id, wf)
    return HttpResponse.json(wf, { status: 201 })
  }),

  http.get(`${BASE}/workflows/:id`, ({ params }) => {
    const wf = workflows.get(params.id as string)
    if (!wf) return HttpResponse.json({ message: 'Workflow not found' }, { status: 404 })
    return HttpResponse.json(wf)
  }),

  http.put(`${BASE}/workflows/:id`, async ({ params, request }) => {
    const id = params.id as string
    const existing = workflows.get(id)
    if (!existing) return HttpResponse.json({ message: 'Workflow not found' }, { status: 404 })
    const patch = (await request.json().catch(() => ({}))) as Partial<WorkflowDefinition>
    const updated: WorkflowDefinition = {
      ...existing,
      ...patch,
      id,
      tenantId: existing.tenantId,
      createdAt: existing.createdAt,
      updatedAt: now(),
    }
    workflows.set(id, updated)
    return HttpResponse.json(updated)
  }),

  http.post(`${BASE}/workflows/:id/publish`, ({ params }) => {
    const id = params.id as string
    const wf = workflows.get(id)
    if (!wf) return HttpResponse.json({ message: 'Workflow not found' }, { status: 404 })
    const published: WorkflowDefinition = { ...wf, status: 'published', updatedAt: now() }
    workflows.set(id, published)
    return HttpResponse.json(published)
  }),

  // ===== Tenant theme (resolved by the SDK at runtime) =====

  http.get(`${BASE}/tenants/theme`, ({ request }) => {
    const url = new URL(request.url)
    const hash = url.searchParams.get('hash') ?? ''
    // The themeHash is the workflow id in this POC. Return that workflow's
    // stored theme, falling back to the default.
    const wf = workflows.get(hash)
    const theme: ThemeConfig = wf?.theme ?? DEFAULT_THEME
    return HttpResponse.json(theme)
  }),

  // ===== SDK runtime: sessions + steps =====

  http.post(`${BASE}/sessions/bootstrap`, async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as {
      flowId?: string
      initialData?: Record<string, unknown>
    }
    const flowId = body.flowId ?? 'demo-flow'
    const sessionId = uid('sess')
    const compiled = getRuntimeFlow(flowId)
    const firstStepId = compiled?.order[0] ?? 'step-kyc'
    // Seed __init from initialData so {{init.*}} variables work in templates
    const initContext = body.initialData ? { __init: body.initialData } : {}
    const record: SessionRecord = {
      sessionId,
      flowId,
      tenantId: 'mock-tenant',
      currentStepId: firstStepId,
      context: initContext,
      lastResponse: {},
      pollCounts: {},
    }
    sessions.set(sessionId, record)
    const session: FlowSession = {
      sessionId,
      flowId,
      tenantId: record.tenantId,
      currentStepId: record.currentStepId,
      context: record.context,
      startedAt: now(),
    }
    return HttpResponse.json(session)
  }),

  // Polling — called by FlowEngine on loading/task steps
  // Polling — called by FlowEngine on loading/task steps.
  // After MOCK_ADVANCE_AFTER_POLLS calls on the same step, auto-advance the session
  // to simulate the async backend event (e.g. NPCI mandate webhook) arriving.
  http.get(`${BASE}/sessions/poll`, ({ request }) => {
    const url = new URL(request.url)
    const sessionId = url.searchParams.get('sessionId') ?? ''
    const session = sessions.get(sessionId)
    if (!session) return HttpResponse.json({ message: 'Session not found' }, { status: 404 })

    const stepId = session.currentStepId
    session.pollCounts[stepId] = (session.pollCounts[stepId] ?? 0) + 1

    if (session.pollCounts[stepId]! >= MOCK_ADVANCE_AFTER_POLLS) {
      // Determine next step (same logic as submit handler)
      const compiled = getRuntimeFlow(session.flowId)
      let nextStepId: string | undefined
      if (compiled) {
        const idx = compiled.order.indexOf(stepId)
        nextStepId = idx >= 0 ? compiled.order[idx + 1] : undefined
      } else {
        nextStepId = NEXT_STEP[stepId]
      }
      if (nextStepId) {
        session.currentStepId = nextStepId
        session.pollCounts = {}  // reset counts for the new step
      }
    }

    return HttpResponse.json({ currentStepId: session.currentStepId })
  }),

  http.get(`${BASE}/steps/:stepId`, ({ params }) => {
    const id = params.stepId as string
    const compiled = getRuntimeStep(id)
    const explicit  = stepDefs.get(id)
    // Prefer the explicit stepDef (has uiConfig.variant, richer metadata) but fall back to compiled
    // If both exist, merge so compiled fields win but explicit uiConfig wins (preserves variants)
    let step
    if (explicit && compiled) {
      step = { ...compiled, uiConfig: { ...compiled.uiConfig, ...explicit.uiConfig }, title: explicit.title, subtitle: explicit.subtitle, copy: explicit.copy }
    } else {
      step = explicit ?? compiled
    }
    if (!step) return HttpResponse.json({ message: 'Step not found' }, { status: 404 })
    return HttpResponse.json(step)
  }),

  http.post(`${BASE}/sessions/submit`, async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as {
      sessionId?: string
      stepId?: string
      data?: Record<string, unknown>
    }
    const session = body.sessionId ? sessions.get(body.sessionId) : undefined
    if (session && body.data) {
      session.context = { ...session.context, [body.stepId ?? 'unknown']: body.data }
    }

    const stepId = body.stepId ?? ''

    // Prefer the compiled builder graph for the next-step decision.
    const compiled = session ? getRuntimeFlow(session.flowId) : undefined
    let nextStepId: string | undefined
    if (compiled) {
      const idx = compiled.order.indexOf(stepId)
      nextStepId = idx >= 0 ? compiled.order[idx + 1] : undefined
    } else {
      nextStepId = NEXT_STEP[stepId]
    }

    if (nextStepId) {
      if (session) {
        session.currentStepId = nextStepId
        session.lastResponse = { nextStepId, nextState: nextStepId }
      }
      return HttpResponse.json({ nextStepId })
    }

    // No next step → complete the flow.
    const lastStep = compiled ? compiled.steps[stepId] : undefined
    const status =
      lastStep?.uiConfig.variant ??
      (TERMINAL_STEPS.has(stepId) ? stepId.replace('step-', '') : 'approved')
    return HttpResponse.json({
      complete: true,
      result: { status, collected: session?.context ?? {} },
    })
  }),

  http.post(`${BASE}/sessions/back`, async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as {
      sessionId?: string
      currentStepId?: string
    }
    const currentStepId = body.currentStepId ?? ''
    const session = body.sessionId ? sessions.get(body.sessionId) : undefined
    const compiled = session ? getRuntimeFlow(session.flowId) : undefined

    let previousStepId: string
    if (compiled) {
      const idx = compiled.order.indexOf(currentStepId)
      previousStepId = idx > 0 ? compiled.order[idx - 1] : compiled.order[0]
    } else {
      previousStepId = PREV_STEP[currentStepId] ?? 'step-kyc'
    }

    if (session) session.currentStepId = previousStepId
    return HttpResponse.json({ previousStepId })
  }),
]
