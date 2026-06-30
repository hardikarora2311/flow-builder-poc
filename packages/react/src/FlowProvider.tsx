import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  type ReactNode,
} from 'react'
import { FlowEngine } from '@platform/core'
import type {
  FlowConfig,
  EngineState,
  StepDefinition,
  FlowSession,
  ThemeConfig,
  StepOverrideProps,
} from '@platform/core'
import { DEFAULT_THEME } from '@platform/core'

interface FlowContextValue {
  state: EngineState
  step: StepDefinition | null
  session: FlowSession | null
  theme: ThemeConfig
  config: FlowConfig
  submit: (data: Record<string, unknown>) => Promise<void>
  back: () => Promise<void>
  error: Error | null
  retryable: boolean
  retry: () => void
  stepOverrides: Record<string, React.ComponentType<StepOverrideProps>>
}

const FlowContext = createContext<FlowContextValue | null>(null)

interface FlowProviderProps extends FlowConfig {
  children?: ReactNode
}

export function FlowProvider({ children, ...config }: FlowProviderProps) {
  const engineRef = useRef<FlowEngine | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [state, setState] = useState<EngineState>('idle')
  const [step, setStep] = useState<StepDefinition | null>(null)
  const [session, setSession] = useState<FlowSession | null>(null)
  const [theme, setTheme] = useState<ThemeConfig>(DEFAULT_THEME)
  const [error, setError] = useState<Error | null>(null)
  const [retryable, setRetryable] = useState(false)

  // Stable reference for stepOverrides — avoid re-triggering engine on re-render
  const stepOverridesRef = useRef(config.stepOverrides ?? {})
  stepOverridesRef.current = config.stepOverrides ?? {}

  const buildEngine = useCallback(() => {
    const engine = new FlowEngine(config)
    engineRef.current = engine

    const unsubs = [
      engine.on('stateChange', ({ to }) => setState(to)),
      engine.on('stepChange', ({ step: s, session: sess }) => {
        setStep(s)
        setSession(sess)
        setError(null)
        setTheme(engine.getCurrentTheme())
      }),
      engine.on('error', ({ error: e, retryable: r }) => {
        setError(e)
        setRetryable(r)
      }),
      engine.on('complete', () => {
        setTheme(engine.getCurrentTheme())
      }),
    ]

    return { engine, unsubs }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.sessionToken, config.flowId, config.apiBaseUrl])

  const retry = useCallback(() => {
    // Re-run the effect by creating a new engine
    if (engineRef.current) {
      engineRef.current.destroy()
      engineRef.current = null
    }
    const { engine, unsubs } = buildEngine()
    // setThemeContainer before init so applyCoreTheme writes to the scoped container
    engine.setThemeContainer(containerRef.current)
    engine.init()
    return () => {
      unsubs.forEach((u) => u())
      engine.destroy()
      engineRef.current = null
    }
  }, [buildEngine])

  useEffect(() => {
    const { engine, unsubs } = buildEngine()
    // containerRef.current is populated after mount — must call before init()
    engine.setThemeContainer(containerRef.current)
    engine.init()

    return () => {
      unsubs.forEach((u) => u())
      engine.destroy()
      engineRef.current = null
    }
  }, [buildEngine])

  const submit = useCallback(async (data: Record<string, unknown>) => {
    await engineRef.current?.submit(data)
  }, [])

  const back = useCallback(async () => {
    await engineRef.current?.back()
  }, [])

  const ctx: FlowContextValue = {
    state,
    step,
    session,
    theme,
    config,
    submit,
    back,
    error,
    retryable,
    retry,
    stepOverrides: stepOverridesRef.current as Record<string, React.ComponentType<StepOverrideProps>>,
  }

  return (
    <FlowContext.Provider value={ctx}>
      <div ref={containerRef}>{children}</div>
    </FlowContext.Provider>
  )
}

export function useFlow(): FlowContextValue {
  const ctx = useContext(FlowContext)
  if (!ctx) throw new Error('useFlow must be used inside <FlowProvider>')
  return ctx
}
