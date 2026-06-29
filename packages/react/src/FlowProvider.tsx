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
} from '@platform/core'
import { DEFAULT_THEME } from '@platform/core'

interface FlowContextValue {
  state: EngineState
  step: StepDefinition | null
  session: FlowSession | null
  theme: ThemeConfig
  submit: (data: Record<string, unknown>) => Promise<void>
  back: () => Promise<void>
  error: Error | null
  retryable: boolean
  retry: () => void
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

  const startEngine = useCallback(() => {
    const engine = new FlowEngine(config)
    engineRef.current = engine

    if (containerRef.current) {
      engine.setThemeContainer(containerRef.current)
    }

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

    engine.init()

    return () => {
      unsubs.forEach((u) => u())
      engine.removeAllListeners()
      engineRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.sessionToken, config.flowId, config.apiBaseUrl])

  useEffect(() => {
    return startEngine()
  }, [startEngine])

  const submit = useCallback(async (data: Record<string, unknown>) => {
    await engineRef.current?.submit(data)
  }, [])

  const back = useCallback(async () => {
    await engineRef.current?.back()
  }, [])

  const retry = useCallback(() => {
    startEngine()
  }, [startEngine])

  const ctx: FlowContextValue = {
    state,
    step,
    session,
    theme,
    submit,
    back,
    error,
    retryable,
    retry,
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
