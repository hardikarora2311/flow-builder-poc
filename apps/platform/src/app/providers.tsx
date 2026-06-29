'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '@/components/auth/AuthProvider'

/**
 * Boots the MSW mock backend on the client, then renders the app behind a
 * QueryClient + AuthProvider. The whole tree waits for the worker so no
 * fetch (react-query or SDK) fires before requests can be intercepted.
 */
export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: false, refetchOnWindowFocus: false, staleTime: 5_000 },
        },
      })
  )
  const [mswReady, setMswReady] = useState(false)

  useEffect(() => {
    let active = true
    import('@/mocks/browser').then(async ({ startWorker }) => {
      await startWorker()
      if (active) setMswReady(true)
    })
    return () => {
      active = false
    }
  }, [])

  if (!mswReady) {
    return (
      <div className="flex h-screen items-center justify-center text-sm text-slate-500">
        Starting mock backend…
      </div>
    )
  }

  return (
    <QueryClientProvider client={client}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  )
}
