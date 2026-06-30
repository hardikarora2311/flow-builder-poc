import * as dagre from '@dagrejs/dagre'
import type { Edge } from 'reactflow'
import type { WfNode } from './store'

const NODE_WIDTH = 220     // matches Card width in nodeTypes.tsx
const NODE_HEIGHT = 90     // approx card height
const RANK_SEP = 180       // horizontal gap between columns (for LR layout)
const NODE_SEP = 60        // vertical gap between nodes in same rank
const EDGE_SEP = 30

export interface LayoutOptions {
  direction?: 'LR' | 'TB'
}

/**
 * Compute new positions for all nodes using dagre's directed-graph layout.
 * Returns a new array of nodes with updated `position` fields — other fields untouched.
 *
 * LR (left-to-right) is the right default for state machines like PICE LOS where
 * the flow reads as steps progress horizontally.
 */
export function autoLayout(nodes: WfNode[], edges: Edge[], options: LayoutOptions = {}): WfNode[] {
  const direction = options.direction ?? 'LR'
  const g = new dagre.graphlib.Graph()
  g.setDefaultEdgeLabel(() => ({}))
  g.setGraph({
    rankdir: direction,
    ranksep: RANK_SEP,
    nodesep: NODE_SEP,
    edgesep: EDGE_SEP,
    marginx: 80,
    marginy: 80,
  })

  for (const node of nodes) {
    g.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT })
  }
  for (const edge of edges) {
    g.setEdge(edge.source, edge.target)
  }

  dagre.layout(g)

  return nodes.map((node) => {
    const pos = g.node(node.id)
    if (!pos) return node
    // dagre returns center coords; react-flow uses top-left
    return {
      ...node,
      position: {
        x: Math.round(pos.x - NODE_WIDTH / 2),
        y: Math.round(pos.y - NODE_HEIGHT / 2),
      },
    }
  })
}
