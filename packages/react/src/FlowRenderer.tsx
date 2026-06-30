import { useFlow } from './FlowProvider'
import { SubFlowStep } from './SubFlowStep'
import {
  StepLayout,
  FormStep,
  OTPStep,
  DecisionStep,
  LoadingStep,
  ErrorState,
  LoadingSkeleton,
  ThemeProvider,
} from '@platform/ui'
import type { StepOverrideProps } from '@platform/core'
import '@platform/ui/styles.css'

export function FlowRenderer() {
  const { state, step, session, theme, config, submit, back, error, retryable, retry, stepOverrides } = useFlow()

  if (state === 'idle' || state === 'loading') {
    return (
      <ThemeProvider theme={theme}>
        <LoadingSkeleton />
      </ThemeProvider>
    )
  }

  if ((state === 'error' || error) && error) {
    return (
      <ThemeProvider theme={theme}>
        <ErrorState error={error} retryable={retryable} onRetry={retry} />
      </ThemeProvider>
    )
  }

  if (state === 'complete' || !step) return null

  // Check for step-level override (lender-supplied custom component)
  const Override = stepOverrides[step.id] as React.ComponentType<StepOverrideProps> | undefined
  if (Override) {
    return (
      <ThemeProvider theme={theme}>
        <Override
          step={step}
          isSubmitting={state === 'submitting'}
          onSubmit={submit}
          onBack={back}
        />
      </ThemeProvider>
    )
  }

  // Sub-flow — nested FlowProvider for flow_connector nodes
  if (step.type === 'sub-flow') {
    const parentCtx = {
      init: config.initialData ?? {},
      context: (session?.context ?? {}) as Record<string, Record<string, unknown>>,
      response: {},
      session: {
        sessionId: session?.sessionId ?? '',
        flowId: config.flowId,
        tenantId: session?.tenantId ?? '',
      },
    }
    return (
      <ThemeProvider theme={theme}>
        <SubFlowStep
          step={step}
          parentConfig={config}
          parentCtx={parentCtx}
          onComplete={(result) => submit(result.data)}
        />
      </ThemeProvider>
    )
  }

  return (
    <ThemeProvider theme={theme}>
      <StepLayout step={step} isSubmitting={state === 'submitting'} onBack={back}>
        {step.type === 'form' && (
          <FormStep step={step} isSubmitting={state === 'submitting'} onSubmit={submit} />
        )}
        {step.type === 'otp' && (
          <OTPStep step={step} isSubmitting={state === 'submitting'} onSubmit={submit} />
        )}
        {step.type === 'decision' && <DecisionStep step={step} />}
        {step.type === 'loading' && <LoadingStep step={step} />}
      </StepLayout>
    </ThemeProvider>
  )
}
