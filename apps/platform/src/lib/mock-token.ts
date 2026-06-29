import type { SessionTokenPayload, ThemeConfig } from '@platform/core'

function base64url(obj: unknown): string {
  return btoa(JSON.stringify(obj))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

/**
 * Builds an unsigned JWT-shaped session token the SDK can decode. The "core"
 * theme tokens are inlined so the SDK can paint brand colours before the full
 * theme fetch resolves (mirrors the real zero-FOUC handshake).
 */
export function createMockSessionToken(opts: {
  flowId: string
  themeHash: string
  theme: ThemeConfig
  tenantId?: string
  userId?: string
}): string {
  const iat = Math.floor(Date.now() / 1000)
  const payload: SessionTokenPayload = {
    sessionId: `preview_${iat}`,
    tenantId: opts.tenantId ?? 'mock-tenant',
    flowId: opts.flowId,
    userId: opts.userId ?? 'preview-user',
    iat,
    exp: iat + 3600,
    themeHash: opts.themeHash,
    themeCore: {
      primary: opts.theme.colors.primary,
      background: opts.theme.colors.background,
      fontFamily: opts.theme.typography.fontFamily,
      borderRadiusButton: opts.theme.borderRadius.button,
    },
  }
  return [base64url({ alg: 'none', typ: 'JWT' }), base64url(payload), 'mocksig'].join('.')
}
