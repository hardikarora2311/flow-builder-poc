import type { StepDefinition } from '@platform/core'

interface DecisionStepProps {
  step: StepDefinition
}

export function DecisionStep({ step }: DecisionStepProps) {
  const variant = step.uiConfig.variant ?? 'approved'
  const isApproved = variant === 'approved'

  return (
    <div className={`pf-decision pf-decision--${variant}`}>
      <div className="pf-decision-icon" aria-hidden="true">
        {isApproved ? '✅' : '❌'}
      </div>
      <h2 className="pf-decision-title">{step.title}</h2>
      {step.subtitle && <p className="pf-subtitle">{step.subtitle}</p>}
    </div>
  )
}
