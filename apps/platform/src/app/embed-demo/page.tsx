'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { FlowProvider, FlowRenderer, useFlow } from '@platform/react'
import { useWorkflow } from '@/lib/api'
import { createMockSessionToken } from '@/lib/mock-token'
import { registerRuntimeFlow } from '@/lib/flow-compiler'

export default function EmbedDemoPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center text-sm text-slate-500">
          Loading…
        </div>
      }
    >
      <EmbedDemo />
    </Suspense>
  )
}

function EmbedDemo() {
  const params = useSearchParams()
  const flowId = params.get('flow') ?? 'demo-flow'
  const { data: wf, isLoading } = useWorkflow(flowId)
  const [outcome, setOutcome] = useState<string | null>(null)

  const token = useMemo(() => {
    if (!wf) return null
    // Compile the published graph so the SDK runs the real nodes/fields.
    registerRuntimeFlow(flowId, wf.nodes, wf.edges)
    return createMockSessionToken({ flowId, themeHash: flowId, theme: wf.theme })
  }, [wf, flowId])

  return (
    // Deliberately "lender-branded" host chrome to show this is a different app
    // embedding the SDK — not the platform UI.
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-700">
      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4 text-white">
          <span className="font-semibold">🏦 LendCo — Apply for a loan</span>
          <Link href="/dashboard" className="text-xs text-white/60 hover:text-white">
            ← Back to platform
          </Link>
        </div>
      </header>

      <main className="mx-auto flex max-w-3xl flex-col items-center px-6 py-12">
        <div className="mb-6 text-center text-white/80">
          <h1 className="text-2xl font-semibold text-white">Personal Loan Application</h1>
          <p className="mt-1 text-sm">
            This page is the lender&apos;s own website. The widget below is rendered by the
            embedded <code className="rounded bg-white/10 px-1">@platform/react</code> SDK.
          </p>
        </div>

        <div className="w-full max-w-md rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
          {isLoading || !token ? (
            <p className="py-12 text-center text-sm text-white/60">Loading widget…</p>
          ) : (
            <FlowProvider
              apiBaseUrl="/mock-api"
              flowId={flowId}
              sessionToken={token}
              onComplete={(result) => setOutcome(String(result.data.status ?? 'complete'))}
            >
              <CompletionWatcher onOutcome={setOutcome} />
              <FlowRenderer />
            </FlowProvider>
          )}
        </div>

        {outcome && (
          <div className="mt-6 rounded-xl bg-white px-5 py-3 text-sm font-medium text-slate-800 shadow-lg">
            ✅ Host app received completion — outcome:{' '}
            <span className="capitalize text-green-600">{outcome}</span>
          </div>
        )}

        <p className="mt-8 max-w-md text-center text-xs text-white/40">
          The SDK resolved its theme from the published workflow and ran the flow entirely
          against the MSW mock backend.
        </p>
      </main>
    </div>
  )
}

/**
 * The demo flow ends on a branded decision screen (terminal), so we surface
 * completion to the host app by watching the SDK step. A flow that ended via a
 * `complete: true` response would instead fire the FlowProvider `onComplete`.
 */
function CompletionWatcher({ onOutcome }: { onOutcome: (status: string) => void }) {
  const { step, state } = useFlow()
  useEffect(() => {
    if (state === 'active' && step?.type === 'decision') {
      onOutcome(step.uiConfig.variant ?? 'approved')
    }
  }, [step, state, onOutcome])
  return null
}
