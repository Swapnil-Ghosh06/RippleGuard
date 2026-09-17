import { useCallback, useEffect, useMemo, useState } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  MarkerType,
  BackgroundVariant,
  ReactFlowProvider,
  useReactFlow,
} from 'reactflow';
import { useGraphStore } from '../store/graphStore';
import { useSimulate } from '../hooks/useSimulate';
import PackageNode from './PackageNode';

const NODE_TYPES = { package: PackageNode };
const EDGE_TYPES = {};

const MOCK_BLAST = {
  blast_score: 91,
  packages_affected: 9,
  direct_affected: 3,
  transitive_affected: 6,
  monthly_downloads_affected: '438M',
  human_comparison: "Exposure exceeds 330M endpoints monthly — equivalent to compromising every active internet user in the US.",
  critical_chain: [
    'lodash@4.17.20',
    'express@4.18.1',
    'webpack@5.88.0',
    'next@13.4.0',
  ],
  mitigations: [
    {
      package: 'lodash@4.17.20',
      fix_version: '4.17.21',
      blast_reduction: 94,
      command: 'npm update lodash@4.17.21',
      description: 'Patches prototype pollution in zipObjectDeep and template engine injection vectors.'
    },
    {
      package: 'minimatch@3.0.4',
      fix_version: '3.0.5',
      blast_reduction: 61,
      command: 'npm update minimatch@3.0.5',
      description: 'Neutralizes catastrophic ReDoS backtracking in glob pattern evaluation.'
    },
  ],
  propagation_order: [
    { node: 'lodash@4.17.20', delay_ms: 0,   event: 'INJECT',  msg: 'Compromised token exploited at entrypoint' },
    { node: 'express@4.18.1', delay_ms: 220, event: 'SPREAD',  msg: 'Tainted through require("lodash") linkage' },
    { node: 'react@18.2.0',   delay_ms: 260, event: 'SPREAD',  msg: 'Tainted through build tooling dependency chain' },
    { node: 'webpack@5.88.0', delay_ms: 480, event: 'CASCADE', msg: 'Bundle compilation pipeline infected' },
    { node: 'next@13.4.0',    delay_ms: 600, event: 'CASCADE', msg: 'Full-stack SSR runtime contaminated' },
    { node: 'axios@1.4.0',    delay_ms: 650, event: 'CASCADE', msg: 'HTTP client transport layer tainted' },
    { node: 'chalk@5.3.0',    delay_ms: 820, event: 'CASCADE', msg: 'Terminal logger tainted' },
    { node: 'semver@7.5.4',   delay_ms: 850, event: 'CASCADE', msg: 'Version comparator engine tainted' },
    { node: 'minimatch@3.0.4',delay_ms: 870, event: 'CASCADE', msg: 'Path matcher engine tainted' },
    { node: 'ms@2.1.3',       delay_ms: 900, event: 'CASCADE', msg: 'Time parser utility tainted' },
  ],
};

/**
 * Intelligent DAG-layered layout calculation for visible nodes.
 * Anchors children to parent positions and ensures comfortable vertical and horizontal spacing.
 */
function buildIntelligentLayout(nodes, edges) {
  if (!nodes || nodes.length === 0) return {};

  const nodeMap = new Map();
  nodes.forEach(n => nodeMap.set(n.id, n));

  const parentsMap = new Map();
  const childrenMap = new Map();

  nodes.forEach(n => {
    parentsMap.set(n.id, []);
    childrenMap.set(n.id, []);
  });

  (edges || []).forEach(e => {
    const uId = typeof e.source === 'string' ? e.source : e.source?.id;
    const vId = typeof e.target === 'string' ? e.target : e.target?.id;
    const u = nodeMap.get(uId);
    const v = nodeMap.get(vId);
    if (!u || !v) return;

    const dU = u.depth ?? 0;
    const dV = v.depth ?? 0;

    let parentId, childId;
    if (dU < dV) {
      parentId = uId;
      childId = vId;
    } else if (dV < dU) {
      parentId = vId;
      childId = uId;
    } else {
      parentId = uId;
      childId = vId;
    }

    if (!childrenMap.get(parentId).includes(childId)) {
      childrenMap.get(parentId).push(childId);
    }
    if (!parentsMap.get(childId).includes(parentId)) {
      parentsMap.get(childId).push(parentId);
    }
  });

  // Topological / Depth Layering
  const roots = nodes.filter(n => n.is_root || n.depth === 0);
  const rootIds = new Set(roots.length > 0 ? roots.map(r => r.id) : [nodes[0].id]);

  const layerMap = new Map();
  nodes.forEach(n => {
    if (rootIds.has(n.id)) layerMap.set(n.id, 0);
  });

  let changed = true;
  let iterations = 0;
  while (changed && iterations < 15) {
    changed = false;
    iterations++;
    nodes.forEach(n => {
      if (rootIds.has(n.id)) return;
      const parents = parentsMap.get(n.id) || [];
      if (parents.length > 0) {
        const maxParent = Math.max(...parents.map(p => layerMap.get(p) ?? 0));
        const newLayer = maxParent + 1;
        if (layerMap.get(n.id) !== newLayer) {
          layerMap.set(n.id, newLayer);
          changed = true;
        }
      } else {
        if (!layerMap.has(n.id)) layerMap.set(n.id, n.depth ?? 1);
      }
    });
  }

  nodes.forEach(n => {
    if (!layerMap.has(n.id)) layerMap.set(n.id, n.depth ?? 0);
  });

  const byLayer = {};
  for (const n of nodes) {
    const layer = layerMap.get(n.id);
    if (!byLayer[layer]) byLayer[layer] = [];
    byLayer[layer].push(n);
  }

  const layers = Object.keys(byLayer).map(Number).sort((a, b) => a - b);
  const positions = {};

  const X_STEP = 360;
  const MIN_Y_GAP = 155;
  const BASE_Y_CENTER = 300;

  // Root Layer (Layer 0)
  const rootGroup = byLayer[layers[0]] || [];
  const rootTotalH = (rootGroup.length - 1) * MIN_Y_GAP;
  rootGroup.forEach((n, i) => {
    positions[n.id] = {
      x: 70,
      y: Math.round(BASE_Y_CENTER - rootTotalH / 2 + i * MIN_Y_GAP),
    };
  });

  // Subsequent Layers
  for (let idx = 1; idx < layers.length; idx++) {
    const l = layers[idx];
    const group = byLayer[l];
    const colX = l * X_STEP + 70;

    if (l === 1) {
      const totalH = (group.length - 1) * MIN_Y_GAP;
      const startY = BASE_Y_CENTER - totalH / 2;
      group.forEach((n, i) => {
        positions[n.id] = {
          x: colX,
          y: Math.round(startY + i * MIN_Y_GAP),
        };
      });
    } else {
      const groupWithIdeal = group.map(n => {
        const parents = parentsMap.get(n.id) || [];
        let idealY = BASE_Y_CENTER;
        const validParents = parents.filter(pId => positions[pId]);
        if (validParents.length > 0) {
          idealY = validParents.reduce((sum, pId) => sum + positions[pId].y, 0) / validParents.length;
        }
        return { node: n, idealY };
      });

      groupWithIdeal.sort((a, b) => a.idealY - b.idealY);
      const yCoords = groupWithIdeal.map(item => item.idealY);

      for (let i = 1; i < yCoords.length; i++) {
        if (yCoords[i] < yCoords[i - 1] + MIN_Y_GAP) {
          yCoords[i] = yCoords[i - 1] + MIN_Y_GAP;
        }
      }

      const currentAvg = yCoords.reduce((a, b) => a + b, 0) / yCoords.length;
      const idealAvg = groupWithIdeal.reduce((a, b) => a + b.idealY, 0) / groupWithIdeal.length;
      const shift = idealAvg - currentAvg;

      for (let i = 0; i < yCoords.length; i++) {
        yCoords[i] += shift;
      }

      for (let i = 1; i < yCoords.length; i++) {
        if (yCoords[i] < yCoords[i - 1] + MIN_Y_GAP) {
          yCoords[i] = yCoords[i - 1] + MIN_Y_GAP;
        }
      }

      groupWithIdeal.forEach((item, i) => {
        positions[item.node.id] = {
          x: colX,
          y: Math.round(yCoords[i]),
        };
      });
    }
  }

  let minY = Infinity;
  let minX = Infinity;
  for (const pos of Object.values(positions)) {
    if (pos.y < minY) minY = pos.y;
    if (pos.x < minX) minX = pos.x;
  }

  const offsetY = minY < 50 ? 50 - minY : 0;
  const offsetX = minX < 50 ? 50 - minX : 0;

  if (offsetY !== 0 || offsetX !== 0) {
    for (const pos of Object.values(positions)) {
      pos.x += offsetX;
      pos.y += offsetY;
    }
  }

  return positions;
}

/**
 * Auto Viewport Centering component
 */
function ViewportAutoFitter({ triggerKey }) {
  const { fitView } = useReactFlow();

  useEffect(() => {
    const timer = setTimeout(() => {
      fitView({ padding: 0.22, duration: 450 });
    }, 60);
    return () => clearTimeout(timer);
  }, [triggerKey, fitView]);

  return null;
}

/**
 * Extracts or derives the Critical Domino Chain for the Butterfly Trace Stepper HUD.
 */
function extractCriticalChain(blastData, rawNodes, rawEdges, selectedNode) {
  if (blastData?.critical_chain && Array.isArray(blastData.critical_chain) && blastData.critical_chain.length >= 2) {
    return blastData.critical_chain;
  }
  if (!blastData || !rawNodes.length) return [];

  const startId = selectedNode || rawNodes.find(n => n.is_root)?.id || rawNodes[0]?.id;
  if (!startId) return [];

  if (blastData.propagation_order && blastData.propagation_order.length >= 2) {
    const propNodes = blastData.propagation_order
      .map(p => typeof p.node === 'string' ? p.node : p.node?.id)
      .filter(Boolean);
    if (propNodes.length >= 2) {
      const idx = propNodes.indexOf(startId);
      if (idx !== -1 && idx < propNodes.length - 1) {
        return propNodes.slice(idx, idx + 4);
      }
      return propNodes.slice(0, 4);
    }
  }

  const adj = {};
  rawEdges.forEach(e => {
    const u = typeof e.source === 'string' ? e.source : e.source?.id;
    const v = typeof e.target === 'string' ? e.target : e.target?.id;
    if (u && v) {
      if (!adj[u]) adj[u] = [];
      if (!adj[v]) adj[v] = [];
      adj[v].push(u);
      adj[u].push(v);
    }
  });

  let longest = [startId];
  const q = [[startId]];
  while (q.length > 0) {
    const path = q.shift();
    const curr = path[path.length - 1];
    const neighbors = (adj[curr] || []).filter(n => !path.includes(n));
    if (neighbors.length === 0) {
      if (path.length > longest.length) longest = path;
    } else {
      for (const nxt of neighbors) {
        if (path.length < 5) q.push([...path, nxt]);
      }
    }
  }
  return longest;
}

/**
 * Floating Butterfly Domino Stepper HUD
 */
function ButterflyStepperHUD({
  criticalChain,
  activeStep,
  onStepChange,
  isPlaying,
  onTogglePlay,
  onClose,
}) {
  if (!criticalChain || criticalChain.length <= 1) return null;
  const currentStep = activeStep ?? 0;
  const currentNode = criticalChain[currentStep];
  const isOrigin = currentStep === 0;
  const isFrontier = currentStep === criticalChain.length - 1;

  return (
    <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-30 max-w-[95vw] sm:max-w-xl w-full px-4 select-none">
      <div className="bg-[#ede8da]/95 backdrop-blur-md border border-[#c4b49a] shadow-[0_8px_32px_rgba(44,36,22,0.15)] rounded-2xl p-3.5 flex flex-col gap-2 text-[#2c2416]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base animate-pulse">🦋</span>
            <div className="flex items-baseline gap-1.5">
              <span className="font-mono text-xs font-bold text-amber-800 uppercase tracking-wider">
                Butterfly Domino Trace
              </span>
              <span className="text-[10px] font-mono text-amber-900 bg-amber-100 px-1.5 py-0.5 rounded border border-amber-300">
                Hop {currentStep + 1} of {criticalChain.length}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <span className={`text-[10px] font-mono font-medium px-2 py-0.5 rounded-full border ${
              isOrigin
                ? 'bg-rose-100 text-rose-700 border-rose-300 font-semibold'
                : isFrontier
                ? 'bg-purple-100 text-purple-700 border-purple-300 font-semibold'
                : 'bg-amber-100 text-amber-800 border-amber-300'
            }`}>
              {isOrigin ? '⚡ Compromise Origin' : isFrontier ? '🏁 Exposure Frontier' : 'Cascading Link'}
            </span>
            <button
              type="button"
              onClick={onClose}
              className="w-5 h-5 rounded-full hover:bg-black/5 flex items-center justify-center text-[#7a6a55] hover:text-[#2c2416] text-xs cursor-pointer ml-1"
              title="Close Stepper"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Current Node Display & Stepper Controls */}
        <div className="flex items-center justify-between gap-3 pt-1 border-t border-[#d4c9b0]">
          <div className="min-w-0 flex-1">
            <p className="font-mono text-xs font-bold text-[#2c2416] truncate">
              {currentNode}
            </p>
            <p className="text-[10px] text-[#7a6a55] font-sans truncate">
              {isOrigin
                ? 'Attacker entrypoint exploiting package vulnerability'
                : `Infected via upstream parent dependency linkage`}
            </p>
          </div>

          {/* Stepper Buttons */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => onStepChange(0)}
              disabled={currentStep === 0}
              className="px-2 py-1 rounded-lg bg-[#e2d9c0] hover:bg-[#d4c9b0] disabled:opacity-40 text-[#2c2416] border border-[#c4b49a] font-mono text-[10px] cursor-pointer"
              title="Reset to Origin"
            >
              ⏮
            </button>
            <button
              type="button"
              onClick={() => onStepChange(Math.max(0, currentStep - 1))}
              disabled={currentStep === 0}
              className="px-2.5 py-1 rounded-lg bg-[#e2d9c0] hover:bg-[#d4c9b0] disabled:opacity-40 text-[#2c2416] border border-[#c4b49a] font-sans text-xs font-semibold cursor-pointer"
              title="Previous Hop"
            >
              ◀
            </button>
            <button
              type="button"
              onClick={onTogglePlay}
              className={`px-3 py-1 rounded-lg font-sans text-xs font-semibold flex items-center gap-1 cursor-pointer transition-all shadow-sm ${
                isPlaying
                  ? 'bg-amber-600 hover:bg-amber-700 text-white animate-pulse'
                  : 'bg-amber-500 hover:bg-amber-600 text-amber-950 font-bold'
              }`}
            >
              <span>{isPlaying ? '⏸' : '▶'}</span>
              <span>{isPlaying ? 'Pause' : 'Cascade'}</span>
            </button>
            <button
              type="button"
              onClick={() => onStepChange(Math.min(criticalChain.length - 1, currentStep + 1))}
              disabled={currentStep === criticalChain.length - 1}
              className="px-2.5 py-1 rounded-lg bg-[#e2d9c0] hover:bg-[#d4c9b0] disabled:opacity-40 text-[#2c2416] border border-[#c4b49a] font-sans text-xs font-semibold cursor-pointer"
              title="Next Hop"
            >
              ▶
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Main Graph Canvas with Progressive Disclosure and Smooth Auto-Zoom
 */
function GraphCanvasInner() {
  const {
    graphData, blastData,
    setBlastData, selectedNode, setSelectedNode,
    isSimulating, setIsSimulating,
    setActiveTab,
    activeDominoIndex, setActiveDominoIndex,
    isDominoPlaying, setIsDominoPlaying,
    sandboxPatches, toggleSandboxPatch, clearSandboxPatches,
  } = useGraphStore();

  const { simulate } = useSimulate();
  const { fitView } = useReactFlow();

  const rawNodes = useMemo(() => graphData?.nodes ?? graphData?.graph?.nodes ?? [], [graphData]);
  const rawEdges = useMemo(() => graphData?.edges ?? graphData?.graph?.edges ?? [], [graphData]);

  // Mapping parent -> dependencies (depth-aware)
  const childrenMap = useMemo(() => {
    const map = {};
    const nodeMap = new Map();
    rawNodes.forEach(n => {
      map[n.id] = [];
      nodeMap.set(n.id, n);
    });

    rawEdges.forEach(e => {
      const uId = typeof e.source === 'string' ? e.source : e.source?.id;
      const vId = typeof e.target === 'string' ? e.target : e.target?.id;
      const u = nodeMap.get(uId);
      const v = nodeMap.get(vId);
      if (!u || !v) return;

      const dU = u.depth ?? 0;
      const dV = v.depth ?? 0;

      let parentId, childId;
      if (dU < dV) {
        parentId = uId;
        childId = vId;
      } else if (dV < dU) {
        parentId = vId;
        childId = uId;
      } else {
        parentId = uId;
        childId = vId;
      }

      if (map[parentId] && !map[parentId].includes(childId)) {
        map[parentId].push(childId);
      }
    });
    return map;
  }, [rawNodes, rawEdges]);

  const [blastSet, setBlastSet] = useState(new Set());
  const [localSelected, setLocalSelected] = useState(selectedNode);
  const [prevSelectedNode, setPrevSelectedNode] = useState(selectedNode);
  const [expandedSet, setExpandedSet] = useState(() => new Set(rawNodes.map(n => n.id)));
  const [prevGraphData, setPrevGraphData] = useState(graphData);

  if (selectedNode !== prevSelectedNode) {
    setPrevSelectedNode(selectedNode);
    setLocalSelected(selectedNode);
  }

  if (graphData !== prevGraphData) {
    setPrevGraphData(graphData);
    setBlastSet(new Set());
    setLocalSelected(null);
    setExpandedSet(new Set(rawNodes.map(n => n.id)));
  }

  // Compute Butterfly Trace (Critical Domino Path)
  const criticalChain = useMemo(() => {
    return extractCriticalChain(blastData, rawNodes, rawEdges, selectedNode);
  }, [blastData, rawNodes, rawEdges, selectedNode]);

  const dominoIndexMap = useMemo(() => {
    const map = {};
    criticalChain.forEach((nodeId, idx) => {
      map[nodeId] = idx + 1; // 1-indexed
    });
    return map;
  }, [criticalChain]);

  const criticalEdgePairs = useMemo(() => {
    const pairs = new Set();
    for (let i = 0; i < criticalChain.length - 1; i++) {
      const a = criticalChain[i];
      const b = criticalChain[i + 1];
      pairs.add(`${a}->${b}`);
      pairs.add(`${b}->${a}`);
    }
    return pairs;
  }, [criticalChain]);

  // Real-time Sandbox Contagion Containment BFS Math
  const { effectiveTaintedSet, protectedSet } = useMemo(() => {
    if (!sandboxPatches || sandboxPatches.length === 0 || blastSet.size === 0) {
      return {
        effectiveTaintedSet: blastSet,
        protectedSet: new Set(),
      };
    }

    const patchedSet = new Set(sandboxPatches);

    const adj = {};
    rawEdges.forEach(e => {
      const u = typeof e.source === 'string' ? e.source : e.source?.id;
      const v = typeof e.target === 'string' ? e.target : e.target?.id;
      if (u && v) {
        if (!adj[u]) adj[u] = [];
        if (!adj[v]) adj[v] = [];
        adj[v].push(u);
        adj[u].push(v);
      }
    });

    const origin = selectedNode || rawNodes.find(n => n.is_root)?.id || rawNodes[0]?.id;
    const reached = new Set();
    const q = [origin];

    while (q.length > 0) {
      const curr = q.shift();
      if (!curr || reached.has(curr)) continue;
      if (patchedSet.has(curr)) continue;

      reached.add(curr);

      const neighbors = adj[curr] || [];
      for (const nxt of neighbors) {
        if (!reached.has(nxt) && !patchedSet.has(nxt)) {
          if (blastSet.has(nxt)) {
            q.push(nxt);
          }
        }
      }
    }

    const protectedNodes = new Set();
    blastSet.forEach(nodeId => {
      if (!reached.has(nodeId) && !patchedSet.has(nodeId)) {
        protectedNodes.add(nodeId);
      }
    });

    return {
      effectiveTaintedSet: reached,
      protectedSet: protectedNodes,
    };
  }, [blastSet, sandboxPatches, rawEdges, selectedNode, rawNodes]);

  // Compute set of visible node IDs
  const visibleNodeIds = useMemo(() => {
    if (!rawNodes.length) return new Set();

    const rootNodes = rawNodes.filter(n => n.is_root || n.depth === 0);
    const startNodes = rootNodes.length > 0 ? rootNodes.map(n => n.id) : [rawNodes[0].id];

    const visible = new Set(startNodes);
    const queue = [...startNodes];

    while (queue.length > 0) {
      const curr = queue.shift();
      if (expandedSet.has(curr)) {
        const children = childrenMap[curr] || [];
        for (const childId of children) {
          if (!visible.has(childId)) {
            visible.add(childId);
            queue.push(childId);
          }
        }
      }
    }

    const forced = [
      ...criticalChain,
      ...effectiveTaintedSet,
      ...sandboxPatches,
      localSelected,
    ];
    forced.forEach(id => {
      if (id && rawNodes.some(n => n.id === id)) {
        visible.add(id);
      }
    });

    return visible;
  }, [rawNodes, childrenMap, expandedSet, criticalChain, effectiveTaintedSet, sandboxPatches, localSelected]);

  const visibleNodes = useMemo(() => {
    return rawNodes.filter(n => visibleNodeIds.has(n.id));
  }, [rawNodes, visibleNodeIds]);

  const visibleEdges = useMemo(() => {
    return rawEdges.filter(e => {
      const u = typeof e.source === 'string' ? e.source : e.source?.id;
      const v = typeof e.target === 'string' ? e.target : e.target?.id;
      return visibleNodeIds.has(u) && visibleNodeIds.has(v);
    });
  }, [rawEdges, visibleNodeIds]);

  // Layout for visible nodes
  const positions = useMemo(() => buildIntelligentLayout(visibleNodes, visibleEdges), [visibleNodes, visibleEdges]);

  // Progressive Disclosure Expand / Collapse toggles
  const toggleExpand = useCallback((nodeId) => {
    setExpandedSet(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  }, []);

  const handleExpandAll = useCallback(() => {
    const allWithChildren = new Set();
    Object.entries(childrenMap).forEach(([id, children]) => {
      if (children.length > 0) allWithChildren.add(id);
    });
    setExpandedSet(allWithChildren);
  }, [childrenMap]);

  const handleFocusDirect = useCallback(() => {
    const rootNodes = rawNodes.filter(n => n.is_root || n.depth === 0);
    const rootIds = rootNodes.length > 0 ? rootNodes.map(n => n.id) : [rawNodes[0]?.id].filter(Boolean);
    setExpandedSet(new Set(rootIds));
  }, [rawNodes]);

  const handleFitView = useCallback(() => {
    fitView({ duration: 500, padding: 0.25 });
  }, [fitView]);

  // Auto-Zoom on visible nodes change
  useEffect(() => {
    if (!visibleNodes.length) return;
    const timer = setTimeout(() => {
      fitView({ duration: 500, padding: 0.25 });
    }, 60);
    return () => clearTimeout(timer);
  }, [visibleNodes.length, fitView]);

  // React Flow Nodes
  const rfNodes = useMemo(() => {
    const activeDominoNodeId = (activeDominoIndex !== null && activeDominoIndex !== undefined)
      ? criticalChain[activeDominoIndex]
      : null;

    return visibleNodes.map(n => ({
      id: n.id,
      type: 'package',
      position: positions[n.id] ?? { x: 0, y: 0 },
      data: {
        ...n,
        blasted: effectiveTaintedSet.has(n.id),
        selected: localSelected === n.id,
        dominoIndex: dominoIndexMap[n.id] ?? null,
        isDominoActive: activeDominoNodeId === n.id,
        isSandboxPatched: sandboxPatches.includes(n.id),
        isSandboxProtected: protectedSet.has(n.id),
        childCount: childrenMap[n.id]?.length ?? 0,
        isExpanded: expandedSet.has(n.id),
        onToggleExpand: toggleExpand,
      },
    }));
  }, [
    visibleNodes,
    positions,
    effectiveTaintedSet,
    localSelected,
    dominoIndexMap,
    activeDominoIndex,
    criticalChain,
    sandboxPatches,
    protectedSet,
    childrenMap,
    expandedSet,
    toggleExpand,
  ]);

  // React Flow Edges with Organic Flowchart Curves & Strict Left-to-Right Routing
  const rfEdges = useMemo(() => {
    return visibleEdges.map((e, i) => {
      const u = typeof e.source === 'string' ? e.source : e.source?.id;
      const v = typeof e.target === 'string' ? e.target : e.target?.id;
      const isCriticalPath = criticalEdgePairs.has(`${u}->${v}`) || criticalEdgePairs.has(`${v}->${u}`);
      const isHot = effectiveTaintedSet.has(u) || effectiveTaintedSet.has(v);

      const isSeveredByPatch = sandboxPatches.includes(u) || sandboxPatches.includes(v);
      const isCurrentDominoHop = activeDominoIndex !== null && activeDominoIndex > 0 &&
        (
          (criticalChain[activeDominoIndex - 1] === u && criticalChain[activeDominoIndex] === v) ||
          (criticalChain[activeDominoIndex - 1] === v && criticalChain[activeDominoIndex] === u)
        );

      // Strict Left-to-Right routing: ensures curves exit right handle of upstream parent
      // and enter left handle of downstream child, completely eliminating 180° backwards loops.
      const posU = positions[u] || { x: 0, y: 0 };
      const posV = positions[v] || { x: 0, y: 0 };
      let edgeSource = u;
      let edgeTarget = v;
      if (posU.x > posV.x) {
        edgeSource = v;
        edgeTarget = u;
      }

      return {
        id: `e-${edgeSource}-${edgeTarget}-${i}`,
        source: edgeSource,
        target: edgeTarget,
        type: 'default',
        animated: isHot || isCriticalPath,
        style: {
          stroke: isSeveredByPatch
            ? '#10b981'
            : isCurrentDominoHop
            ? '#f59e0b'
            : isCriticalPath
            ? '#f59e0b'
            : isHot
            ? '#f43f5e'
            : '#475569',
          strokeWidth: isSeveredByPatch ? 2.5 : isCurrentDominoHop ? 4.5 : isCriticalPath ? 3.5 : isHot ? 2.5 : 2,
          strokeDasharray: isSeveredByPatch ? '4 4' : isCriticalPath ? '6 4' : undefined,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: isSeveredByPatch ? '#10b981' : isCurrentDominoHop ? '#f59e0b' : isCriticalPath ? '#f59e0b' : isHot ? '#f43f5e' : '#64748b',
          width: isCriticalPath || isSeveredByPatch ? 15 : 12,
          height: isCriticalPath || isSeveredByPatch ? 15 : 12,
        },
      };
    });
  }, [visibleEdges, positions, effectiveTaintedSet, criticalEdgePairs, activeDominoIndex, criticalChain, sandboxPatches]);

  const [nodes, setNodes, onNodesChange] = useNodesState(rfNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(rfEdges);

  useEffect(() => { setNodes(rfNodes); }, [rfNodes, setNodes]);
  useEffect(() => { setEdges(rfEdges); }, [rfEdges, setEdges]);

  // Autoplay timer for Domino Stepper
  useEffect(() => {
    if (!isDominoPlaying || criticalChain.length <= 1) return;

    const timer = setInterval(() => {
      setActiveDominoIndex((prev) => {
        const next = prev === null ? 0 : prev + 1;
        if (next >= criticalChain.length) {
          setIsDominoPlaying(false);
          return prev;
        }
        const nextNodeId = criticalChain[next];
        if (nextNodeId) setSelectedNode(nextNodeId);
        return next;
      });
    }, 950);

    return () => clearInterval(timer);
  }, [isDominoPlaying, criticalChain, setActiveDominoIndex, setIsDominoPlaying, setSelectedNode]);

  // Reset external store states on new graphData
  useEffect(() => {
    setActiveDominoIndex(null);
    setIsDominoPlaying(false);
    clearSandboxPatches();
  }, [graphData, clearSandboxPatches, setActiveDominoIndex, setIsDominoPlaying]);

  const handleInject = useCallback(async () => {
    if (!localSelected || isSimulating) return;
    setIsSimulating(true);
    setSelectedNode(localSelected);
    setBlastSet(new Set([localSelected]));

    let blast = await simulate(localSelected);
    if (!blast) {
      blast = MOCK_BLAST;
      setBlastData(blast);
    }
    setActiveTab('blast');

    const propOrder = blast.propagation_order || [];
    const timers = [];

    propOrder.forEach(({ node, delay_ms }, idx) => {
      const delay = delay_ms ?? (idx * 150);
      const t = setTimeout(() => {
        setBlastSet(prev => {
          const s = new Set(prev);
          s.add(typeof node === 'string' ? node : node?.id);
          return s;
        });
      }, delay);
      timers.push(t);
    });

    const maxDelay = propOrder.length ? Math.max(...propOrder.map(p => p.delay_ms ?? 0)) + 300 : 1200;
    const finalTimer = setTimeout(() => {
      setIsSimulating(false);
    }, maxDelay);
    timers.push(finalTimer);
  }, [localSelected, isSimulating, simulate, setBlastData, setIsSimulating, setSelectedNode, setActiveTab]);

  const handleReset = useCallback(() => {
    setBlastData(null);
    setBlastSet(new Set());
    setLocalSelected(null);
    setSelectedNode(null);
    setActiveDominoIndex(null);
    setIsDominoPlaying(false);
    clearSandboxPatches();
  }, [setBlastData, setSelectedNode, setActiveDominoIndex, setIsDominoPlaying, clearSandboxPatches]);

  const onNodeClick = useCallback((_, node) => {
    const next = localSelected === node.id ? null : node.id;
    setLocalSelected(next);
    setSelectedNode(next);
  }, [localSelected, setSelectedNode]);

  const onNodeDoubleClick = useCallback((_, node) => {
    if (childrenMap[node.id]?.length > 0) {
      toggleExpand(node.id);
    }
  }, [childrenMap, toggleExpand]);

  const handleDominoStepChange = useCallback((step) => {
    setActiveDominoIndex(step);
    const targetNodeId = criticalChain[step];
    if (targetNodeId) setSelectedNode(targetNodeId);
  }, [criticalChain, setActiveDominoIndex, setSelectedNode]);

  const handleTogglePlayDomino = useCallback(() => {
    if (isDominoPlaying) {
      setIsDominoPlaying(false);
    } else {
      if (activeDominoIndex === null || activeDominoIndex >= criticalChain.length - 1) {
        setActiveDominoIndex(0);
        const originId = criticalChain[0];
        if (originId) setSelectedNode(originId);
      }
      setIsDominoPlaying(true);
    }
  }, [isDominoPlaying, activeDominoIndex, criticalChain, setIsDominoPlaying, setActiveDominoIndex, setSelectedNode]);

  if (!rawNodes.length) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-[#f5f0e6]">
        <p className="text-sm text-[#9a8a75] font-sans">No graph loaded.</p>
      </div>
    );
  }

  const isFullView = visibleNodes.length === rawNodes.length;

  return (
    <div className="w-full h-full flex flex-col bg-[#f5f0e6] relative overflow-hidden">
      {/* Top Floating Controls & Indicators */}
      <div className="absolute top-4 left-4 z-20 flex items-center gap-2 select-none flex-wrap max-w-[calc(100%-2rem)]">
        {/* Main Stats Pill */}
        <div className="bg-white/90 backdrop-blur-md border border-[#d4c9b0] px-3.5 py-1.5 rounded-full flex items-center gap-2.5 text-xs font-sans shadow-md text-[#4a3f32]">
          <div className="flex items-center gap-1.5 font-medium text-[#2c2416]">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Dependency Canvas</span>
          </div>
          <span className="text-[#d4c9b0]">·</span>
          <span className="text-[#7a6a55] font-medium">
            {visibleNodes.length === rawNodes.length
              ? `${rawNodes.length} packages`
              : `${visibleNodes.length} of ${rawNodes.length} packages`}
          </span>
          <span className="text-[#d4c9b0]">·</span>
          <span className="text-[#7a6a55]">{visibleEdges.length} links</span>

          {blastData && (
            <>
              <span className="text-[#d4c9b0]">·</span>
              <span className="text-rose-600 font-medium flex items-center gap-1 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                <span>⚡</span>
                <span>{effectiveTaintedSet.size}/{rawNodes.length} compromised</span>
              </span>

              {criticalChain.length > 1 && (
                <>
                  <span className="text-[#d4c9b0]">·</span>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveDominoIndex(0);
                      const originId = criticalChain[0];
                      if (originId) setSelectedNode(originId);
                      setIsDominoPlaying(true);
                    }}
                    className="text-amber-700 font-bold flex items-center gap-1.5 bg-amber-50 hover:bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-300 cursor-pointer transition-all active:scale-95"
                  >
                    <span>🦋</span>
                    <span>Domino Trace ({criticalChain.length})</span>
                  </button>
                </>
              )}

              {sandboxPatches.length > 0 && (
                <>
                  <span className="text-[#d4c9b0]">·</span>
                  <span className="text-emerald-700 font-semibold flex items-center gap-1.5 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-300">
                    <span>🛡️</span>
                    <span>Sandbox: {sandboxPatches.length} Patched ({protectedSet.size} Shielded)</span>
                  </span>
                </>
              )}
            </>
          )}
        </div>

        {/* View Layout Controls (Focus Direct / Expand All / Zoom Fit) */}
        {rawNodes.length > 1 && (
          <div className="bg-white/90 backdrop-blur-md border border-[#d4c9b0] px-1.5 py-1 rounded-full flex items-center gap-1 shadow-md text-[#4a3f32]">
            <button
              type="button"
              onClick={handleFocusDirect}
              className={`px-2.5 py-0.5 text-[11px] font-sans font-medium rounded-full cursor-pointer transition-colors ${
                !isFullView
                  ? 'bg-[#e2d9c0] text-[#2c2416] font-semibold'
                  : 'text-[#7a6a55] hover:text-[#2c2416] hover:bg-[#ede8da]'
              }`}
              title="Focus on Root & Direct dependencies"
            >
              Focus View
            </button>
            <button
              type="button"
              onClick={handleExpandAll}
              className={`px-2.5 py-0.5 text-[11px] font-sans font-medium rounded-full cursor-pointer transition-colors ${
                isFullView
                  ? 'bg-[#e2d9c0] text-[#2c2416] font-semibold'
                  : 'text-[#7a6a55] hover:text-[#2c2416] hover:bg-[#ede8da]'
              }`}
              title="Expand all downstream dependency branches"
            >
              Expand All
            </button>
            <span className="text-[#d4c9b0] text-xs">|</span>
            <button
              type="button"
              onClick={handleFitView}
              className="px-2 py-0.5 text-[11px] font-sans text-[#7a6a55] hover:text-[#2c2416] hover:bg-[#ede8da] rounded-full cursor-pointer transition-colors"
              title="Auto Zoom to Fit Graph"
            >
              Fit View ⤢
            </button>
          </div>
        )}

        {rawNodes.length === 1 && (
          <div className="bg-amber-50 border border-amber-300 px-3 py-1.5 rounded-full flex items-center gap-1.5 text-xs font-sans text-amber-700 shadow-sm">
            <span>ℹ️</span>
            <span className="font-medium">Standalone Root Library (0 downstream dependencies)</span>
          </div>
        )}
      </div>

      {/* React Flow Canvas */}
      <div className="flex-1 min-h-0 w-full relative" style={{ minHeight: '350px' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          onNodeDoubleClick={onNodeDoubleClick}
          nodeTypes={NODE_TYPES}
          edgeTypes={EDGE_TYPES}
          fitView
          fitViewOptions={{ padding: 0.25 }}
          minZoom={0.2}
          maxZoom={2}
          style={{ background: '#f8f8f7' }}
          proOptions={{ hideAttribution: true }}
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={24}
            size={1.2}
            color="#d1d5db"
          />

          <Controls
            className="!bg-white !border !border-stone-200 !text-stone-700 !rounded-xl !shadow-md"
          />

          <MiniMap
            className="!bg-white !border !border-stone-200 !rounded-xl !shadow-md"
            nodeColor={n => n.data?.isSandboxPatched ? '#10b981' : n.data?.dominoIndex ? '#f59e0b' : n.data?.blasted ? '#f43f5e' : n.data?.vulnerabilities?.length ? '#d97706' : '#94a3b8'}
            maskColor="rgba(248, 248, 247, 0.75)"
          />

          <ViewportAutoFitter triggerKey={`${visibleNodes.map(n => n.id).join(',')}-${blastData ? 'blast' : 'idle'}`} />
        </ReactFlow>

        {/* Floating Butterfly Domino Stepper HUD */}
        {blastData && criticalChain.length > 1 && activeDominoIndex !== null && (
          <ButterflyStepperHUD
            criticalChain={criticalChain}
            activeStep={activeDominoIndex}
            onStepChange={handleDominoStepChange}
            isPlaying={isDominoPlaying}
            onTogglePlay={handleTogglePlayDomino}
            onClose={() => {
              setActiveDominoIndex(null);
              setIsDominoPlaying(false);
            }}
          />
        )}
      </div>

      {/* Minimalist Bottom Toolbar */}
      <div className="bg-[#f5f0e6]/95 backdrop-blur-md border-t border-[#d4c9b0] px-6 py-3 flex items-center justify-between z-20 shrink-0">
        {/* Left Side */}
        <div className="flex items-center gap-3 select-none">
          {localSelected ? (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-[#7a6a55] font-sans">Target:</span>
              <span className="font-mono text-xs font-semibold text-[#2c2416] bg-[#ede8da] border border-[#d4c9b0] rounded-md px-2 py-0.5">
                {localSelected}
              </span>
              {dominoIndexMap[localSelected] && (
                <span className="font-sans text-[10px] font-bold text-amber-900 bg-amber-100 border border-amber-300 rounded px-1.5 py-0.5">
                  🦋 Domino Hop #{dominoIndexMap[localSelected]}
                </span>
              )}

              {/* 🛡️ Virtual Patch Button on Canvas */}
              {blastData && (
                <button
                  type="button"
                  onClick={() => toggleSandboxPatch(localSelected)}
                  className={`font-sans font-semibold text-[11px] px-3 py-1 rounded-full flex items-center gap-1.5 cursor-pointer transition-all border shadow-2xs ${
                    sandboxPatches.includes(localSelected)
                      ? 'bg-emerald-100 text-emerald-900 border-emerald-400 hover:bg-emerald-200'
                      : 'bg-[#ede8da] hover:bg-emerald-50 text-emerald-900 border-[#d4c9b0]'
                  }`}
                >
                  <span>🛡️</span>
                  <span>{sandboxPatches.includes(localSelected) ? 'Remove Virtual Patch' : 'Apply Virtual Patch'}</span>
                </button>
              )}
            </div>
          ) : (
            <p className="text-xs text-[#7a6a55] font-sans">
              Select any package card to choose attack origin or apply virtual patch
            </p>
          )}
        </div>

        {/* Right Side Buttons */}
        <div className="flex items-center gap-2 select-none">
          <button
            onClick={handleInject}
            disabled={!localSelected || isSimulating}
            className={`font-sans font-medium text-xs px-5 py-2 rounded-full flex items-center gap-2 cursor-pointer transition-all shadow-sm ${
              !localSelected || isSimulating
                ? 'opacity-40 cursor-not-allowed bg-[#e2d9c0] text-[#7a6a55]'
                : 'bg-rose-600 hover:bg-rose-700 text-white'
            }`}
          >
            <span>⚡</span>
            <span>{isSimulating ? 'Simulating Cascade…' : 'Inject Compromise'}</span>
          </button>

          {blastData && (
            <button
              onClick={handleReset}
              className="bg-[#ede8da] hover:bg-[#e2d9c0] text-[#2c2416] border border-[#d4c9b0] font-sans font-medium text-xs px-4 py-2 rounded-full cursor-pointer transition-colors"
            >
              Reset
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function GraphCanvas() {
  return (
    <ReactFlowProvider>
      <GraphCanvasInner />
    </ReactFlowProvider>
  );
}

