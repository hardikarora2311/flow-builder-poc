import { EventEmitter } from './EventEmitter'
import { themeCache } from './ThemeCache'
import { createApiClient } from '../api/client'
import { DEFAULT_THEME } from '../types'
import type {
  FlowConfig,
  FlowSession,
  FlowEngineEvents,
  EngineState,
  StepDefinition,
  ThemeConfig,
  SessionTokenPayload,
} from '../types'

function decodeJWT(token: string): SessionTokenPayload {
  try {
    const payload = token.split('.')[1]
    if (!payload) throw new Error('Invalid JWT structure')
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
    return JSON.parse(decoded) as SessionTokenPayload
  } catch {
    // For MSW mock tokens that aren't real JWTs, return a default payload
    return {
      sessionId: 'mock-session',
      tenantId: 'mock-tenant',
      flowId: 'mock-flow',
      userId: 'mock-user',
      iat: Date.now() / 1000,
      exp: Date.now() / 1000 + 3600,
      themeHash: 'mock-hash',
      themeCore: {
        primary: '#2563EB',
        background: '#FFFFFF',
        fontFamily: 'system-ui, sans-serif',
        borderRadiusButton: '8px',
      },
    }
  }
}

function mergeTheme(base: ThemeConfig, overrides?: Partial<ThemeConfig>): ThemeConfig {
  if (!overrides) return base
  const logo = overrides.logo ?? base.logo
  return {
    colors: { ...base.colors, ...overrides.colors },
    typography: { ...base.typography, ...overrides.typography },
    spacing: { ...base.spacing, ...overrides.spacing },
    borderRadius: { ...base.borderRadius, ...overrides.borderRadius },
    // Only include `logo` when defined — exactOptionalPropertyTypes forbids
    // assigning `undefined` to an optional property.
    ...(logo ? { logo } : {}),
  }
}

export class FlowEngine extends EventEmitter<FlowEngineEvents> {
  private state: EngineState = 'idle'
  private session: FlowSession | null = null
  private currentStep: StepDefinition | null = null
  private currentTheme: ThemeConfig = DEFAULT_THEME
  private api: ReturnType<typeof createApiClient>
  private themeContainer: HTMLElement | null = null

  constructor(private config: FlowConfig) {
    super()
    this.api = createApiClient({
      baseUrl: config.apiBaseUrl,
      token: config.sessionToken,
    })
  }

  async init(): Promise<void> {
    this.transition('loading')

    try {
      const payload = decodeJWT(this.config.sessionToken)

      // Apply core theme tokens synchronously — zero-latency, prevents FOUC
      this.applyCoreTheme(payload.themeCore)

      // Parallel: fetch full theme + bootstrap session
      const [session, fullTheme] = await Promise.all([
        this.api.post<FlowSession>('/sessions/bootstrap', {
          flowId: this.config.flowId,
        }),
        this.resolveFullTheme(payload),
      ])

      // Apply full theme (may cause one additional paint — imperceptible)
      const mergedTheme = mergeTheme(fullTheme, this.config.theme)
      this.applyFullTheme(mergedTheme)
      this.currentTheme = mergedTheme

      this.session = session
      await this.loadStep(session.currentStepId)
    } catch (err) {
      this.handleError(err, 'init')
    }
  }

  async submit(data: Record<string, unknown>): Promise<void> {
    if (!this.session || !this.currentStep) return
    this.transition('submitting')

    try {
      const result = await this.api.post<
        { nextStepId: string } | { complete: true; result: Record<string, unknown> }
      >('/sessions/submit', {
        sessionId: this.session.sessionId,
        stepId: this.currentStep.id,
        data,
      })

      if ('complete' in result && result.complete) {
        this.transition('complete')
        const flowResult = {
          sessionId: this.session.sessionId,
          completedAt: new Date().toISOString(),
          data: result.result,
        }
        this.emit('complete', { result: flowResult })
        this.config.onComplete?.(flowResult)
      } else if ('nextStepId' in result) {
        await this.loadStep(result.nextStepId)
      }
    } catch (err) {
      this.handleError(err, 'submit')
    }
  }

  async back(): Promise<void> {
    if (!this.session || !this.currentStep?.allowBack) return
    this.transition('loading')

    try {
      const result = await this.api.post<{ previousStepId: string }>('/sessions/back', {
        sessionId: this.session.sessionId,
        currentStepId: this.currentStep.id,
      })
      await this.loadStep(result.previousStepId)
    } catch (err) {
      this.handleError(err, 'back')
    }
  }

  setThemeContainer(el: HTMLElement | null): void {
    this.themeContainer = el
    if (el && this.currentTheme) {
      this.injectThemeVars(el, this.currentTheme)
    }
  }

  getCurrentTheme(): ThemeConfig {
    return this.currentTheme
  }

  getState(): EngineState {
    return this.state
  }

  getCurrentStep(): StepDefinition | null {
    return this.currentStep
  }

  getSession(): FlowSession | null {
    return this.session
  }

  private async loadStep(stepId: string): Promise<void> {
    this.transition('loading')
    try {
      const step = await this.api.get<StepDefinition>(`/steps/${stepId}`)
      this.currentStep = step
      this.transition('active')
      this.emit('stepChange', { step, session: this.session! })
    } catch (err) {
      this.handleError(err, 'loadStep')
    }
  }

  private async resolveFullTheme(payload: SessionTokenPayload): Promise<ThemeConfig> {
    const cached = themeCache.get(payload.tenantId)
    if (cached?.hash === payload.themeHash) return cached.theme

    try {
      // In production: fetch from CloudFront CDN
      // In POC: fetch from backend which returns the stored theme
      const theme = await this.api.get<ThemeConfig>(
        `/tenants/theme?hash=${payload.themeHash}`
      )
      themeCache.set(payload.tenantId, { hash: payload.themeHash, theme })
      return theme
    } catch {
      // Fallback to default — never crash because of theme
      return DEFAULT_THEME
    }
  }

  private applyCoreTheme(core: SessionTokenPayload['themeCore']): void {
    // Apply to document root immediately — available before first paint
    if (typeof document === 'undefined') return
    const root = document.documentElement
    root.style.setProperty('--pf-color-primary', core.primary)
    root.style.setProperty('--pf-color-background', core.background)
    root.style.setProperty('--pf-font-family', core.fontFamily)
    root.style.setProperty('--pf-radius-button', core.borderRadiusButton)
  }

  private applyFullTheme(theme: ThemeConfig): void {
    const target = this.themeContainer ?? document.documentElement
    this.injectThemeVars(target, theme)
  }

  private injectThemeVars(el: HTMLElement, theme: ThemeConfig): void {
    const vars: Record<string, string> = {
      '--pf-color-primary': theme.colors.primary,
      '--pf-color-secondary': theme.colors.secondary,
      '--pf-color-background': theme.colors.background,
      '--pf-color-surface': theme.colors.surface,
      '--pf-color-text': theme.colors.text,
      '--pf-color-text-muted': theme.colors.textMuted,
      '--pf-color-error': theme.colors.error,
      '--pf-color-success': theme.colors.success,
      '--pf-font-family': theme.typography.fontFamily,
      '--pf-font-size-base': theme.typography.baseFontSize,
      '--pf-font-weight-heading': theme.typography.headingWeight,
      '--pf-container-max-width': theme.spacing.containerMaxWidth,
      '--pf-container-padding': theme.spacing.containerPadding,
      '--pf-field-gap': theme.spacing.fieldGap,
      '--pf-radius-button': theme.borderRadius.button,
      '--pf-radius-input': theme.borderRadius.input,
      '--pf-radius-card': theme.borderRadius.card,
    }
    Object.entries(vars).forEach(([k, v]) => el.style.setProperty(k, v))
  }

  private transition(next: EngineState): void {
    const prev = this.state
    this.state = next
    this.emit('stateChange', { from: prev, to: next })
  }

  private handleError(err: unknown, context: string): void {
    const error = err instanceof Error ? err : new Error(String(err))
    const status = (error as Error & { status?: number }).status
    const retryable = !status || status >= 500
    this.transition('error')
    this.emit('error', { error, context, retryable })
    this.config.onError?.({
      code: status ? `HTTP_${status}` : 'NETWORK_ERROR',
      message: error.message,
      retryable,
    })
  }
}
