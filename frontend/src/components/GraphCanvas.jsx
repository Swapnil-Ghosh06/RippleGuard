import { useCallback, useEffect, useMemo, useState } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  MarkerType,
  BackgroundVariant,
} from 'reactflow';
import { useGraphStore } from '../store/graphStore';
import PackageNode from './PackageNode';

const NODE_TYPES = { package: PackageNode };

// ── Layout: bucket nodes by depth, space them out ────────────────────────────
function buildLayout(nodes, edges) {
  // Group by depth
  const byDepth = {};
  for (const n of nodes) {
    const d = n.depth ?? 0;
    if (!byDepth[d]) byDepth[d] = [];
    byDepth[d].push(n);
  }

  const X_STEP = 220;
  const Y_STEP = 110;
  const positions = {};

  for (const [depth, group] of Object.entries(byDepth)) {
    const d = Number(depth);
    const totalH = (group.length - 1) * Y_STEP;
    group.forEach((n, i) => {
      positions[n.id] = {
        x: d * X_STEP + 60,
        y: i * Y_STEP - totalH / 2 + 300,
      };
    });
  }

  return positions;
}

// ── Main component ────────────────────────────────────────────────────────────
export default function GraphCanvas() {
  const {
    graphData, blastData,
    setBlastData, setSelectedNode, selectedNode,
    isSimulating, setIsSimulating,
  } = useGraphStore();

  // Track which nodes are visually "blasted" (fires sequentially via propagation_order)
  const [blastSet,     setBlastSet]     = useState(new Set());
  const [localSelected, setLocalSelected] = useState(null);

  const rawNodes = graphData?.nodes ?? graphData?.graph?.nodes ?? [];
  const rawEdges = graphData?.edges ?? graphData?.graph?.edges ?? [];

  // ── Build RF nodes ──────────────────────────────────────────────────────────
  const positions = useMemo(() => buildLayout(rawNodes, rawEdges), [rawNodes]);

  const rfNodes = useMemo(() => rawNodes.map(n => ({
    id:       n.id,
    type:     'package',
    position: positions[n.id] ?? { x: 0, y: 0 },
    data: {
      ...n,
      blasted:  blastSet.has(n.id),
      selected: localSelected === n.id,
    },
  })), [rawNodes, positions, blastSet, localSelected]);

  const rfEdges = useMemo(() => rawEdges.map((e, i) => {
    const isHot = blastSet.has(e.source) || blastSet.has(e.target);
    return {
      id:            `e-${i}`,
      source:        e.source,
      target:        e.target,
      animated:      isHot,
      style:         { stroke: isHot ? '#C0392B' : '#3a3530', strokeWidth: isHot ? 2 : 1 },
      markerEnd:     { type: MarkerType.ArrowClosed, color: isHot ? '#C0392B' : '#3a3530' },
    };
  }), [rawEdges, blastSet]);

  const [nodes, setNodes, onNodesChange] = useNodesState(rfNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(rfEdges);

  // Sync RF nodes when data or blast state changes
  useEffect(() => { setNodes(rfNodes); }, [rfNodes]);
  useEffect(() => { setEdges(rfEdges); }, [rfEdges]);

  // Reset blast state when new graphData comes in
  useEffect(() => { setBlastSet(new Set()); setLocalSelected(null); }, [graphData]);

  // ── Propagation animation ───────────────────────────────────────────────────
  const runPropagation = useCallback((blastResult) => {
    const order = blastResult.propagation_order ?? [];
    const timers = [];

    order.forEach(({ node, delay_ms }) => {
      const t = setTimeout(() => {
        setBlastSet(prev => new Set([...prev, node]));
      }, delay_ms);
      timers.push(t);
    });

    return () => timers.forEach(clearTimeout);
  }, []);

  // ── Mock blast (replace with useSimulate when backend ready) ───────────────
  const MOCK_BLAST = {
    blast_score: 91, packages_affected: 9,
    direct_affected: 3, transitive_affected: 6,
    monthly_downloads_affected: '438M',
    human_comparison: "That's like sending malware to every internet user in the USA — 330 million people — in a single month.",
    mitigations: [
      { package: 'lodash@4.17.20',  fix_version: '4.17.21', blast_reduction: 94, description: 'Patches prototype pollution in merge and zipObjectDeep.' },
      { package: 'minimatch@3.0.4', fix_version: '3.0.5',   blast_reduction: 61, description: 'Fixes catastrophic backtracking in glob pattern matching.' },
      { package: 'semver@7.5.4',    fix_version: '7.5.4',   blast_reduction: 38, description: 'Resolves ReDoS in version comparator regex.' },
    ],
    propagation_order: [
      { node: 'express@4.18.1',  delay_ms: 200  },
      { node: 'react@18.2.0',    delay_ms: 200  },
      { node: 'webpack@5.88.0',  delay_ms: 420  },
      { node: 'next@13.4.0',     delay_ms: 620  },
      { node: 'axios@1.4.0',     delay_ms: 620  },
      { node: 'chalk@5.3.0',     delay_ms: 840  },
      { node: 'semver@7.5.4',    delay_ms: 840  },
      { node: 'minimatch@3.0.4', delay_ms: 840  },
      { node: 'ms@2.1.3',        delay_ms: 840  },
    ],
    affected_nodes: ['express@4.18.1','react@18.2.0','webpack@5.88.0','next@13.4.0','axios@1.4.0','chalk@5.3.0','semver@7.5.4','minimatch@3.0.4','ms@2.1.3'],
  };

  const handleInject = () => {
    if (!localSelected || isSimulating) return;
    setIsSimulating(true);
    setSelectedNode(localSelected);

    setTimeout(() => {
      setBlastData(MOCK_BLAST);
      runPropagation(MOCK_BLAST);
      setIsSimulating(false);
    }, 600);
  };

  const onNodeClick = useCallback((_, node) => {
    setLocalSelected(prev => prev === node.id ? null : node.id);
  }, []);

  // ── Empty state ─────────────────────────────────────────────────────────────
  if (!rawNodes.length) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-void">
        <p className="font-mono text-muted text-xs">No graph data.</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col bg-void">

      {/* React Flow canvas */}
      <div className="flex-1 relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          nodeTypes={NODE_TYPES}
          fitView
          fitViewOptions={{ padding: 0.3 }}
          minZoom={0.3}
          maxZoom={2}
          style={{ background: '#191615' }}
          proOptions={{ hideAttribution: true }}
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={24}
            size={1}
            color="#2a2720"
          />
          <Controls
            style={{
              background: '#201e1b',
              border: '1px solid #3a3530',
              borderRadius: 4,
            }}
          />
          <MiniMap
            style={{ background: '#201e1b', border: '1px solid #3a3530' }}
            nodeColor={n => n.data?.blasted ? '#C0392B' : n.data?.vulnerabilities?.length ? '#C49A3C' : '#3a3530'}
            maskColor="rgba(25,22,21,0.7)"
          />
        </ReactFlow>

        {/* Blast propagation counter overlay */}
        {blastData && (
          <div style={{
            position: 'absolute', top: 12, left: 12,
            background: 'rgba(25,22,21,0.85)',
            border: '1px solid #3a3530',
            borderRadius: 4,
            padding: '6px 12px',
            backdropFilter: 'blur(4px)',
          }}>
            <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#6C6B5A' }}>
              DEPENDENCY GRAPH · {rawNodes.length} NODES
            </p>
            <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#C0392B', marginTop: 2 }}>
              ⚡ {blastSet.size} / {rawNodes.length} COMPROMISED
            </p>
          </div>
        )}
      </div>

      {/* Sticky inject bar */}
      <div
        style={{ borderTop: '1px solid #3a3530', background: '#201e1b' }}
        className="px-6 py-3 flex items-center justify-between shrink-0"
      >
        <p className="font-mono text-muted text-xs">
          {localSelected
            ? <span>Selected: <span className="text-accent">{localSelected}</span></span>
            : 'Click a node on the graph to select it'}
        </p>
        <button
          onClick={handleInject}
          disabled={!localSelected || isSimulating}
          className="font-mono text-xs px-5 py-2 bg-danger text-text rounded-sm disabled:opacity-25 disabled:cursor-not-allowed hover:opacity-90 transition-opacity duration-150"
        >
          {isSimulating ? 'Simulating…' : '⚡ Inject Compromise'}
        </button>
      </div>
    </div>
  );
}
