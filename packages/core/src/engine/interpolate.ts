import type { VariableContext } from '../types'

const TOKEN_RE = /\{\{([^}]+)\}\}/g

/**
 * Replaces {{path.to.value}} tokens in a string with values from VariableContext.
 *
 * Namespace mapping:
 *   {{init.field}}              → ctx.init.field  (initialData passed at SDK init)
 *   {{context.stepId.field}}    → ctx.context[stepId][field]  (form submission data)
 *   {{response.field}}          → ctx.response.field  (last API response)
 *   {{session.sessionId}}       → ctx.session.sessionId
 *
 * Missing keys return the original {{...}} token unchanged so gaps are visible
 * in dev/preview rather than silently corrupting API payloads.
 *
 * Values that are objects/arrays are JSON-stringified.
 * No eval, no code execution — purely a property accessor chain.
 */
export function interpolate(template: string, ctx: VariableContext): string {
  return template.replace(TOKEN_RE, (match, path: string) => {
    const segments = path.trim().split('.')
    if (segments.length === 0) return match

    const ns = segments[0]
    const rest = segments.slice(1)

    let value: unknown
    switch (ns) {
      case 'init':
        value = resolve(ctx.init, rest)
        break
      case 'context': {
        if (rest.length < 2) return match
        const stepId = rest[0]!
        const stepCtx = ctx.context[stepId]
        if (!stepCtx) return match
        value = resolve(stepCtx, rest.slice(1))
        break
      }
      case 'response':
        value = resolve(ctx.response, rest)
        break
      case 'session':
        value = resolve(ctx.session as Record<string, unknown>, rest)
        break
      default:
        return match
    }

    if (value === undefined || value === null) return match
    if (typeof value === 'object') return JSON.stringify(value)
    return String(value)
  })
}

function resolve(obj: Record<string, unknown>, path: string[]): unknown {
  let cur: unknown = obj
  for (const seg of path) {
    if (cur === null || cur === undefined || typeof cur !== 'object') return undefined
    cur = (cur as Record<string, unknown>)[seg]
  }
  return cur
}

/**
 * Parse an inputMap / outputMap string into structured line pairs.
 * Format: "{{source}} -> target.path.here"
 * Returns an array of { source, target } where source is a raw {{...}} expression
 * and target is a dotted property path.
 */
export interface MapLine {
  source: string  // e.g. "{{context.n-email-form.email}}"
  target: string  // e.g. "child.init.email"
}

export function parseMap(raw: string): MapLine[] {
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .flatMap((line) => {
      const idx = line.indexOf('->')
      if (idx === -1) return []
      return [{ source: line.slice(0, idx).trim(), target: line.slice(idx + 2).trim() }]
    })
}

/**
 * Evaluate an inputMap string against a source context to produce an object
 * where keys are the last segment of the target path.
 *
 * Example: "{{init.userId}} -> child.init.userId"
 * with ctx.init.userId = "u123"  →  { userId: "u123" }
 */
export function evalInputMap(raw: string, ctx: VariableContext): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const { source, target } of parseMap(raw)) {
    const resolved = interpolate(source, ctx)
    if (resolved === source) continue  // token not resolved — skip
    const key = target.split('.').pop()
    if (key) result[key] = resolved
  }
  return result
}
