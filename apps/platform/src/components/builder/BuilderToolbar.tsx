'use client'

import Link from 'next/link'
import { useBuilderStore, useTemporal } from '@/lib/store'
import { useSaveWorkflow, usePublishWorkflow } from '@/lib/api'

export function BuilderToolbar({
  previewOpen,
  onTogglePreview,
  onAddNode,
}: {
  previewOpen: boolean
  onTogglePreview: () => void
  onAddNode: () => void
}) {
  const workflowId = useBuilderStore((s) => s.workflowId)
  const name = useBuilderStore((s) => s.name)
  const status = useBuilderStore((s) => s.status)
  const dirty = useBuilderStore((s) => s.dirty)
  const setName = useBuilderStore((s) => s.setName)
  const setStatus = useBuilderStore((s) => s.setStatus)
  const markClean = useBuilderStore((s) => s.markClean)
  const toDefinition = useBuilderStore((s) => s.toDefinition)
  const undo = useTemporal((s) => s.undo)
  const redo = useTemporal((s) => s.redo)
  const canUndo = useTemporal((s) => s.pastStates.length > 0)
  const canRedo = useTemporal((s) => s.futureStates.length > 0)

  const save = useSaveWorkflow()
  const publish = usePublishWorkflow()

  const onSave = async () => {
    if (!workflowId) return
    await save.mutateAsync({ id: workflowId, data: toDefinition() })
    markClean()
  }

  const onPublish = async () => {
    if (!workflowId) return
    await save.mutateAsync({ id: workflowId, data: toDefinition() })
    const wf = await publish.mutateAsync(workflowId)
    setStatus(wf.status)
    markClean()
  }

  const busy = save.isPending || publish.isPending

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4">
      <div className="flex items-center gap-3">
        <Link href="/dashboard" className="text-slate-400 hover:text-slate-700" aria-label="Back to dashboard">
          ←
        </Link>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-64 rounded-md border border-transparent px-2 py-1 text-sm font-medium text-slate-800 outline-none hover:border-slate-200 focus:border-blue-400"
        />
        <span
          className={`rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ${
            status === 'published' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
          }`}
        >
          {status}
        </span>
        {dirty && <span className="text-[11px] text-slate-400">• Unsaved changes</span>}
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onAddNode}
          className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-slate-800 transition"
        >
          <span className="text-base leading-none">+</span> New node
        </button>
        <div className="mx-1 h-5 w-px bg-slate-200" />
        <div className="flex items-center overflow-hidden rounded-lg border border-slate-200">
          <button
            onClick={() => undo()}
            disabled={!canUndo}
            className="px-2.5 py-1.5 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-40"
            title="Undo"
          >
            ↶
          </button>
          <button
            onClick={() => redo()}
            disabled={!canRedo}
            className="border-l border-slate-200 px-2.5 py-1.5 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-40"
            title="Redo"
          >
            ↷
          </button>
        </div>

        <button
          onClick={onTogglePreview}
          className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
            previewOpen
              ? 'border-blue-300 bg-blue-50 text-blue-700'
              : 'border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          {previewOpen ? 'Hide preview' : 'Preview'}
        </button>

        <button
          onClick={onSave}
          disabled={busy}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
        >
          {save.isPending ? 'Saving…' : 'Save'}
        </button>

        <button
          onClick={onPublish}
          disabled={busy}
          className="rounded-lg bg-blue-600 px-3.5 py-1.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-60"
        >
          {publish.isPending ? 'Publishing…' : 'Publish'}
        </button>
      </div>
    </header>
  )
}
