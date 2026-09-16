import { SEVERITY_COLORS, getMaxSeverity, text } from './colorMapping.js'
import { mockAnalyzeResponse } from '../mocks/mockAnalyzeResponse.js'

/**
 * Computes style object for a graph node based on root status and vulnerability severity.
 *
 * @param {object} node
 * @returns {React.CSSProperties}
 */
export function getNodeStyle(node) {
  const maxSev = getMaxSeverity(node?.vulnerabilities)
  const borderColor = SEVERITY_COLORS[maxSev] || SEVERITY_COLORS.NONE

  return {
    background: node?.is_root ? '#7c3aed' : '#1e293b',
    border: `2px solid ${borderColor}`,
    borderRadius: '8px',
    color: text,
    fontSize: '11px',
    padding: '8px 12px',
    minWidth: '120px',
  }
}

/**
 * Converts backend graph payload (nodes[] and edges[]) to React Flow format.
 *
 * @param {object} backendGraph - { nodes: Array, edges: Array } or payload with graph property
 * @returns {{ nodes: Array, edges: Array }}
 */
export function transformToReactFlow(backendGraph) {
  if (!backendGraph) {
    return { nodes: [], edges: [] }
  }

  const rawNodes = backendGraph.nodes || backendGraph.graph?.nodes || []
  const rawEdges = backendGraph.edges || backendGraph.graph?.edges || []

  const nodes = rawNodes.map((node) => ({
    id: node.id,
    type: 'packageNode',
    position: { x: 0, y: 0 },
    data: {
      label: node.name,
      version: node.version,
      depth: node.depth,
      vulns: node.vulnerabilities,
      downloads: node.monthly_downloads,
      isRoot: node.is_root,
      riskScore: node.risk_score,
    },
    style: getNodeStyle(node),
  }))

  const edges = rawEdges.map((edge, index) => ({
    id: `e${index}`,
    source: edge.source,
    target: edge.target,
    type: 'smoothstep',
    animated: false,
    style: {
      stroke: '#334155',
      strokeWidth: 1.5,
    },
  }))

  return { nodes, edges }
}

// Quick sanity check in the browser console (temporary)
console.log('React Flow Graph Preview:', transformToReactFlow(mockAnalyzeResponse.graph))
