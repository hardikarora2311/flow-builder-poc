import { setupWorker } from 'msw/browser'
import { handlers } from './handlers'

// Browser-side mock backend. The handlers execute in the page context, so
// their in-memory stores persist across client-side navigations (and reset
// on a full page reload).
export const worker = setupWorker(...handlers)

declare global {
  // eslint-disable-next-line no-var
  var __pfMswStartPromise: Promise<unknown> | undefined
}

/**
 * Starts the worker exactly once per page. React 18 Strict Mode runs effects
 * twice (and HMR re-imports this module), but calling `worker.start()` more
 * than once throws "cannot configure an already enabled network". The promise
 * is cached on `globalThis` so it survives both.
 */
export function startWorker(): Promise<unknown> {
  if (typeof window === 'undefined') return Promise.resolve()
  if (!globalThis.__pfMswStartPromise) {
    globalThis.__pfMswStartPromise = worker.start({
      onUnhandledRequest: 'bypass',
      quiet: true,
    })
  }
  return globalThis.__pfMswStartPromise
}
