'use client'

import { useCallback, useRef } from 'react'
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  MarkerType,
  useReactFlow,
  type ReactFlowInstance,
} from 'reactflow'
import 'reactflow/dist/style.css'
import type { NodeType } from '@platform/core'
import { useBuilderStore } from '@/lib/store'
import { nodeTypes } from './nodes/nodeTypes'
import { NODE_META } from '@/lib/constants'

export const DND_MIME = 'application/pf-node-type'

function Flow() {
  const wrapper = useRef<HTMLDivElement>(null)
  const { screenToFlowPosition } = useReactFlow()

  const nodes = useBuilderStore((s) => s.nodes)
  const edges = useBuilderStore((s) => s.edges)
  const onNodesChange = useBuilderStore((s) => s.onNodesChange)
  const onEdgesChange = useBuilderStore((s) => s.onEdgesChange)
  const onConnect = useBuilderStore((s) => s.onConnect)
  const addNode = useBuilderStore((s) => s.addNode)
  const selectNode = useBuilderStore((s) => s.selectNode)

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }, [])

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      const type = e.dataTransfer.getData(DND_MIME) as NodeType
      if (!type || !NODE_META[type]) return
      const position = screenToFlowPosition({ x: e.clientX, y: e.clientY })
      addNode(type, position)
    },
    [screenToFlowPosition, addNode]
  )

  const onInit = useCallback((instance: ReactFlowInstance) => {
    instance.fitView({ padding: 0.2 })
  }, [])

  return (
    <div className="reactflow-wrapper" ref={wrapper}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onInit={onInit}
        onNodeClick={(_, node) => selectNode(node.id)}
        onPaneClick={() => selectNode(null)}
        onDrop={onDrop}
        onDragOver={onDragOver}
        defaultEdgeOptions={{
          animated: false,
          style: { stroke: '#64748b', strokeWidth: 2 },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#64748b', width: 18, height: 18 },
        }}
        panOnScroll
        panOnScrollSpeed={0.8}
        fitView
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#dde1e7" gap={24} size={1} />
        <Controls showInteractive={false} />
        <MiniMap pannable zoomable className="!bg-slate-50" />
      </ReactFlow>
    </div>
  )
}

/** Canvas — must be rendered inside a ReactFlowProvider (lifted to the builder page). */
export function BuilderCanvas() {
  return <Flow />
}
