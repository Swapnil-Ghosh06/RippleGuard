import { useState, useEffect } from 'react';
import ELK from 'elkjs/lib/elk.bundled.js';

const elk = new ELK();

const DEFAULT_LAYOUT_OPTIONS = {
  'elk.algorithm': 'layered',
  'elk.direction': 'DOWN',
  'elk.spacing.nodeNode': '60',
  'elk.layered.spacing.nodeNodeBetweenLayers': '100',
};

/**
 * Computes layout positions for React Flow nodes and edges using ELK (layered DAG layout).
 *
 * @param {Array<object>} nodes - Raw React Flow nodes (e.g. from transformToReactFlow).
 * @param {Array<object>} edges - Raw React Flow edges.
 * @returns {Promise<{ nodes: Array<object>, edges: Array<object> }>} Repositioned nodes and unchanged edges.
 */
export async function getLayoutedElements(nodes, edges) {
  if (!nodes || nodes.length === 0) {
    return { nodes: [], edges: edges || [] };
  }

  const safeEdges = edges || [];

  const graph = {
    id: 'root',
    layoutOptions: DEFAULT_LAYOUT_OPTIONS,
    children: nodes.map((node) => ({
      id: node.id,
      width: 160,
      height: 50,
    })),
    edges: safeEdges.map((edge) => ({
      id: edge.id,
      sources: [edge.source],
      targets: [edge.target],
    })),
  };

  try {
    const layoutedGraph = await elk.layout(graph);

    const childMap = new Map();
    (layoutedGraph.children || []).forEach((child) => {
      childMap.set(child.id, child);
    });

    const repositionedNodes = nodes.map((node, index) => {
      const layoutedChild = childMap.get(node.id);
      return {
        ...node,
        position: layoutedChild
          ? { x: layoutedChild.x, y: layoutedChild.y }
          : { x: (index % 5) * 200, y: Math.floor(index / 5) * 150 },
      };
    });

    return { nodes: repositionedNodes, edges: safeEdges };
  } catch (error) {
    console.error('ELK layout failed, falling back to grid positions:', error);

    const fallbackNodes = nodes.map((node, index) => ({
      ...node,
      position: {
        x: (index % 5) * 200,
        y: Math.floor(index / 5) * 150,
      },
    }));

    return { nodes: fallbackNodes, edges: safeEdges };
  }
}

/**
 * Custom React hook that calculates layouted positions for graph elements.
 *
 * @param {Array<object>} rawNodes - Base React Flow nodes with initial positions.
 * @param {Array<object>} rawEdges - Base React Flow edges.
 * @returns {{ layoutedNodes: Array<object>, layoutedEdges: Array<object>, isLayouting: boolean }}
 */
export function useGraphLayout(rawNodes, rawEdges) {
  const [layouted, setLayouted] = useState({ nodes: [], edges: [] });
  const [isLayouting, setIsLayouting] = useState(false);

  useEffect(() => {
    if (!rawNodes || rawNodes.length === 0) {
      return;
    }

    let isCurrent = true;
    setIsLayouting(true);

    getLayoutedElements(rawNodes, rawEdges)
      .then(({ nodes, edges }) => {
        if (isCurrent) {
          setLayouted({ nodes, edges });
          setIsLayouting(false);
        }
      })
      .catch((error) => {
        if (isCurrent) {
          console.error('Error during useGraphLayout calculation:', error);
          setIsLayouting(false);
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [rawNodes, rawEdges]);

  const hasNodes = Boolean(rawNodes && rawNodes.length > 0);

  return {
    layoutedNodes: hasNodes ? layouted.nodes : [],
    layoutedEdges: hasNodes ? layouted.edges : (rawEdges || []),
    isLayouting: hasNodes ? isLayouting : false,
  };
}

