/**
 * Pure client-side graph mutation functions for simulating mitigations
 * and node removals in RippleGuard.
 */

/**
 * Removes a specific node and all edges connected to it from the React Flow graph.
 *
 * @param {Array<object>} nodes - Array of React Flow node objects.
 * @param {Array<object>} edges - Array of React Flow edge objects.
 * @param {string} nodeIdToRemove - The ID of the node to delete.
 * @returns {{ nodes: Array<object>, edges: Array<object>, directlyAffectedCount: number }}
 */
export function removeNodeAndDescendants(nodes = [], edges = [], nodeIdToRemove) {
  if (!nodeIdToRemove) {
    return { nodes, edges, directlyAffectedCount: 0 };
  }

  // Find all edges that referenced this node (outgoing dependencies or incoming dependents)
  const connectedEdges = edges.filter(
    (edge) => edge.source === nodeIdToRemove || edge.target === nodeIdToRemove
  );
  const directlyAffectedCount = connectedEdges.length;

  // Remove the specified node
  const filteredNodes = nodes.filter((node) => node.id !== nodeIdToRemove);

  // Remove any edge where source or target is the removed node
  const filteredEdges = edges.filter(
    (edge) => edge.source !== nodeIdToRemove && edge.target !== nodeIdToRemove
  );

  return {
    nodes: filteredNodes,
    edges: filteredEdges,
    directlyAffectedCount,
  };
}

/**
 * Compares total monthly downloads across the graph before and after node removal
 * to quantify the mitigation / blast radius reduction.
 *
 * @param {Array<object>} originalNodes - Node array before mutation.
 * @param {Array<object>} newNodes - Node array after mutation.
 * @returns {{ downloadsReduced: number, percentReduced: number, nodesRemoved: number }}
 */
export function calculateBlastRadiusDelta(originalNodes = [], newNodes = []) {
  const getDownloads = (node) => {
    const rawVal =
      node?.data?.downloads ??
      node?.data?.monthly_downloads ??
      node?.monthly_downloads ??
      0;
    const num = Number(rawVal);
    return isNaN(num) ? 0 : num;
  };

  const originalTotal = originalNodes.reduce((sum, n) => sum + getDownloads(n), 0);
  const newTotal = newNodes.reduce((sum, n) => sum + getDownloads(n), 0);

  const downloadsReduced = Math.max(0, originalTotal - newTotal);
  const percentReduced =
    originalTotal > 0 ? Math.round((downloadsReduced / originalTotal) * 100) : 0;
  const nodesRemoved = Math.max(0, originalNodes.length - newNodes.length);

  return {
    downloadsReduced,
    percentReduced,
    nodesRemoved,
  };
}
