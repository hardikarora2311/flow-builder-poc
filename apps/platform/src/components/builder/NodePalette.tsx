'use client'

import type { NodeType } from '@platform/core'
import { NODE_CATALOG, type NodeMeta } from '@/lib/constants'
import { useBuilderStore } from '@/lib/store'
import { DND_MIME } from './BuilderCanvas'

function PaletteItem({ meta, onAdd }: { meta: NodeMeta; onAdd: () => void }) {
  const onDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData(DND_MIME, meta.type)
    e.dataTransfer.effectAllowed = 'move'
  }

  return (
    <button
      draggable
      onDragStart={onDragStart}
      onClick={onAdd}
      className="group flex w-full cursor-grab items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition hover:bg-slate-50 active:cursor-grabbing border border-transparent hover:border-slate-100"
      title={meta.description}
    >
      <span
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[13px] transition group-hover:scale-110"
        style={{ background: `${meta.accent}18`, color: meta.accent }}
      >
        {meta.icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-semibold leading-tight text-slate-700">{meta.label}</p>
        <p className="truncate text-[10px] leading-tight text-slate-400">{meta.description}</p>
      </div>
    </button>
  )
}

const SECTION_PRIMARY: NodeType[] = ['web_form', 'api_request', 'layout', 'policy_engine', 'task', 'flow_connector', 'edge_operation', 'webhook']
const SECTION_STRUCTURAL: NodeType[] = ['start', 'end']

export function NodePalette() {
  const addNode = useBuilderStore((s) => s.addNode)

  const primary    = NODE_CATALOG.filter((m) => SECTION_PRIMARY.includes(m.type))
  const structural = NODE_CATALOG.filter((m) => SECTION_STRUCTURAL.includes(m.type))

  return (
    <aside className="flex w-[204px] shrink-0 flex-col border-r border-slate-100 bg-white">
      {/* Header */}
      <div className="px-3 py-3.5 border-b border-slate-100">
        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Node Library</p>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-2">
        {/* Primary nodes */}
        <p className="px-2 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Core</p>
        {primary.map((meta) => (
          <PaletteItem
            key={meta.type}
            meta={meta}
            onAdd={() => addNode(meta.type, { x: 300 + Math.random() * 150, y: 150 + Math.random() * 150 })}
          />
        ))}

        <div className="mx-2 my-2 border-t border-slate-100" />

        {/* Structural */}
        <p className="px-2 pb-1 pt-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Structural</p>
        {structural.map((meta) => (
          <PaletteItem
            key={meta.type}
            meta={meta}
            onAdd={() => addNode(meta.type, { x: 300 + Math.random() * 150, y: 150 + Math.random() * 150 })}
          />
        ))}
      </div>

      {/* Footer */}
      <div className="border-t border-slate-100 px-3 py-2 text-center">
        <p className="text-[10px] text-slate-400">Drag to canvas or click to add</p>
      </div>
    </aside>
  )
}
