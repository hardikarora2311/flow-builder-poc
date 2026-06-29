import type { StepDefinition } from '@platform/core'

interface LoadingStepProps {
  step: StepDefinition
}

export function LoadingStep({ step }: LoadingStepProps) {
  return (
    <div className="pf-container" aria-busy="true">
      <div className="pf-loading-pulse">
        <div className="pf-loading-dot" />
        <div className="pf-loading-dot" />
        <div className="pf-loading-dot" />
      </div>
      <p className="pf-subtitle" style={{ textAlign: 'center' }}>
        {step.copy.submitLabel}
      </p>
    </div>
  )
}
