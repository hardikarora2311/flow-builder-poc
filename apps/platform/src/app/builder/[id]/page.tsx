'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRequireAuth } from '@/components/auth/AuthProvider'
import { useWorkflow } from '@/lib/api'
import { useBuilderStore } from '@/lib/store'
import { ReactFlowProvider } from 'reactflow'
import { BuilderToolbar } from '@/components/builder/BuilderToolbar'
import { BuilderCanvas } from '@/components/builder/BuilderCanvas'
import { NodeInspector } from '@/components/builder/NodeInspector'
import { NodePalette } from '@/components/builder/NodePalette'
import { ThemeEditor } from '@/components/builder/ThemeEditor'
import { PreviewPanel } from '@/components/builder/PreviewPanel'
import { NewNodeModal } from '@/components/builder/NewNodeModal'
import { IssuesPanel } from '@/components/builder/IssuesPanel'

export default function BuilderPage({ params }: { params: { id: string } }) {
  const { user } = useRequireAuth()
  const { data, isLoading, isError } = useWorkflow(params.id)

  const load = useBuilderStore((s) => s.load)
  const loadedId = useBuilderStore((s) => s.workflowId)
  const selectedNodeId = useBuilderStore((s) => s.selectedNodeId)

  const [tab, setTab] = useState<'inspector' | 'theme' | 'issues'>('inspector')
  const [previewOpen, setPreviewOpen] = useState(true)
  const [addNodeOpen, setAddNodeOpen] = useState(false)
  const [nerdMode, setNerdMode] = useState(false)

  useEffect(() => {
    if (data && data.id !== loadedId) load(data)
  }, [data, loadedId, load])

  useEffect(() => {
    if (selectedNodeId) setTab('inspector')
  }, [selectedNodeId])

  if (!user) return null

  if (isError) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3 text-sm">
        <p className="text-slate-600">Workflow not found.</p>
        <Link href="/dashboard" className="font-medium text-blue-600 hover:text-blue-700">
          ← Back to dashboard
        </Link>
      </div>
    )
  }

  if (isLoading || loadedId !== params.id) {
    return (
      <div className="flex h-screen items-center justify-center text-sm text-slate-500">
        Loading builder…
      </div>
    )
  }

  return (
    <ReactFlowProvider>
    <div className="flex h-screen flex-col">
      <BuilderToolbar
        previewOpen={previewOpen}
        onTogglePreview={() => setPreviewOpen((o) => !o)}
        onAddNode={() => setAddNodeOpen(true)}
        onShowIssues={() => setTab('issues')}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Left node palette */}
        <NodePalette />

        {/* Canvas */}
        <div className="relative flex-1 bg-white">
          <BuilderCanvas />

          {/* Sticky bottom design tools */}
          <div className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2 flex items-center gap-0.5 rounded-2xl border border-slate-200 bg-white px-1.5 py-1.5 shadow-lg shadow-slate-200/60">
            {([
              { icon: '↔', title: 'Design Params', label: 'Params', isNerd: false },
              { icon: '🔑', title: 'Secrets', label: 'Secrets', isNerd: false },
              { icon: '📚', title: 'Design Stages', label: 'Stages', isNerd: false },
              { icon: '🐛', title: 'Nerd Mode', label: 'Nerd', isNerd: true },
            ] as const).map((tool) => (
              <button
                key={tool.label}
                onClick={tool.isNerd ? () => setNerdMode((v) => !v) : undefined}
                title={tool.title}
                className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition ${
                  tool.isNerd && nerdMode
                    ? 'bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                }`}
              >
                <span className="text-sm leading-none">{tool.icon}</span>
                <span>{tool.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Right panel: Inspector + Theme + Issues tabs */}
        <div className="flex w-[320px] shrink-0 flex-col border-l border-slate-200 bg-white">
          <div className="flex shrink-0 border-b border-slate-200">
            <TabButton active={tab === 'inspector'} onClick={() => setTab('inspector')}>
              Inspector
            </TabButton>
            <TabButton active={tab === 'theme'} onClick={() => setTab('theme')}>
              Theme
            </TabButton>
            <TabButton active={tab === 'issues'} onClick={() => setTab('issues')}>
              Issues
            </TabButton>
          </div>
          <div className="min-h-0 flex-1 overflow-hidden">
            {tab === 'inspector' && <NodeInspector />}
            {tab === 'theme' && <ThemeEditor />}
            {tab === 'issues' && <IssuesPanel />}
          </div>
        </div>

        {previewOpen && <PreviewPanel />}
      </div>

      <NewNodeModal open={addNodeOpen} onClose={() => setAddNodeOpen(false)} />
    </div>
    </ReactFlowProvider>
  )
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 px-4 py-2.5 text-sm font-medium transition ${
        active
          ? 'border-b-2 border-blue-600 text-blue-700'
          : 'text-slate-500 hover:text-slate-700'
      }`}
    >
      {children}
    </button>
  )
}
