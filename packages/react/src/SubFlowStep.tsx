import type { StepDefinition, FlowConfig, FlowResult, StepUIConfig, VariableContext } from '@platform/core'
import { interpolate, evalInputMap, parseMap } from '@platform/core'
import { FlowProvider } from './FlowProvider'
import { FlowRenderer } from './FlowRenderer'

interface SubFlowStepProps {
  step: StepDefinition
  parentConfig: FlowConfig
  parentCtx: VariableContext
  onComplete: (result: FlowResult) => void
}

/**
 * Renders a nested FlowProvider for flow_connector nodes.
 *
 * inputMap  — maps parent context values into the child flow's initialData
 * outputMap — maps child result data back into the parent's submit payload
 *
 * Format: "{{source}} -> target.path"
 */
export function SubFlowStep({ step, parentConfig, parentCtx, onComplete }: SubFlowStepProps) {
  const uiConfig = step.uiConfig as StepUIConfig
  const childFlowId = uiConfig.childFlowId ?? ''

  // Build child initialData from inputMap
  const childInitialData = uiConfig.inputMap
    ? evalInputMap(uiConfig.inputMap, parentCtx)
    : {}

  const handleChildComplete = (childResult: FlowResult) => {
    // Build output payload from outputMap
    const output: Record<string, unknown> = {}
    if (uiConfig.outputMap) {
      const childCtx: VariableContext = {
        init: {},
        context: { result: childResult.data as Record<string, unknown> },
        response: childResult.data as Record<string, unknown>,
        session: { sessionId: childResult.sessionId, flowId: childFlowId, tenantId: '' },
      }
      for (const { source, target } of parseMap(uiConfig.outputMap)) {
        const resolved = interpolate(source.replace(/^child\./, '{{'), childCtx)
        const key = target.split('.').pop()
        if (key && resolved !== source) output[key] = resolved
      }
    }
    onComplete({ ...childResult, data: { ...childResult.data, ...output } })
  }

  if (!childFlowId) {
    return (
      <div style={{ textAlign: 'center', padding: '32px 16px', color: '#6b7280', fontSize: '14px' }}>
        Sub-flow ID not configured. Set it in the Flow Connector inspector.
      </div>
    )
  }

  return (
    <FlowProvider
      {...parentConfig}
      flowId={childFlowId}
      initialData={childInitialData}
      onComplete={handleChildComplete}
    >
      <FlowRenderer />
    </FlowProvider>
  )
}
