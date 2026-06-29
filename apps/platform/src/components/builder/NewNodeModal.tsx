'use client'

import { useState, useEffect, useRef } from 'react'
import type { NodeType } from '@platform/core'
import { NODE_CATALOG } from '@/lib/constants'
import { useBuilderStore } from '@/lib/store'

interface Props {
  open: boolean
  onClose: () => void
}

export function NewNodeModal({ open, onClose }: Props) {
  const addNode = useBuilderStore((s) => s.addNode)
  const [label, setLabel] = useState('')
  const [type, setType] = useState<NodeType>('form')
  const inputRef = useRef<HTMLInputElement>(null)

  // Reset form when opening
  useEffect(() => {
    if (open) {
      setLabel('')
      setType('form')
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  if (!open) return null

  const handleCreate = () => {
    addNode(type, { x: 260 + Math.random() * 200, y: 160 + Math.random() * 160 })
    onClose()
  }

  const selectedMeta = NODE_CATALOG.find((n) => n.type === type)!

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px]" />

      {/* Dialog */}
      <div className="relative w-[420px] overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-6 pb-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Create New Node</h2>
            <p className="text-sm text-slate-500 mt-0.5">Add a new node to the flow</p>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
          >
            ✕
          </button>
        </div>

        <div className="px-6 pb-6 space-y-4">
          {/* Label */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Label</label>
            <input
              ref={inputRef}
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleCreate() }}
              placeholder={`${selectedMeta.label} node`}
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition"
            />
          </div>

          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Type</label>
            <div className="grid grid-cols-3 gap-2">
              {NODE_CATALOG.map((meta) => (
                <button
                  key={meta.type}
                  onClick={() => setType(meta.type)}
                  className={`flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-center transition ${
                    type === meta.type
                      ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500/20'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <span
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-base"
                    style={{ background: `${meta.accent}20`, color: meta.accent }}
                  >
                    {meta.icon}
                  </span>
                  <span className={`text-[11px] font-semibold leading-tight ${type === meta.type ? 'text-blue-700' : 'text-slate-600'}`}>
                    {meta.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              className="rounded-xl bg-slate-900 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-800 transition"
            >
              Create
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
