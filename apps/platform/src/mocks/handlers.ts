import { http, HttpResponse } from 'msw'
import type {
  FieldDefinition,
  FlowSession,
  StepDefinition,
  ThemeConfig,
  WorkflowDefinition,
} from '@platform/core'
import { DEFAULT_THEME } from '@platform/core'
import { getRuntimeFlow, getRuntimeStep } from '@/lib/flow-compiler'

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

// ─── PICE LOS Journey (published) — 38-node comprehensive graph ───────────────

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
    { id: 'n-start',    type: 'start',       position: { x: 80,   y: 200 }, data: { label: 'Start',             nodeType: 'start' } },
    { id: 'n-get-state',type: 'api_request', position: { x: 400,  y: 200 }, data: { label: 'GET Current State', nodeType: 'api_request', method: 'GET', endpoint: '/credit/loan/v1/current_state', auth: 'bearer' } },

    // ── Step 1: Email ─────────────────────────────────────────────────────
    {
      id: 'n-email-form', type: 'web_form', position: { x: 720, y: 200 },
      data: { label: 'Add Email', nodeType: 'web_form', stepTitle: 'Add Your Work Email',
        fields: [
          { id: 'email', type: 'email', label: 'Work Email', placeholder: 'you@company.com', required: true, validation: [{ type: 'required', message: 'Email is required' }] },
        ],
      },
    },
    { id: 'n-email-transition-api', type: 'api_request', position: { x: 1040, y: 200 }, data: { label: 'Transition: ADD_EMAIL', nodeType: 'api_request', method: 'POST', endpoint: '/credit/loan/v1/transition_state', auth: 'bearer' } },

    // ── Step 2: Bank Account ──────────────────────────────────────────────
    {
      id: 'n-add-bank-form', type: 'web_form', position: { x: 1360, y: 200 },
      data: { label: 'Add Bank Account', nodeType: 'web_form', stepTitle: 'Add Your Bank Account',
        fields: [
          { id: 'accountNumber', type: 'text',   label: 'Account Number', placeholder: 'Enter account number', required: true, validation: [{ type: 'required', message: 'Account number is required' }] },
          { id: 'ifscCode',      type: 'text',   label: 'IFSC Code',      placeholder: 'e.g. HDFC0001234',    required: true, validation: [{ type: 'required', message: 'IFSC code is required' }] },
          { id: 'accountType',   type: 'select', label: 'Account Type',   required: true, options: [{ label: 'Savings', value: 'SAVINGS' }, { label: 'Current', value: 'CURRENT' }], validation: [{ type: 'required', message: 'Select account type' }] },
        ],
      },
    },
    { id: 'n-add-bank-api',     type: 'api_request',    position: { x: 1680, y: 200 }, data: { label: 'POST add_bank_account',  nodeType: 'api_request',    method: 'POST', endpoint: '/user-gst/v1/add_bank_account', auth: 'bearer' } },
    { id: 'n-bank-verify-cond', type: 'edge_operation', position: { x: 2000, y: 200 }, data: { label: 'Bank Verified?',         nodeType: 'edge_operation', condition: 'data.accountStatus === "SUCCESS"', trueLabel: 'Verified', falseLabel: 'Failed' } },
    {
      id: 'n-confirm-bank-form', type: 'web_form', position: { x: 2320, y: 200 },
      data: { label: 'Confirm Bank Details', nodeType: 'web_form', stepTitle: 'Confirm Your Bank Details',
        fields: [
          { id: 'accountName', type: 'text', label: 'Account Holder Name (as per bank)', required: true, validation: [{ type: 'required', message: 'Confirm the account name' }] },
        ],
      },
    },
    { id: 'n-confirm-bank-api',    type: 'api_request', position: { x: 2640, y: 200 }, data: { label: 'POST confirm_bank_details', nodeType: 'api_request', method: 'POST', endpoint: '/user-gst/v1/confirm_bank_details', auth: 'bearer' } },
    { id: 'n-bank-transition-api', type: 'api_request', position: { x: 2960, y: 200 }, data: { label: 'Transition: ADD_BANK',       nodeType: 'api_request', method: 'POST', endpoint: '/credit/loan/v1/transition_state',  auth: 'bearer' } },

    // ── Step 3: Aadhaar / DigiLocker ─────────────────────────────────────
    { id: 'n-digilocker-init-api', type: 'api_request',    position: { x: 3280, y: 200 }, data: { label: 'Initiate DigiLocker',        nodeType: 'api_request',    method: 'POST', endpoint: '/credit/loan/v1/transition_state', auth: 'bearer' } },
    { id: 'n-digilocker-form',     type: 'webhook',         position: { x: 3600, y: 200 }, data: { label: 'DigiLocker — Aadhaar Fetch', nodeType: 'webhook',         webhookUrl: 'digilocker.meripehchaan.gov.in · waits for OAuth callback' } },
    { id: 'n-digilocker-confirm',  type: 'api_request',    position: { x: 3920, y: 200 }, data: { label: 'Confirm DigiLocker',          nodeType: 'api_request',    method: 'POST', endpoint: '/credit/loan/v1/transition_state', auth: 'bearer' } },
    { id: 'n-aadhaar-result-cond', type: 'edge_operation', position: { x: 4240, y: 200 }, data: { label: 'Aadhaar Verified?',           nodeType: 'edge_operation', condition: 'nextState === "SELFIE_INITIALISATION"', trueLabel: '→ Selfie', falseLabel: 'Failed' } },

    // ── Step 4: Selfie / HyperVerge SDK ──────────────────────────────────
    { id: 'n-selfie-creds-api',   type: 'api_request',    position: { x: 4560, y: 200 }, data: { label: 'GET HyperVerge Creds',        nodeType: 'api_request',    method: 'POST', endpoint: '/credit/loan/v1/transition_state', auth: 'bearer' } },
    { id: 'n-selfie-form',        type: 'webhook',         position: { x: 4880, y: 200 }, data: { label: 'HyperVerge KYC SDK — Selfie', nodeType: 'webhook',         webhookUrl: 'HyperKyc.launch(authToken, workflowId) · SDK callback fires on complete' } },
    { id: 'n-selfie-confirm-api', type: 'api_request',    position: { x: 5200, y: 200 }, data: { label: 'Confirm Selfie Result',        nodeType: 'api_request',    method: 'POST', endpoint: '/credit/loan/v1/transition_state', auth: 'bearer' } },
    { id: 'n-selfie-result-cond', type: 'edge_operation', position: { x: 5520, y: 200 }, data: { label: 'Selfie Approved?',             nodeType: 'edge_operation', condition: 'selfieResult === "auto_approved"', trueLabel: '→ eNach', falseLabel: 'Failed' } },

    // ── Step 5: eNach — NACH Bank Portal ─────────────────────────────────
    { id: 'n-enach-init-api', type: 'api_request', position: { x: 5840, y: 200 }, data: { label: 'Initiate eNach Mandate',           nodeType: 'api_request', method: 'POST', endpoint: '/credit/loan/v1/transition_state', auth: 'bearer' } },
    { id: 'n-enach-form',     type: 'webhook',      position: { x: 6160, y: 200 }, data: { label: 'NACH Bank Portal — Mandate Setup', nodeType: 'webhook',      webhookUrl: 'nach.npci.org.in · redirects to bank portal, webhook on mandate registration' } },
    { id: 'n-enach-wait-api',    type: 'api_request', position: { x: 6480, y: 200 }, data: { label: 'Transition: ENACH_INITIATION', nodeType: 'api_request', method: 'POST', endpoint: '/credit/loan/v1/transition_state', auth: 'bearer' } },
    { id: 'n-waiting-enach',     type: 'task',         position: { x: 6800, y: 200 }, data: { label: 'WAITING_ENACH — Poll',         nodeType: 'task', assignedRole: 'credit_officer', dueHours: 24 } },
    { id: 'n-enach-result-cond', type: 'edge_operation', position: { x: 7120, y: 200 }, data: { label: 'eNach Confirmed?', nodeType: 'edge_operation', condition: 'currentState === "SANCTION_LETTER"', trueLabel: '→ Loan Offer', falseLabel: 'Failed' } },

    // ── Step 6: Loan Offer / KFS ──────────────────────────────────────────
    { id: 'n-kfs-api', type: 'api_request', position: { x: 7440, y: 200 }, data: { label: 'GET KFS Details', nodeType: 'api_request', method: 'POST', endpoint: '/credit/drawdown/v1/get_kfs_details', auth: 'bearer' } },
    {
      id: 'n-offer-screen', type: 'web_form', position: { x: 7760, y: 200 },
      data: { label: 'Loan Offer', nodeType: 'web_form', stepTitle: 'Your Loan Offer',
        fields: [
          { id: 'principalAmount', type: 'text',     label: 'Loan Amount (₹)',      required: false, validation: [] },
          { id: 'interest',        type: 'text',     label: 'Total Interest (₹)',    required: false, validation: [] },
          { id: 'apr',             type: 'text',     label: 'Interest Rate (APR %)', required: false, validation: [] },
          { id: 'processingFee',   type: 'text',     label: 'Processing Fee (₹)',    required: false, validation: [] },
          { id: 'emiAmount',       type: 'text',     label: 'Monthly EMI (₹)',       required: false, validation: [] },
          { id: 'offerAccepted',   type: 'checkbox', label: 'I have reviewed the KFS and accept this loan offer', required: true, validation: [{ type: 'required', message: 'You must accept the offer to proceed' }] },
        ],
      },
    },

    // ── Step 7: OTP Signing ───────────────────────────────────────────────
    { id: 'n-otp-gen-api',          type: 'api_request',    position: { x: 8080, y: 200 }, data: { label: 'Generate Loan Agreement OTP', nodeType: 'api_request',    method: 'POST', endpoint: '/credit/drawdown/v1/generate_loan_agreement_otp', auth: 'bearer' } },
    { id: 'n-otp-sign',             type: 'otp',             position: { x: 8400, y: 200 }, data: { label: 'Sign Agreement — OTP',        nodeType: 'otp',             channel: 'sms', maxAttempts: 3 } },
    { id: 'n-otp-verify-api',       type: 'api_request',    position: { x: 8720, y: 200 }, data: { label: 'Verify Loan Agreement OTP',   nodeType: 'api_request',    method: 'POST', endpoint: '/credit/drawdown/v1/verify_loan_agreement_otp', auth: 'bearer' } },
    { id: 'n-agreement-cond',       type: 'edge_operation', position: { x: 9040, y: 200 }, data: { label: 'Agreement Signed?',           nodeType: 'edge_operation', condition: 'data.isAgreementSigned === true', trueLabel: 'Signed', falseLabel: 'Failed' } },
    { id: 'n-agreement-transition', type: 'api_request',    position: { x: 9360, y: 200 }, data: { label: 'Transition: SANCTION_LETTER',  nodeType: 'api_request',    method: 'POST', endpoint: '/credit/loan/v1/transition_state', auth: 'bearer' } },

    // ── Step 8: Activation ────────────────────────────────────────────────
    { id: 'n-activate-api',    type: 'api_request', position: { x: 9680, y: 200 }, data: { label: 'Activate Credit Line',   nodeType: 'api_request', method: 'POST', endpoint: '/credit/loan/v1/transition_state', auth: 'bearer' } },
    { id: 'n-activation-wait', type: 'task',         position: { x: 10000, y: 200 }, data: { label: 'Poll Until CREDIT_LIVE', nodeType: 'task', assignedRole: 'credit_officer', dueHours: 24 } },

    // ── Step 9: Terminal Success ──────────────────────────────────────────
    { id: 'n-credit-live', type: 'end', position: { x: 10320, y: 200 }, data: { label: 'CREDIT_LIVE — Journey Complete', nodeType: 'end' } },

    // ── Error / retry states (y = 480) ────────────────────────────────────
    { id: 'n-bank-failed',    type: 'end', position: { x: 2160, y: 480 }, data: { label: 'Bank Verification Failed',           nodeType: 'end' } },
    { id: 'n-aadhaar-failed', type: 'end', position: { x: 4400, y: 480 }, data: { label: 'AADHAAR_FAILED — Retry',             nodeType: 'end' } },
    { id: 'n-selfie-failed',  type: 'end', position: { x: 5680, y: 480 }, data: { label: 'SELFIE_VERIFICATION_FAILED — Retry', nodeType: 'end' } },
    { id: 'n-enach-failed',   type: 'end', position: { x: 7280, y: 480 }, data: { label: 'ENACH_FAILED — Retry',               nodeType: 'end' } },
    { id: 'n-bureau-failed',  type: 'end', position: { x: 4400, y: 680 }, data: { label: 'BUREAU_FAILED — PAN Journey',        nodeType: 'end' } },
    { id: 'n-video-kyc',      type: 'end', position: { x: 5680, y: 680 }, data: { label: 'VIDEO_KYC_PENDING',                  nodeType: 'end' } },
    { id: 'n-terminate',      type: 'end', position: { x: 9200, y: 480 }, data: { label: 'TERMINATION — Application Rejected', nodeType: 'end' } },
  ],
  edges: [
    // ── Happy path ─────────────────────────────────────────────────────────
    { id: 'e1',  source: 'n-start',               target: 'n-get-state' },
    { id: 'e2',  source: 'n-get-state',            target: 'n-email-form' },
    { id: 'e3',  source: 'n-email-form',           target: 'n-email-transition-api' },
    { id: 'e4',  source: 'n-email-transition-api', target: 'n-add-bank-form' },
    { id: 'e5',  source: 'n-add-bank-form',        target: 'n-add-bank-api' },
    { id: 'e6',  source: 'n-add-bank-api',         target: 'n-bank-verify-cond' },
    { id: 'e7',  source: 'n-bank-verify-cond',     target: 'n-confirm-bank-form',   sourceHandle: 'true',  label: 'Verified' },
    { id: 'e8',  source: 'n-confirm-bank-form',    target: 'n-confirm-bank-api' },
    { id: 'e9',  source: 'n-confirm-bank-api',     target: 'n-bank-transition-api' },
    { id: 'e10', source: 'n-bank-transition-api',  target: 'n-digilocker-init-api' },
    { id: 'e11', source: 'n-digilocker-init-api',  target: 'n-digilocker-form' },
    { id: 'e12', source: 'n-digilocker-form',      target: 'n-digilocker-confirm' },
    { id: 'e13', source: 'n-digilocker-confirm',   target: 'n-aadhaar-result-cond' },
    { id: 'e14', source: 'n-aadhaar-result-cond',  target: 'n-selfie-creds-api',    sourceHandle: 'true',  label: '→ Selfie' },
    { id: 'e15', source: 'n-selfie-creds-api',     target: 'n-selfie-form' },
    { id: 'e16', source: 'n-selfie-form',          target: 'n-selfie-confirm-api' },
    { id: 'e17', source: 'n-selfie-confirm-api',   target: 'n-selfie-result-cond' },
    { id: 'e18', source: 'n-selfie-result-cond',   target: 'n-enach-init-api',      sourceHandle: 'true',  label: '→ eNach' },
    { id: 'e19', source: 'n-enach-init-api',       target: 'n-enach-form' },
    { id: 'e20', source: 'n-enach-form',           target: 'n-enach-wait-api' },
    { id: 'e21', source: 'n-enach-wait-api',       target: 'n-waiting-enach' },
    { id: 'e22', source: 'n-waiting-enach',        target: 'n-enach-result-cond' },
    { id: 'e23', source: 'n-enach-result-cond',    target: 'n-kfs-api',             sourceHandle: 'true',  label: '→ Loan Offer' },
    { id: 'e24', source: 'n-kfs-api',              target: 'n-offer-screen' },
    { id: 'e25', source: 'n-offer-screen',         target: 'n-otp-gen-api' },
    { id: 'e26', source: 'n-otp-gen-api',          target: 'n-otp-sign' },
    { id: 'e27', source: 'n-otp-sign',             target: 'n-otp-verify-api' },
    { id: 'e28', source: 'n-otp-verify-api',       target: 'n-agreement-cond' },
    { id: 'e29', source: 'n-agreement-cond',       target: 'n-agreement-transition', sourceHandle: 'true', label: 'Signed' },
    { id: 'e30', source: 'n-agreement-transition', target: 'n-activate-api' },
    { id: 'e31', source: 'n-activate-api',         target: 'n-activation-wait' },
    { id: 'e32', source: 'n-activation-wait',      target: 'n-credit-live' },
    // ── Error branches ──────────────────────────────────────────────────────
    { id: 'e33', source: 'n-bank-verify-cond',    target: 'n-bank-failed',    sourceHandle: 'false', label: 'Failed' },
    { id: 'e34', source: 'n-aadhaar-result-cond', target: 'n-aadhaar-failed', sourceHandle: 'false', label: 'Aadhaar Failed' },
    { id: 'e35', source: 'n-selfie-result-cond',  target: 'n-selfie-failed',  sourceHandle: 'false', label: 'Selfie Failed' },
    { id: 'e36', source: 'n-enach-result-cond',   target: 'n-enach-failed',   sourceHandle: 'false', label: 'ENACH_FAILED' },
    { id: 'e37', source: 'n-selfie-result-cond',  target: 'n-video-kyc',      sourceHandle: 'false', label: 'Video KYC' },
    { id: 'e38', source: 'n-agreement-cond',      target: 'n-terminate',      sourceHandle: 'false', label: 'OTP Failed' },
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
])

// Linear happy-path transitions for the runtime demo flow.
const NEXT_STEP: Record<string, string> = {
  'step-kyc': 'step-otp',
  'step-otp': 'step-approved',
  // PICE LOS fallback — happy path only (used before builder compiles the graph)
  'n-email-form':        'n-add-bank-form',
  'n-add-bank-form':     'n-confirm-bank-form',
  'n-confirm-bank-form': 'n-digilocker-form',
  'n-digilocker-form':   'n-selfie-form',
  'n-selfie-form':       'n-enach-form',
  'n-enach-form':        'n-offer-screen',
  'n-offer-screen':      'n-otp-sign',
  'n-otp-sign':          'n-credit-live',
}
const PREV_STEP: Record<string, string> = {
  'step-otp':            'step-kyc',
  'n-add-bank-form':     'n-email-form',
  'n-confirm-bank-form': 'n-add-bank-form',
  'n-digilocker-form':   'n-confirm-bank-form',
  'n-selfie-form':       'n-digilocker-form',
  'n-enach-form':        'n-selfie-form',
  'n-offer-screen':      'n-enach-form',
  'n-otp-sign':          'n-offer-screen',
}
const TERMINAL_STEPS = new Set([
  'step-approved', 'step-rejected',
  'n-credit-live',
  'n-bank-failed', 'n-aadhaar-failed', 'n-selfie-failed', 'n-enach-failed',
  'n-bureau-failed', 'n-video-kyc', 'n-terminate',
])

// ─── Runtime session store ─────────────────────────────────────────────────────

interface SessionRecord {
  sessionId: string
  flowId: string
  tenantId: string
  currentStepId: string
  context: Record<string, unknown>
}
const sessions = new Map<string, SessionRecord>()

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
    const body = (await request.json().catch(() => ({}))) as { flowId?: string }
    const flowId = body.flowId ?? 'demo-flow'
    const sessionId = uid('sess')
    // Prefer the compiled builder graph; fall back to the canned demo step.
    const compiled = getRuntimeFlow(flowId)
    const firstStepId = compiled?.order[0] ?? 'step-kyc'
    const record: SessionRecord = {
      sessionId,
      flowId,
      tenantId: 'mock-tenant',
      currentStepId: firstStepId,
      context: {},
    }
    sessions.set(sessionId, record)
    const session: FlowSession = {
      sessionId,
      flowId,
      tenantId: record.tenantId,
      currentStepId: record.currentStepId,
      context: {},
      startedAt: now(),
    }
    return HttpResponse.json(session)
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
      if (session) session.currentStepId = nextStepId
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
