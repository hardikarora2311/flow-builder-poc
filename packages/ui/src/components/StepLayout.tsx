import type { ReactNode } from 'react'
import type { StepDefinition } from '@platform/core'

interface StepLayoutProps {
  step: StepDefinition
  isSubmitting: boolean
  onBack: () => void
  children: ReactNode
}

export function StepLayout({ step, isSubmitting, onBack, children }: StepLayoutProps) {
  return (
    <div className="pf-container">
      <div className="pf-header">
        {step.allowBack && (
          <button
            className="pf-back-btn"
            onClick={onBack}
            disabled={isSubmitting}
            aria-label="Go back to previous step"
          >
            ← {step.copy.backLabel ?? 'Back'}
          </button>
        )}
        <h1 className="pf-title">{step.title}</h1>
        {step.subtitle && <p className="pf-subtitle">{step.subtitle}</p>}
      </div>
      {children}
    </div>
  )
}
