import { useFlow } from './FlowProvider'
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
import '@platform/ui/styles.css'

export function FlowRenderer() {
  const { state, step, theme, submit, back, error, retryable, retry } = useFlow()

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
