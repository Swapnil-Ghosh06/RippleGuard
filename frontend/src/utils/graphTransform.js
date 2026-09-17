import { SEVERITY_COLORS, getMaxSeverity } from './colorMapping.js';

/**
 * Computes custom CSS styling for a node based on its root status and maximum vulnerability severity.
 *
 * @param {object} node - Backend package node object.
 * @param {boolean} [node.is_root] - Whether the node is the root package.
 * @param {Array<{ severity?: string }>} [node.vulnerabilities] - List of package vulnerabilities.
 * @returns {import('react').CSSProperties} Node style properties.
 */
function getNodeStyle(node) {
  const maxSeverity = getMaxSeverity(node?.vulnerabilities);
  const color = SEVERITY_COLORS[maxSeverity] || SEVERITY_COLORS.NONE;
  return {
    background: node?.is_root ? '#7c3aed' : '#1e293b',
    border: `2px solid ${color}`,
    borderRadius: '8px',
    color: '#f1f5f9',
    fontSize: '11px',
    padding: '8px 12px',
    minWidth: '120px',
  };
}

/**
 * Transforms backend graph data ({ nodes: [...], edges: [...] }) into React Flow node and edge definitions.
 *
 * @param {object} backendGraph - The graph object from the backend API response ({ nodes: Array, edges: Array }).
 * @param {Array<object>} [backendGraph.nodes] - Raw backend node list.
 * @param {Array<object>} [backendGraph.edges] - Raw backend edge list.
 * @returns {{ nodes: Array<object>, edges: Array<object> }} React Flow formatted nodes and edges.
 */
export function transformToReactFlow(backendGraph) {
  if (!backendGraph) {
    return { nodes: [], edges: [] };
  }

  const rawNodes = backendGraph.nodes ?? backendGraph.graph?.nodes ?? [];
  const rawEdges = backendGraph.edges ?? backendGraph.graph?.edges ?? [];

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
      isShadowDependency: Boolean(node.is_shadow_dependency || node.isShadowDependency),
      isBlasted: Boolean(node.is_blasted || node.isBlasted),
    },
    style: getNodeStyle(node),
  }));

  const edges = rawEdges.map((edge, index) => ({
    id: `e${index}`,
    source: edge.source,
    target: edge.target,
    type: 'smoothstep',
    animated: false,
    style: { stroke: '#334155', strokeWidth: 1.5 },
  }));

  return { nodes, edges };
}
