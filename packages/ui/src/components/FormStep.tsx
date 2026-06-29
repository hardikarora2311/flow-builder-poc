import { useState } from 'react'
import type { FieldDefinition, StepDefinition } from '@platform/core'

interface FormStepProps {
  step: StepDefinition
  isSubmitting: boolean
  onSubmit: (data: Record<string, unknown>) => void
}

function validateField(field: FieldDefinition, value: string): string | null {
  for (const rule of field.validation) {
    if (rule.type === 'required') {
      // Checkboxes: must be 'true' (checked). Others: must be non-empty.
      const empty = field.type === 'checkbox' ? value !== 'true' : !value.trim()
      if (empty) return rule.message
    }
    if (rule.type === 'minLength' && value.length < (rule.value as number))
      return rule.message
    if (rule.type === 'maxLength' && value.length > (rule.value as number))
      return rule.message
    if (rule.type === 'pattern' && !new RegExp(rule.value as string).test(value))
      return rule.message
    if (rule.type === 'phone' && !/^\+?[\d\s\-()]{8,15}$/.test(value))
      return rule.message
  }
  return null
}

// ─── Selfie / Camera capture UI ──────────────────────────────────────────────
function SelfieFormStep({ step, isSubmitting, onSubmit }: FormStepProps) {
  const [stage, setStage] = useState<'idle' | 'scanning' | 'done'>('idle')

  const handleCapture = () => {
    setStage('scanning')
    setTimeout(() => setStage('done'), 1800)
  }

  const handleContinue = () => {
    onSubmit({ selfieConsent: 'true', selfieResult: 'auto_approved' })
  }

  return (
    <>
      {/* Camera viewfinder */}
      <div style={{
        background: '#0f0f1a',
        borderRadius: '16px',
        padding: '20px 16px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '16px',
      }}>
        {/* Face oval */}
        <div style={{ position: 'relative', width: '160px', height: '192px' }}>
          {/* Corner guides */}
          {['top-left', 'top-right', 'bottom-left', 'bottom-right'].map((corner) => {
            const isTop = corner.startsWith('top')
            const isLeft = corner.endsWith('left')
            return (
              <span key={corner} style={{
                position: 'absolute',
                width: '24px', height: '24px',
                [isTop ? 'top' : 'bottom']: 0,
                [isLeft ? 'left' : 'right']: 0,
                borderColor: stage === 'done' ? '#4ade80' : stage === 'scanning' ? '#facc15' : '#60a5fa',
                borderStyle: 'solid',
                borderWidth: 0,
                [`border${isTop ? 'Top' : 'Bottom'}${isLeft ? 'Left' : 'Right'}Radius`]: '8px',
                [`border${isTop ? 'Top' : 'Bottom'}Width`]: '3px',
                [`border${isLeft ? 'Left' : 'Right'}Width`]: '3px',
                transition: 'border-color 0.4s',
              }} />
            )
          })}

          {/* Oval */}
          <div style={{
            position: 'absolute',
            inset: '12px 16px',
            border: `2px dashed ${stage === 'done' ? '#4ade80' : stage === 'scanning' ? '#facc15' : '#334155'}`,
            borderRadius: '50%',
            transition: 'border-color 0.4s',
          }} />

          {/* Face placeholder SVG */}
          <svg
            viewBox="0 0 80 96"
            width="80" height="96"
            style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', opacity: 0.35 }}
          >
            <ellipse cx="40" cy="36" rx="22" ry="28" fill="none" stroke="#94a3b8" strokeWidth="2" />
            <circle cx="30" cy="33" r="3.5" fill="#94a3b8" />
            <circle cx="50" cy="33" r="3.5" fill="#94a3b8" />
            <path d="M 30 48 Q 40 56 50 48" stroke="#94a3b8" strokeWidth="2" fill="none" strokeLinecap="round" />
            <path d="M 20 68 Q 40 90 60 68" stroke="#94a3b8" strokeWidth="2" fill="none" />
          </svg>

          {/* Scan line */}
          {stage === 'scanning' && (
            <div style={{
              position: 'absolute',
              left: '16px', right: '16px',
              height: '2px',
              background: 'linear-gradient(90deg, transparent, #facc15, transparent)',
              animation: 'scanline 0.9s linear infinite',
              top: '20%',
            }} />
          )}

          {/* Done check */}
          {stage === 'done' && (
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{
                width: '48px', height: '48px', borderRadius: '50%',
                background: '#16a34a',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="24" height="20" viewBox="0 0 24 20">
                  <path d="M2 10L9 17L22 3" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                </svg>
              </div>
            </div>
          )}
        </div>

        {/* Status */}
        <p style={{
          fontSize: '12px', margin: 0, textAlign: 'center',
          color: stage === 'done' ? '#4ade80' : stage === 'scanning' ? '#fde047' : '#94a3b8',
          transition: 'color 0.4s',
        }}>
          {stage === 'idle' ? 'Position your face within the frame' : stage === 'scanning' ? 'Scanning face…' : 'Face verified ✓'}
        </p>

        {/* Powered by */}
        <p style={{ fontSize: '10px', color: '#475569', margin: 0 }}>Powered by HyperVerge</p>
      </div>

      <style>{`
        @keyframes scanline {
          0%   { top: 20%; }
          50%  { top: 75%; }
          100% { top: 20%; }
        }
      `}</style>

      {stage === 'idle' && (
        <button className="pf-btn" onClick={handleCapture} disabled={isSubmitting}>
          Start Face Scan
        </button>
      )}
      {stage === 'scanning' && (
        <button className="pf-btn" disabled style={{ opacity: 0.7 }}>Scanning…</button>
      )}
      {stage === 'done' && (
        <button className="pf-btn" onClick={handleContinue} disabled={isSubmitting}>
          {isSubmitting ? 'Processing…' : 'Continue'}
        </button>
      )}
    </>
  )
}

// ─── DigiLocker redirect UI ───────────────────────────────────────────────────
function DigiLockerFormStep({ step, isSubmitting, onSubmit }: FormStepProps) {
  const [redirecting, setRedirecting] = useState(false)
  const [done, setDone] = useState(false)

  const handleProceed = () => {
    setRedirecting(true)
    setTimeout(() => { setRedirecting(false); setDone(true) }, 2000)
  }

  const handleContinue = () => onSubmit({ aadhaarStatus: 'verified' })

  return (
    <>
      {/* DigiLocker branding card */}
      <div style={{
        border: '1px solid #e2e8f0',
        borderRadius: '14px',
        padding: '16px',
        marginBottom: '16px',
        background: '#f8fafc',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
          <div style={{
            width: '40px', height: '40px', borderRadius: '10px',
            background: '#1e40af',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '18px',
          }}>🔐</div>
          <div>
            <p style={{ margin: 0, fontWeight: 700, fontSize: '14px', color: '#1e293b' }}>DigiLocker</p>
            <p style={{ margin: 0, fontSize: '11px', color: '#64748b' }}>Ministry of Electronics &amp; IT, GoI</p>
          </div>
        </div>

        {/* Steps */}
        {['You will be redirected to DigiLocker', 'Authenticate with Aadhaar OTP or face ID', 'Share your Aadhaar XML securely'].map((text, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '8px' }}>
            <span style={{
              width: '20px', height: '20px', borderRadius: '50%',
              background: done ? '#16a34a' : '#1e40af',
              color: '#fff', fontSize: '11px', fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              transition: 'background 0.4s',
            }}>
              {done ? '✓' : i + 1}
            </span>
            <p style={{ margin: 0, fontSize: '12px', color: '#374151', lineHeight: '1.4' }}>{text}</p>
          </div>
        ))}
      </div>

      {!done ? (
        <button className="pf-btn" onClick={handleProceed} disabled={isSubmitting || redirecting}>
          {redirecting ? 'Redirecting to DigiLocker…' : 'Proceed to DigiLocker'}
        </button>
      ) : (
        <button className="pf-btn" onClick={handleContinue} disabled={isSubmitting}
          style={{ background: '#16a34a' }}>
          {isSubmitting ? 'Processing…' : 'Aadhaar Verified ✓ — Continue'}
        </button>
      )}
    </>
  )
}

// ─── eNach mandate UI ─────────────────────────────────────────────────────────
function EnachFormStep({ step, isSubmitting, onSubmit }: FormStepProps) {
  const [processing, setProcessing] = useState(false)
  const [done, setDone] = useState(false)

  const handleSetup = () => {
    setProcessing(true)
    setTimeout(() => { setProcessing(false); setDone(true) }, 2000)
  }

  const handleContinue = () => onSubmit({ nachStatus: 'registered' })

  return (
    <>
      {/* Mandate details card */}
      <div style={{
        border: '1px solid #e2e8f0',
        borderRadius: '14px',
        padding: '16px',
        marginBottom: '16px',
        background: '#f8fafc',
      }}>
        <p style={{ margin: '0 0 10px', fontWeight: 700, fontSize: '13px', color: '#0f172a' }}>
          NACH Mandate Details
        </p>
        {[
          ['Debit Type',    'Maximum Amount'],
          ['Amount (₹)',    '₹ 5,000 / month'],
          ['Frequency',     'Monthly'],
          ['Start Date',    'As per disbursement'],
          ['Debit Account', 'HDFC **** 4521'],
          ['Bank',          'HDFC Bank'],
        ].map(([label, value]) => (
          <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: '12px', color: '#64748b' }}>{label}</span>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#1e293b' }}>{value}</span>
          </div>
        ))}
        {done && (
          <div style={{
            marginTop: '10px', padding: '8px 10px', borderRadius: '8px',
            background: '#dcfce7', border: '1px solid #bbf7d0',
            display: 'flex', alignItems: 'center', gap: '6px',
          }}>
            <span style={{ color: '#16a34a', fontSize: '14px' }}>✓</span>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#15803d' }}>Mandate Registered</span>
          </div>
        )}
      </div>

      {!done ? (
        <button className="pf-btn" onClick={handleSetup} disabled={isSubmitting || processing}>
          {processing ? 'Setting up mandate…' : 'Proceed to Bank Portal'}
        </button>
      ) : (
        <button className="pf-btn" onClick={handleContinue} disabled={isSubmitting}
          style={{ background: '#16a34a' }}>
          {isSubmitting ? 'Processing…' : 'Mandate Active ✓ — Continue'}
        </button>
      )}
    </>
  )
}

// ─── Loan Offer / KFS screen ─────────────────────────────────────────────────
function LoanOfferFormStep({ step, isSubmitting, onSubmit }: FormStepProps) {
  const kfs = (step.uiConfig as Record<string, unknown>).kfs as Record<string, string> | undefined
  const rows = kfs ? Object.entries(kfs) : []

  const labelMap: Record<string, string> = {
    principalAmount: 'Loan Amount',
    disbursedAmount: 'Amount Disbursed',
    tenure: 'Tenure',
    emiAmount: 'Monthly EMI',
    interestRate: 'Interest Rate',
    totalInterest: 'Total Interest',
    processingFee: 'Processing Fee',
    totalRepayable: 'Total Repayable',
  }

  const highlight = new Set(['emiAmount', 'totalRepayable'])

  return (
    <>
      {/* KFS card */}
      <div style={{
        border: '1px solid #e2e8f0',
        borderRadius: '14px',
        overflow: 'hidden',
        marginBottom: '16px',
      }}>
        {/* Card header */}
        <div style={{
          background: '#1e3a8a',
          padding: '10px 14px',
          display: 'flex', alignItems: 'center', gap: '8px',
        }}>
          <span style={{ fontSize: '14px' }}>📄</span>
          <span style={{ color: '#fff', fontSize: '12px', fontWeight: 700, letterSpacing: '0.05em' }}>
            KEY FACT STATEMENT
          </span>
          <span style={{ marginLeft: 'auto', color: '#93c5fd', fontSize: '10px' }}>As per RBI guidelines</span>
        </div>

        {/* Rows */}
        <div style={{ background: '#fff' }}>
          {rows.map(([key, value], i) => (
            <div key={key} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '9px 14px',
              background: highlight.has(key) ? '#eff6ff' : i % 2 === 0 ? '#fff' : '#f8fafc',
              borderTop: i > 0 ? '1px solid #f1f5f9' : undefined,
            }}>
              <span style={{ fontSize: '12px', color: '#64748b' }}>{labelMap[key] ?? key}</span>
              <span style={{
                fontSize: highlight.has(key) ? '13px' : '12px',
                fontWeight: highlight.has(key) ? 700 : 600,
                color: highlight.has(key) ? '#1e40af' : '#1e293b',
              }}>{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Disclaimer */}
      <p style={{ fontSize: '10px', color: '#94a3b8', marginBottom: '14px', lineHeight: '1.5' }}>
        By tapping "Accept &amp; Sign" you confirm you have read and agree to the KFS, loan agreement, and authorise disbursement to your registered bank account.
      </p>

      <button className="pf-btn" onClick={() => onSubmit({ offerAccepted: 'true' })} disabled={isSubmitting}>
        {isSubmitting ? 'Processing…' : step.copy.submitLabel}
      </button>
    </>
  )
}

// ─── Generic form step ────────────────────────────────────────────────────────
export function FormStep({ step, isSubmitting, onSubmit }: FormStepProps) {
  // Special KYC variants
  const variant = (step.uiConfig as Record<string, string>).variant
  if (variant === 'selfie')      return <SelfieFormStep step={step} isSubmitting={isSubmitting} onSubmit={onSubmit} />
  if (variant === 'digilocker')  return <DigiLockerFormStep step={step} isSubmitting={isSubmitting} onSubmit={onSubmit} />
  if (variant === 'enach')       return <EnachFormStep step={step} isSubmitting={isSubmitting} onSubmit={onSubmit} />
  if (variant === 'loan-offer')  return <LoanOfferFormStep step={step} isSubmitting={isSubmitting} onSubmit={onSubmit} />

  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(step.fields.map((f) => [f.id, f.type === 'checkbox' ? 'false' : '']))
  )
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  const handleChange = (fieldId: string, value: string) => {
    setValues((prev) => ({ ...prev, [fieldId]: value }))
    if (touched[fieldId] || errors[fieldId]) {
      const field = step.fields.find((f) => f.id === fieldId)!
      const err = validateField(field, value)
      setErrors((prev) => ({ ...prev, [fieldId]: err ?? '' }))
    }
  }

  const handleBlur = (fieldId: string) => {
    setTouched((prev) => ({ ...prev, [fieldId]: true }))
    const field = step.fields.find((f) => f.id === fieldId)!
    const err = validateField(field, values[fieldId] ?? '')
    setErrors((prev) => ({ ...prev, [fieldId]: err ?? '' }))
  }

  const handleSubmit = () => {
    const newErrors: Record<string, string> = {}
    let valid = true
    for (const field of step.fields) {
      const err = validateField(field, values[field.id] ?? '')
      if (err) { newErrors[field.id] = err; valid = false }
    }
    setErrors(newErrors)
    setTouched(Object.fromEntries(step.fields.map((f) => [f.id, true])))
    if (valid) onSubmit(values)
  }

  return (
    <>
      <div className="pf-fields">
        {step.fields.map((field) => (
          <div key={field.id} className={`pf-field-wrapper${field.type === 'checkbox' ? ' pf-field-wrapper--checkbox' : ''}`}>
            {field.type === 'checkbox' ? (
              /* No htmlFor — input is nested inside label; htmlFor on a wrapping label double-toggles */
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
                <input type="checkbox" className="sr-only"
                  checked={values[field.id] === 'true'}
                  onChange={(e) => {
                    const v = e.target.checked ? 'true' : 'false'
                    handleChange(field.id, v)
                    setTouched((prev) => ({ ...prev, [field.id]: true }))
                  }}
                  aria-invalid={!!errors[field.id]}
                />
                <span style={{
                  display: 'inline-flex', flexShrink: 0, alignItems: 'center', justifyContent: 'center',
                  width: '20px', height: '20px', marginTop: '2px',
                  borderRadius: '5px', border: `2px solid ${values[field.id] === 'true' ? '#3b6ee0' : '#cbd5e1'}`,
                  background: values[field.id] === 'true' ? '#3b6ee0' : '#fff', transition: 'all 0.15s',
                  pointerEvents: 'none',
                }}>
                  {values[field.id] === 'true' && (
                    <svg width="12" height="9" viewBox="0 0 12 9" fill="none">
                      <path d="M1 4L4.5 7.5L11 1" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </span>
                <span style={{ fontSize: '14px', lineHeight: '1.4', color: '#374151' }}>
                  {field.label}
                  {field.required && <span style={{ color: '#ef4444', marginLeft: '2px' }}>*</span>}
                </span>
              </label>
            ) : (
              <>
                <label className="pf-label" htmlFor={field.id}>
                  {field.label}
                  {field.required && <span className="pf-required" aria-hidden="true">*</span>}
                </label>
                {field.type === 'select' ? (
                  <select id={field.id} className={`pf-select${errors[field.id] ? ' pf-select--error' : ''}`}
                    value={values[field.id] ?? ''} onChange={(e) => handleChange(field.id, e.target.value)}
                    onBlur={() => handleBlur(field.id)} aria-invalid={!!errors[field.id]}
                    aria-describedby={errors[field.id] ? `${field.id}-error` : undefined}>
                    <option value="">Select...</option>
                    {field.options?.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                ) : (
                  <input id={field.id} type={field.type === 'phone' ? 'tel' : field.type}
                    className={`pf-input${errors[field.id] ? ' pf-input--error' : ''}`}
                    value={values[field.id] ?? ''} onChange={(e) => handleChange(field.id, e.target.value)}
                    onBlur={() => handleBlur(field.id)} placeholder={field.placeholder}
                    aria-invalid={!!errors[field.id]}
                    aria-describedby={errors[field.id] ? `${field.id}-error` : undefined}
                  />
                )}
              </>
            )}
            {errors[field.id] && (
              <p id={`${field.id}-error`} className="pf-field-error" role="alert">{errors[field.id]}</p>
            )}
          </div>
        ))}
      </div>
      <button className="pf-btn" onClick={handleSubmit} disabled={isSubmitting} aria-busy={isSubmitting}>
        {isSubmitting ? 'Processing...' : step.copy.submitLabel}
      </button>
    </>
  )
}
