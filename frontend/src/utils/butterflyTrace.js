import { createElement } from 'react';

/**
 * Butterfly Trace Utility & Overlay Component
 *
 * Exclusively uses the gold token #fbbf24 to render the single longest
 * compromise propagation path (Critical Chain) across the dependency graph.
 * Per DESIGN.md, #fbbf24 is strictly reserved for this feature.
 */

/**
 * Finds and returns the single longest path from an array of propagation paths.
 *
 * @param {Array<Array<string|object>>} propagationPaths - Array of paths from /simulate response (ordered path from compromised node to a leaf).
 * @returns {Array<string>} The single longest path (most nodes) as node IDs. If empty/undefined, returns [].
 */
export function findCriticalChain(propagationPaths) {
  if (!Array.isArray(propagationPaths) || propagationPaths.length === 0) {
    return [];
  }

  let longest = [];
  for (const path of propagationPaths) {
    if (Array.isArray(path) && path.length > longest.length) {
      longest = path;
    }
  }

  return longest.map((node) =>
    typeof node === 'string' ? node : node?.id || String(node)
  );
}

/**
 * SVG overlay component rendering the pulsing gold critical chain path.
 * Implemented using pure React.createElement to ensure seamless compatibility
 * with all bundlers and JSX parser configurations in .js files.
 *
 * @param {object} props
 * @param {Array<string>} props.criticalChainNodeIds - Sequential node IDs in the critical chain.
 * @param {(nodeId: string) => { x: number, y: number } | null} props.getNodePosition - Function returning the center position of a node.
 * @param {boolean} props.visible - Whether the trace overlay should be visible.
 */
export function ButterflyTraceOverlay({
  criticalChainNodeIds = [],
  getNodePosition,
  visible = true,
}) {
  // If visible is false or criticalChainNodeIds has fewer than 2 entries, render nothing
  if (!visible || !Array.isArray(criticalChainNodeIds) || criticalChainNodeIds.length < 2) {
    return null;
  }

  if (typeof getNodePosition !== 'function') {
    return null;
  }

  const points = criticalChainNodeIds
    .map((id) => getNodePosition(id))
    .filter((pos) => pos && typeof pos.x === 'number' && typeof pos.y === 'number');

  if (points.length < 2) {
    return null;
  }

  // Construct smooth bezier curve connecting sequential node positions
  let pathData = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const midX = prev.x + (curr.x - prev.x) / 2;
    pathData += ` C ${midX} ${prev.y}, ${midX} ${curr.y}, ${curr.x} ${curr.y}`;
  }

  // Position label near the midpoint of the critical chain
  const midIndex = Math.floor((points.length - 1) / 2);
  const midPoint = points[midIndex];
  const nextPoint = points[midIndex + 1] || midPoint;
  const labelX = (midPoint.x + nextPoint.x) / 2;
  const labelY = (midPoint.y + nextPoint.y) / 2 - 16;

  return createElement(
    'svg',
    {
      className: 'butterfly-trace-overlay pointer-events-none select-none',
      style: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        overflow: 'visible',
        pointerEvents: 'none',
        zIndex: 10,
      },
    },
    createElement(
      'style',
      null,
      `
        @keyframes pulse {
          0%, 100% {
            opacity: 0.4;
          }
          50% {
            opacity: 1;
          }
        }
        .butterfly-pulse-path {
          animation: pulse 1.5s ease-in-out infinite;
        }
      `
    ),
    // Ambient gold glow underlay
    createElement('path', {
      d: pathData,
      fill: 'none',
      stroke: '#fbbf24',
      strokeWidth: 7,
      strokeOpacity: 0.22,
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
    }),
    // Main pulsing gold critical chain path (stroke-width 3, gold token #fbbf24)
    createElement('path', {
      d: pathData,
      fill: 'none',
      stroke: '#fbbf24',
      strokeWidth: 3,
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
      className: 'butterfly-pulse-path',
    }),
    // Waypoint circle dots along critical chain
    ...points.map((pt, index) =>
      createElement('circle', {
        key: index,
        cx: pt.x,
        cy: pt.y,
        r: index === 0 || index === points.length - 1 ? 5 : 3.5,
        fill: '#fbbf24',
        stroke: '#0d1829',
        strokeWidth: 1.5,
      })
    ),
    // Text label: "Critical Chain" in gold, small font
    createElement(
      'g',
      { transform: `translate(${labelX}, ${labelY})` },
      createElement('rect', {
        x: -46,
        y: -11,
        width: 92,
        height: 20,
        rx: 5,
        fill: '#0d1829',
        fillOpacity: 0.95,
        stroke: '#fbbf24',
        strokeWidth: 1.2,
      }),
      createElement(
        'text',
        {
          x: 0,
          y: 1,
          fill: '#fbbf24',
          fontSize: 10,
          fontFamily: 'ui-monospace, monospace',
          fontWeight: '600',
          textAnchor: 'middle',
          dominantBaseline: 'middle',
        },
        'Critical Chain'
      )
    )
  );
}

export default ButterflyTraceOverlay;
