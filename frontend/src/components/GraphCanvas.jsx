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
import { useSimulate } from '../hooks/useSimulate';
import PackageNode from './PackageNode';

const NODE_TYPES = { package: PackageNode };
const EDGE_TYPES = {};

// Layout: Clean horizontal depth tiers with comfortable vertical spacing
function buildLayout(nodes, edges) {
  const byDepth = {};
  for (const n of nodes) {
    const d = n.depth ?? 0;
    if (!byDepth[d]) byDepth[d] = [];
    byDepth[d].push(n);
  }

  const X_STEP = 280;
  const Y_STEP = 135;
  const positions = {};

  for (const [depth, group] of Object.entries(byDepth)) {
    const d = Number(depth);
    const totalH = (group.length - 1) * Y_STEP;
    group.forEach((n, i) => {
      positions[n.id] = {
        x: d * X_STEP + 80,
        y: i * Y_STEP - totalH / 2 + 280,
      };
    });
  }

  return positions;
}

export default function GraphCanvas() {
  const {
    graphData, blastData,
    setBlastData, setSelectedNode,
    isSimulating, setIsSimulating,
  } = useGraphStore();

  const { simulate } = useSimulate();
  const [blastSet, setBlastSet] = useState(new Set());
  const [localSelected, setLocalSelected] = useState(null);

  const rawNodes = graphData?.nodes ?? graphData?.graph?.nodes ?? [];
  const rawEdges = graphData?.edges ?? graphData?.graph?.edges ?? [];

  const positions = useMemo(() => buildLayout(rawNodes, rawEdges), [rawNodes]);

  const rfNodes = useMemo(() => {
    return rawNodes.map(n => ({
      id: n.id,
      type: 'package',
      position: positions[n.id] ?? { x: 0, y: 0 },
      data: {
        ...n,
        blasted: blastSet.has(n.id),
        selected: localSelected === n.id,
      },
    }));
  }, [rawNodes, positions, blastSet, localSelected]);

  const rfEdges = useMemo(() => {
    return rawEdges.map((e, i) => {
      const isHot = blastSet.has(e.source) || blastSet.has(e.target);
      return {
        id: `e-${i}`,
        source: e.source,
        target: e.target,
        type: 'smoothstep',
        animated: isHot,
        style: {
          stroke: isHot ? '#EF4444' : '#262630',
          strokeWidth: isHot ? 2 : 1.2,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: isHot ? '#EF4444' : '#3F3F4E',
          width: 14,
          height: 14,
        },
      };
    });
  }, [rawEdges, blastSet]);

  const [nodes, setNodes, onNodesChange] = useNodesState(rfNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(rfEdges);

  useEffect(() => { setNodes(rfNodes); }, [rfNodes]);
  useEffect(() => { setEdges(rfEdges); }, [rfEdges]);

  useEffect(() => {
    setBlastSet(new Set());
    setLocalSelected(null);
  }, [graphData]);

  // Mock blast scenario data
  const MOCK_BLAST = {
    blast_score: 91,
    packages_affected: 9,
    direct_affected: 3,
    transitive_affected: 6,
    monthly_downloads_affected: '438M',
    human_comparison: "Exposure exceeds 330M endpoints monthly — equivalent to compromising every active internet user in the US.",
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
      {
        package: 'semver@7.5.4',
        fix_version: '7.5.4',
        blast_reduction: 38,
        command: 'npm update semver@7.5.4',
        description: 'Resolves regular expression denial of service in range comparison engine.'
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

    const propOrder = blast.propagation_order || [];
    const timers = [];

    propOrder.forEach(({ node, delay_ms }, idx) => {
      const delay = delay_ms ?? (idx * 150);
      const t = setTimeout(() => {
        setBlastSet(prev => new Set([...prev, typeof node === 'string' ? node : node?.id || node]));
      }, delay);
      timers.push(t);
    });

    const maxDelay = propOrder.length ? Math.max(...propOrder.map((p, i) => p.delay_ms ?? (i * 150))) : 800;
    const finalTimer = setTimeout(() => {
      setIsSimulating(false);
    }, maxDelay + 200);
    timers.push(finalTimer);
  }, [localSelected, isSimulating, simulate, setBlastData, setIsSimulating, setSelectedNode]);

  const onNodeClick = useCallback((_, node) => {
    setLocalSelected(prev => {
      const next = prev === node.id ? null : node.id;
      setSelectedNode(next);
      return next;
    });
  }, [setSelectedNode]);

  if (!rawNodes.length) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-void">
        <p className="font-mono text-muted text-xs">No graph topology loaded.</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col bg-void relative overflow-hidden">

      {/* Top Floating Canvas Pill (Inspo 2) */}
      <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
        <div className="bg-surface2/90 border border-border px-3.5 py-1.5 rounded-full flex items-center gap-3 font-mono text-xs shadow-md backdrop-blur-md">
          <div className="flex items-center gap-1.5 text-text font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-accent" />
            <span>Dependency Graph</span>
          </div>
          <span className="text-border">·</span>
          <span className="text-muted">{rawNodes.length} nodes</span>
          <span className="text-border">·</span>
          <span className="text-muted">{rawEdges.length} edges</span>

          {blastData && (
            <>
              <span className="text-border">·</span>
              <span className="text-danger font-bold flex items-center gap-1">
                <span>⚡</span>
                <span>{blastSet.size}/{rawNodes.length} Compromised</span>
              </span>
            </>
          )}
        </div>
      </div>

      {/* React Flow Canvas Wrapper */}
      <div className="flex-1 min-h-0 w-full relative" style={{ minHeight: '350px' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          nodeTypes={NODE_TYPES}
          edgeTypes={EDGE_TYPES}
          fitView
          fitViewOptions={{ padding: 0.25 }}
          minZoom={0.25}
          maxZoom={2}
          style={{ background: '#0A0A0C' }}
          proOptions={{ hideAttribution: true }}
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={24}
            size={1}
            color="#22222A"
          />

          <Controls
            className="!bg-surface2 !border !border-border !rounded-lg !overflow-hidden !shadow-lg"
          />

          <MiniMap
            className="!bg-surface !border !border-border !rounded-lg !overflow-hidden !shadow-lg"
            nodeColor={n => n.data?.blasted ? '#EF4444' : n.data?.vulnerabilities?.length ? '#F59E0B' : '#262630'}
            maskColor="rgba(10, 10, 12, 0.75)"
          />
        </ReactFlow>
      </div>

      {/* Sticky Bottom Action Bar */}
      <div className="px-6 py-3 bg-surface border-t border-border flex items-center justify-between z-20 shrink-0">
        <div className="flex items-center gap-3">
          <span className={`w-2 h-2 rounded-full ${localSelected ? 'bg-amber-400' : 'bg-muted'}`} />
          <p className="font-mono text-xs text-muted">
            {localSelected ? (
              <span>Target Selected: <strong className="text-text font-bold">{localSelected}</strong></span>
            ) : (
              <span>Click any node card in the graph to select an attack target</span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleInject}
            disabled={!localSelected || isSimulating}
            className="px-5 py-2 rounded-full bg-red-600 hover:bg-red-500 disabled:opacity-30 disabled:cursor-not-allowed text-white font-sans text-xs font-semibold tracking-wide transition-all shadow-md flex items-center gap-2 cursor-pointer"
          >
            <span>⚡</span>
            <span>{isSimulating ? 'Simulating Cascade…' : 'Inject Compromise'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
