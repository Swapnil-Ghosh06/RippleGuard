import { useCallback } from 'react';
import ELK from 'elkjs/lib/elk.bundled.js';

const elk = new ELK();

const DEFAULT_OPTIONS = {
  'elk.algorithm': 'layered',
  'elk.direction': 'RIGHT', // 'RIGHT' (horizontal DAG) or 'DOWN' (vertical DAG)
  'elk.spacing.nodeNode': '60',
  'elk.layered.spacing.nodeNodeBetweenLayers': '100',
  'elk.layered.nodePlacement.strategy': 'BRANDES_KOEPF',
};

/**
 * Hook providing an asynchronous layout function using ELK (Eclipse Layout Kernel)
 * to arrange React Flow nodes and edges without overlap.
 *
 * @returns {{ getLayoutedElements: (nodes: Array, edges: Array, options?: object) => Promise<{ nodes: Array, edges: Array }> }}
 */
export function useElkLayout() {
  const getLayoutedElements = useCallback(
    async (nodes, edges, options = {}) => {
      const layoutOptions = { ...DEFAULT_OPTIONS, ...options };

      const graph = {
        id: 'root',
        layoutOptions,
        children: nodes.map((node) => ({
          id: node.id,
          // Fixed or measured node dimensions matching packageNode styling
          width: node.width || 180,
          height: node.height || 64,
        })),
        edges: edges.map((edge) => ({
          id: edge.id,
          sources: [edge.source],
          targets: [edge.target],
        })),
      };

      try {
        const layoutedGraph = await elk.layout(graph);

        const layoutedNodes = nodes.map((node) => {
          const layoutedNode = layoutedGraph.children?.find(
            (lgNode) => lgNode.id === node.id
          );

          return {
            ...node,
            position: {
              x: layoutedNode?.x ?? node.position?.x ?? 0,
              y: layoutedNode?.y ?? node.position?.y ?? 0,
            },
          };
        });

        return { nodes: layoutedNodes, edges };
      } catch (error) {
        console.error('ELK layout failed:', error);
        return { nodes, edges };
      }
    },
    []
  );

  return { getLayoutedElements };
}
