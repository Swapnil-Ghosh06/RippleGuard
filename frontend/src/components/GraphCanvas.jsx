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
    const criticalSet = new Set(blastData?.critical_chain ?? []);

    return rawEdges.map((e, i) => {
      const isCriticalPath = criticalSet.has(e.source) && criticalSet.has(e.target);
      const isHot = blastSet.has(e.source) || blastSet.has(e.target);

      return {
        id: `e-${i}`,
        source: e.source,
        target: e.target,
        type: 'smoothstep',
        animated: isHot || isCriticalPath,
        style: {
          stroke: isCriticalPath ? '#ca8a04' : isHot ? '#e11d48' : '#d4d4d8',
          strokeWidth: isCriticalPath ? 2.5 : isHot ? 2 : 1.25,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: isCriticalPath ? '#ca8a04' : isHot ? '#e11d48' : '#a1a1aa',
          width: 12,
          height: 12,
        },
      };
    });
  }, [rawEdges, blastSet, blastData]);

  const [nodes, setNodes, onNodesChange] = useNodesState(rfNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(rfEdges);

  useEffect(() => { setNodes(rfNodes); }, [rfNodes]);
  useEffect(() => { setEdges(rfEdges); }, [rfEdges]);

  useEffect(() => {
    setBlastSet(new Set());
    setLocalSelected(null);
  }, [graphData]);

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

  const handleReset = useCallback(() => {
    setBlastData(null);
    setBlastSet(new Set());
  }, [setBlastData]);

  const onNodeClick = useCallback((_, node) => {
    setLocalSelected(prev => {
      const next = prev === node.id ? null : node.id;
      setSelectedNode(next);
      return next;
    });
  }, [setSelectedNode]);

  if (!rawNodes.length) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-white">
        <p className="text-sm text-muted font-sans">No graph loaded.</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col bg-white relative overflow-hidden">
      {/* Top Floating Pill */}
      <div className="absolute top-4 left-4 z-20 flex items-center gap-2 select-none">
        <div className="bg-white/95 backdrop-blur-md border border-border px-3.5 py-1.5 rounded-full flex items-center gap-2.5 text-xs font-sans shadow-sm">
          <div className="flex items-center gap-1.5 font-medium text-text">
            <span className="w-2 h-2 rounded-full bg-black" />
            <span>Dependency Canvas</span>
          </div>
          <span className="text-border">·</span>
          <span className="text-muted">{rawNodes.length} packages</span>
          <span className="text-border">·</span>
          <span className="text-muted">{rawEdges.length} links</span>

          {blastData && (
            <>
              <span className="text-border">·</span>
              <span className="text-rose-700 font-medium flex items-center gap-1 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                <span>⚡</span>
                <span>{blastSet.size}/{rawNodes.length} compromised</span>
              </span>
            </>
          )}
        </div>
      </div>

      {/* React Flow Canvas */}
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
          style={{ background: '#ffffff' }}
          proOptions={{ hideAttribution: true }}
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={24}
            size={1.2}
            color="#e4e4e7"
          />

          <Controls
            className="!bg-white !border !border-border !rounded-xl !shadow-sm"
          />

          <MiniMap
            className="!bg-white !border !border-border !rounded-xl !shadow-sm"
            nodeColor={n => n.data?.blasted ? '#e11d48' : n.data?.vulnerabilities?.length ? '#d97706' : '#e4e4e7'}
            maskColor="rgba(255, 255, 255, 0.65)"
          />
        </ReactFlow>
      </div>

      {/* Minimalist Bottom Toolbar */}
      <div className="bg-white/95 backdrop-blur-md border-t border-border px-6 py-3 flex items-center justify-between z-20 shrink-0">
        {/* Left Side */}
        <div className="flex items-center select-none">
          {localSelected ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted font-sans">Target locked:</span>
              <span className="font-mono text-xs font-semibold text-text bg-surface2 border border-border rounded-md px-2 py-0.5">
                {localSelected}
              </span>
            </div>
          ) : (
            <p className="text-xs text-muted font-sans">
              Select any package card to choose attack origin
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
                ? 'opacity-40 cursor-not-allowed bg-neutral-200 text-neutral-500'
                : 'bg-rose-600 hover:bg-rose-700 text-white'
            }`}
          >
            <span>⚡</span>
            <span>{isSimulating ? 'Simulating Cascade…' : 'Inject Compromise'}</span>
          </button>

          {blastData && (
            <button
              onClick={handleReset}
              className="bg-white hover:bg-surface2 text-text border border-border font-sans font-medium text-xs px-4 py-2 rounded-full cursor-pointer transition-colors"
            >
              Reset
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
