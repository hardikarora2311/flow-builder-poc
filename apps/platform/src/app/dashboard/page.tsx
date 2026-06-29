'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useRequireAuth } from '@/components/auth/AuthProvider'
import { useWorkflows, useCreateWorkflow } from '@/lib/api'

export default function DashboardPage() {
  const { user, signOut } = useRequireAuth()
  const router = useRouter()
  const { data: workflows, isLoading } = useWorkflows()
  const createWorkflow = useCreateWorkflow()

  if (!user) return null

  const handleCreate = async () => {
    const name = window.prompt('Name your workflow', 'New loan journey')
    if (name === null) return
    const wf = await createWorkflow.mutateAsync(name)
    router.push(`/builder/${wf.id}`)
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-600 text-sm font-bold text-white">
              ◆
            </div>
            <span className="font-semibold text-slate-900">Workflow Platform</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-slate-500">{user.email}</span>
            <button onClick={signOut} className="text-slate-600 hover:text-slate-900">
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Workflows</h1>
            <p className="text-sm text-slate-500">Design and publish borrower journeys</p>
          </div>
          <button
            onClick={handleCreate}
            disabled={createWorkflow.isPending}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-60"
          >
            {createWorkflow.isPending ? 'Creating…' : '+ New workflow'}
          </button>
        </div>

        {isLoading ? (
          <p className="text-sm text-slate-500">Loading workflows…</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {workflows?.map((wf) => (
              <div
                key={wf.id}
                className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md"
              >
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <h2 className="font-medium text-slate-900">{wf.name}</h2>
                    <StatusBadge status={wf.status} />
                  </div>
                  <p className="text-xs text-slate-500">
                    {wf.nodes.length} node{wf.nodes.length === 1 ? '' : 's'} ·{' '}
                    {wf.edges.length} connection{wf.edges.length === 1 ? '' : 's'}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Updated {new Date(wf.updatedAt).toLocaleString()}
                  </p>
                </div>
                <div className="mt-4 flex items-center gap-3 text-sm">
                  <Link
                    href={`/builder/${wf.id}`}
                    className="font-medium text-blue-600 hover:text-blue-700"
                  >
                    Open builder →
                  </Link>
                  {wf.status === 'published' && (
                    <Link
                      href={`/embed-demo?flow=${wf.id}`}
                      className="text-slate-500 hover:text-slate-800"
                    >
                      Embed demo
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

function StatusBadge({ status }: { status: 'draft' | 'published' }) {
  const styles =
    status === 'published'
      ? 'bg-green-100 text-green-700'
      : 'bg-amber-100 text-amber-700'
  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ${styles}`}>
      {status}
    </span>
  )
}
