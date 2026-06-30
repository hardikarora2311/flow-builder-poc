import { create } from 'zustand'
import { temporal } from 'zundo'
import { useStore } from 'zustand'
import {
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  type Node,
  type Edge,
  type Connection,
  type NodeChange,
  type EdgeChange,
} from 'reactflow'
import { DEFAULT_THEME } from '@platform/core'
import type {
  ThemeConfig,
  WorkflowDefinition,
  WorkflowNode,
  WorkflowEdge,
  WorkflowNodeData,
  NodeType,
} from '@platform/core'
import { createDefaultNodeData } from './constants'

export type WfNode = Node<WorkflowNodeData>

export interface ThemePatch {
  colors?: Partial<ThemeConfig['colors']>
  typography?: Partial<ThemeConfig['typography']>
  spacing?: Partial<ThemeConfig['spacing']>
  borderRadius?: Partial<ThemeConfig['borderRadius']>
}

interface BuilderState {
  workflowId: string | null
  name: string
  status: 'draft' | 'published'
  nodes: WfNode[]
  edges: Edge[]
  theme: ThemeConfig
  selectedNodeId: string | null
  dirty: boolean

  load: (wf: WorkflowDefinition) => void
  setName: (name: string) => void
  onNodesChange: (changes: NodeChange[]) => void
  onEdgesChange: (changes: EdgeChange[]) => void
  onConnect: (connection: Connection) => void
  addNode: (type: NodeType, position: { x: number; y: number }) => void
  updateNodeData: (id: string, patch: Partial<WorkflowNodeData>) => void
  deleteNode: (id: string) => void
  selectNode: (id: string | null) => void
  replaceNodes: (nodes: WfNode[]) => void   // bulk replace (used by auto-layout)
  patchTheme: (patch: ThemePatch) => void
  setStatus: (status: 'draft' | 'published') => void
  markClean: () => void
  toDefinition: () => Pick<WorkflowDefinition, 'name' | 'nodes' | 'edges' | 'theme' | 'status'>
}

const uid = (type: string) =>
  `${type}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`

export const useBuilderStore = create<BuilderState>()(
  temporal(
    (set, get) => ({
      workflowId: null,
      name: 'Untitled workflow',
      status: 'draft',
      nodes: [],
      edges: [],
      theme: DEFAULT_THEME,
      selectedNodeId: null,
      dirty: false,

      load: (wf) =>
        set({
          workflowId: wf.id,
          name: wf.name,
          status: wf.status,
          nodes: wf.nodes as WfNode[],
          edges: wf.edges as Edge[],
          theme: wf.theme ?? DEFAULT_THEME,
          selectedNodeId: null,
          dirty: false,
        }),

      setName: (name) => set({ name, dirty: true }),

      onNodesChange: (changes) =>
        set((s) => ({ nodes: applyNodeChanges(changes, s.nodes), dirty: true })),

      onEdgesChange: (changes) =>
        set((s) => ({ edges: applyEdgeChanges(changes, s.edges), dirty: true })),

      onConnect: (connection) =>
        set((s) => ({
          edges: addEdge({ ...connection, id: uid('edge') }, s.edges),
          dirty: true,
        })),

      addNode: (type, position) => {
        const id = uid(type)
        const node: WfNode = { id, type, position, data: createDefaultNodeData(type) }
        set((s) => ({ nodes: [...s.nodes, node], selectedNodeId: id, dirty: true }))
      },

      updateNodeData: (id, patch) =>
        set((s) => ({
          nodes: s.nodes.map((n) =>
            n.id === id ? { ...n, data: { ...n.data, ...patch } } : n
          ),
          dirty: true,
        })),

      deleteNode: (id) =>
        set((s) => ({
          nodes: s.nodes.filter((n) => n.id !== id),
          edges: s.edges.filter((e) => e.source !== id && e.target !== id),
          selectedNodeId: s.selectedNodeId === id ? null : s.selectedNodeId,
          dirty: true,
        })),

      selectNode: (id) => set({ selectedNodeId: id }),

      replaceNodes: (nodes) => set({ nodes, dirty: true }),

      patchTheme: (patch) =>
        set((s) => ({
          theme: {
            ...s.theme,
            colors: { ...s.theme.colors, ...patch.colors },
            typography: { ...s.theme.typography, ...patch.typography },
            spacing: { ...s.theme.spacing, ...patch.spacing },
            borderRadius: { ...s.theme.borderRadius, ...patch.borderRadius },
          },
          dirty: true,
        })),

      setStatus: (status) => set({ status }),
      markClean: () => set({ dirty: false }),

      toDefinition: () => {
        const s = get()
        // Map canvas nodes/edges into the strict domain shape. reactflow's
        // Node.type is `string | undefined`; the node's own data.nodeType is
        // the authoritative NodeType.
        const nodes: WorkflowNode[] = s.nodes.map((n) => ({
          id: n.id,
          type: n.data.nodeType,
          position: n.position,
          data: n.data,
        }))
        const edges: WorkflowEdge[] = s.edges.map((e) => ({
          id: e.id,
          source: e.source,
          target: e.target,
          sourceHandle: e.sourceHandle ?? null,
          ...(typeof e.label === 'string' ? { label: e.label } : {}),
        }))
        return { name: s.name, nodes, edges, theme: s.theme, status: s.status }
      },
    }),
    {
      // Only graph + theme + name are part of undo/redo history.
      partialize: (state) => ({
        nodes: state.nodes,
        edges: state.edges,
        theme: state.theme,
        name: state.name,
      }),
      limit: 100,
    }
  )
)

/** Hook into the zundo temporal store for undo/redo controls. */
export function useTemporal<T>(selector: (s: ReturnType<typeof useBuilderStore.temporal.getState>) => T): T {
  return useStore(useBuilderStore.temporal, selector)
}
