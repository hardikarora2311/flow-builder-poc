import { EventEmitter } from './EventEmitter'
import { themeCache } from './ThemeCache'
import { createApiClient } from '../api/client'
import { interpolate } from './interpolate'
import { DEFAULT_THEME } from '../types'
import type {
  FlowConfig,
  FlowSession,
  FlowEngineEvents,
  EngineState,
  StepDefinition,
  StepUIConfig,
  ThemeConfig,
  SessionTokenPayload,
  VariableContext,
} from '../types'

function decodeJWT(token: string): SessionTokenPayload {
  try {
    const payload = token.split('.')[1]
    if (!payload) throw new Error('Invalid JWT structure')
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
    return JSON.parse(decoded) as SessionTokenPayload
  } catch {
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
  private initialData: Record<string, unknown> = {}
  private lastApiResponse: Record<string, unknown> = {}

  // Polling
  private pollingTimer: ReturnType<typeof setInterval> | null = null
  private pollingAborted = false
  private pollingStepId: string | null = null

  constructor(private config: FlowConfig) {
    super()
    this.initialData = config.initialData ?? {}
    const apiConfig: Parameters<typeof createApiClient>[0] = {
      baseUrl: config.apiBaseUrl,
      token: config.sessionToken,
    }
    if (config.getRefreshedToken) apiConfig.onRefreshToken = config.getRefreshedToken
    this.api = createApiClient(apiConfig)
  }

  async init(): Promise<void> {
    this.transition('loading')

    try {
      const payload = decodeJWT(this.config.sessionToken)

      // Apply core theme tokens synchronously — zero-latency, prevents FOUC
      // Uses themeContainer if already set (scoped), otherwise document root
      this.applyCoreTheme(payload.themeCore)

      const [session, fullTheme] = await Promise.all([
        this.api.post<FlowSession>('/sessions/bootstrap', {
          flowId: this.config.flowId,
          initialData: this.initialData,
        }),
        this.resolveFullTheme(payload),
      ])

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
    this.stopPolling()
    this.transition('submitting')

    try {
      const result = await this.api.post<
        { nextStepId: string } | { complete: true; result: Record<string, unknown> }
      >('/sessions/submit', {
        sessionId: this.session.sessionId,
        stepId: this.currentStep.id,
        data,
      })

      // Store response for variable interpolation in subsequent nodes
      this.lastApiResponse = result as Record<string, unknown>

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
    this.stopPolling()
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

  getCurrentTheme(): ThemeConfig { return this.currentTheme }
  getState(): EngineState { return this.state }
  getCurrentStep(): StepDefinition | null { return this.currentStep }
  getSession(): FlowSession | null { return this.session }

  /** Resolve a template string against the current session context. */
  interpolate(template: string): string {
    return interpolate(template, this.buildCtx())
  }

  /** Clean up — call when the host component unmounts. */
  destroy(): void {
    this.stopPolling()
    this.removeAllListeners()
  }

  // ─── Private ────────────────────────────────────────────────────────────────

  private buildCtx(): VariableContext {
    const ctx = (this.session?.context ?? {}) as Record<string, unknown>
    // session.context is keyed by stepId; each value is the submitted form data
    const contextByStep: Record<string, Record<string, unknown>> = {}
    for (const [key, val] of Object.entries(ctx)) {
      if (val && typeof val === 'object' && !Array.isArray(val)) {
        contextByStep[key] = val as Record<string, unknown>
      }
    }
    return {
      init: this.initialData,
      context: contextByStep,
      response: this.lastApiResponse,
      session: {
        sessionId: this.session?.sessionId ?? '',
        flowId: this.config.flowId,
        tenantId: this.session?.tenantId ?? '',
      },
    }
  }

  private async loadStep(stepId: string): Promise<void> {
    this.stopPolling()
    this.transition('loading')
    try {
      const step = await this.api.get<StepDefinition>(`/steps/${stepId}`)
      this.currentStep = step
      this.transition('active')
      this.emit('stepChange', { step, session: this.session! })
      this.config.onStepChange?.(step, this.session!)

      // Start polling if the step declares a polling interval
      const uiConfig = step.uiConfig as StepUIConfig
      if (uiConfig.pollingInterval && uiConfig.pollingInterval > 0) {
        this.startPolling(step.id, uiConfig.pollingInterval, uiConfig.pollingTimeout ?? 120)
      }
    } catch (err) {
      this.handleError(err, 'loadStep')
    }
  }

  // ─── Polling ────────────────────────────────────────────────────────────────

  private startPolling(stepId: string, intervalSec: number, timeoutSec: number): void {
    this.pollingAborted = false
    this.pollingStepId = stepId
    const deadline = Date.now() + timeoutSec * 1000

    this.pollingTimer = setInterval(async () => {
      if (this.pollingAborted) return
      if (Date.now() > deadline) {
        this.stopPolling()
        this.handleError(new Error('Polling timeout — state did not advance'), 'polling')
        return
      }
      try {
        const result = await this.api.get<{ currentStepId: string }>(
          `/sessions/poll?sessionId=${this.session?.sessionId ?? ''}`
        )
        if (!this.pollingAborted && result.currentStepId !== stepId) {
          this.stopPolling()
          await this.loadStep(result.currentStepId)
        }
      } catch {
        // Swallow network hiccups — keep polling
      }
    }, intervalSec * 1000)
  }

  private stopPolling(): void {
    this.pollingAborted = true
    if (this.pollingTimer !== null) {
      clearInterval(this.pollingTimer)
      this.pollingTimer = null
    }
    this.pollingStepId = null
  }

  // ─── Theme ──────────────────────────────────────────────────────────────────

  private async resolveFullTheme(payload: SessionTokenPayload): Promise<ThemeConfig> {
    const cached = themeCache.get(payload.tenantId)
    if (cached?.hash === payload.themeHash) return cached.theme

    try {
      const theme = await this.api.get<ThemeConfig>(`/tenants/theme?hash=${payload.themeHash}`)
      themeCache.set(payload.tenantId, { hash: payload.themeHash, theme })
      return theme
    } catch {
      return DEFAULT_THEME
    }
  }

  private applyCoreTheme(core: SessionTokenPayload['themeCore']): void {
    if (typeof document === 'undefined') return
    // Use scoped container when available to support multiple FlowProviders on same page
    const target = this.themeContainer ?? document.documentElement
    target.style.setProperty('--pf-color-primary', core.primary)
    target.style.setProperty('--pf-color-background', core.background)
    target.style.setProperty('--pf-font-family', core.fontFamily)
    target.style.setProperty('--pf-radius-button', core.borderRadiusButton)
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
