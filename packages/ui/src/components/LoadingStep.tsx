import { useEffect, useState } from 'react'
import type { StepDefinition, StepUIConfig } from '@platform/core'

interface LoadingStepProps {
  step: StepDefinition
}

export function LoadingStep({ step }: LoadingStepProps) {
  const uiConfig = step.uiConfig as StepUIConfig
  const timeout = uiConfig.pollingTimeout ?? 0
  const isPolling = (uiConfig.pollingInterval ?? 0) > 0 && timeout > 0

  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (!isPolling) return
    setElapsed(0)
    const t = setInterval(() => setElapsed((e) => Math.min(e + 1, timeout)), 1000)
    return () => clearInterval(t)
  }, [step.id, isPolling, timeout])

  const pct = isPolling && timeout > 0 ? Math.min((elapsed / timeout) * 100, 100) : 0

  return (
    <div className="pf-container" aria-busy="true">
      <div className="pf-loading-pulse">
        <div className="pf-loading-dot" />
        <div className="pf-loading-dot" />
        <div className="pf-loading-dot" />
      </div>
      {step.subtitle && (
        <p className="pf-subtitle" style={{ textAlign: 'center', marginTop: '12px' }}>
          {step.subtitle}
        </p>
      )}
      {isPolling && (
        <div style={{ marginTop: '20px', padding: '0 24px' }}>
          <div style={{
            height: '4px',
            borderRadius: '4px',
            background: 'color-mix(in srgb, var(--pf-color-primary) 15%, transparent)',
            overflow: 'hidden',
          }}>
            <div style={{
              height: '100%',
              width: `${pct}%`,
              background: 'var(--pf-color-primary)',
              borderRadius: '4px',
              transition: 'width 1s linear',
            }} />
          </div>
          <p style={{
            fontSize: '11px',
            color: 'var(--pf-color-text-muted)',
            textAlign: 'center',
            marginTop: '8px',
          }}>
            Checking status…
          </p>
        </div>
      )}
    </div>
  )
}
