import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  useViewport,
  MarkerType,
  BackgroundVariant,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { useGraphStore } from '../store/graphStore';
import { useSimulate } from '../hooks/useSimulate';
import { removeNodeAndDescendants, calculateBlastRadiusDelta } from '../utils/graphMutations';
import { findCriticalChain, ButterflyTraceOverlay } from '../utils/butterflyTrace';
import PackageNode from './nodes/PackageNode';
import NodeDetail from './NodeDetail';

const NODE_TYPES = {
  packageNode: PackageNode,
  package: PackageNode,
};

const EDGE_TYPES = {};

const MOCK_BLAST = {
  blast_score: 91,
  packages_affected: 9,
  direct_affected: 3,
  transitive_affected: 6,
  monthly_downloads_affected: '438M',
  human_comparison:
    'Exposure exceeds 330M endpoints monthly — equivalent to compromising every active internet user in the US.',
  mitigations: [
    {
      package: 'lodash@4.17.20',
      fix_version: '4.17.21',
      blast_reduction: 94,
      command: 'npm update lodash@4.17.21',
      description:
        'Patches prototype pollution in zipObjectDeep and template engine injection vectors.',
    },
    {
      package: 'minimatch@3.0.4',
      fix_version: '3.0.5',
      blast_reduction: 61,
      command: 'npm update minimatch@3.0.5',
      description:
        'Neutralizes catastrophic ReDoS backtracking in glob pattern evaluation.',
    },
    {
      package: 'semver@7.5.4',
      fix_version: '7.5.4',
      blast_reduction: 38,
      command: 'npm update semver@7.5.4',
      description:
        'Resolves regular expression denial of service in range comparison engine.',
    },
  ],
  propagation_order: [
    { node: 'lodash@4.17.20', delay_ms: 0, event: 'INJECT', msg: 'Compromised token exploited at entrypoint' },
    { node: 'express@4.18.1', delay_ms: 220, event: 'SPREAD', msg: 'Tainted through require("lodash") linkage' },
    { node: 'react@18.2.0', delay_ms: 260, event: 'SPREAD', msg: 'Tainted through build tooling dependency chain' },
    { node: 'webpack@5.88.0', delay_ms: 480, event: 'CASCADE', msg: 'Bundle compilation pipeline infected' },
    { node: 'next@13.4.0', delay_ms: 600, event: 'CASCADE', msg: 'Full-stack SSR runtime contaminated' },
    { node: 'axios@1.4.0', delay_ms: 650, event: 'CASCADE', msg: 'HTTP client transport layer tainted' },
    { node: 'chalk@5.3.0', delay_ms: 820, event: 'CASCADE', msg: 'Terminal logger tainted' },
    { node: 'semver@7.5.4', delay_ms: 850, event: 'CASCADE', msg: 'Version comparator engine tainted' },
    { node: 'minimatch@3.0.4', delay_ms: 870, event: 'CASCADE', msg: 'Path matcher engine tainted' },
    { node: 'ms@2.1.3', delay_ms: 900, event: 'CASCADE', msg: 'Time parser utility tainted' },
  ],
  propagation_paths: [
    ['lodash@4.17.20', 'express@4.18.1', 'webpack@5.88.0', 'next@13.4.0'],
    ['lodash@4.17.20', 'react@18.2.0', 'axios@1.4.0'],
    ['lodash@4.17.20', 'chalk@5.3.0'],
  ],
};

function ButterflyTraceViewportLayer({ criticalChainNodeIds, getNodePosition, visible }) {
  const { x, y, zoom } = useViewport();

  if (!visible || !criticalChainNodeIds || criticalChainNodeIds.length < 2) {
    return null;
  }

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        transform: `translate(${x}px, ${y}px) scale(${zoom})`,
        transformOrigin: '0 0',
        zIndex: 5,
      }}
    >
      <ButterflyTraceOverlay
        criticalChainNodeIds={criticalChainNodeIds}
        getNodePosition={getNodePosition}
        visible={visible}
      />
    </div>
  );
}

function buildLayout(nodes) {
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
    graphData,
    blastData,
    setBlastData,
    setSelectedNode,
    isSimulating,
    setIsSimulating,
  } = useGraphStore();

  const { simulate } = useSimulate();
  const [blastSet, setBlastSet] = useState(new Set());
  const [criticalChainNodeIds, setCriticalChainNodeIds] = useState([]);
  const [localSelected, setLocalSelected] = useState(null);
  const [detailNode, setDetailNode] = useState(null);
  const [toast, setToast] = useState(null);
  const [prevGraphData, setPrevGraphData] = useState(graphData);

  // Reset local state when a new package graphData is analyzed without useEffect cascading render
  if (graphData !== prevGraphData) {
    setPrevGraphData(graphData);
    setBlastSet(new Set());
    setCriticalChainNodeIds([]);
    setLocalSelected(null);
    setDetailNode(null);
    setToast(null);
  }

  // Auto-dismiss result toast after 4 seconds
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      setToast(null);
    }, 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  const rawNodes = useMemo(
    () => graphData?.nodes ?? graphData?.graph?.nodes ?? [],
    [graphData]
  );
  const rawEdges = useMemo(
    () => graphData?.edges ?? graphData?.graph?.edges ?? [],
    [graphData]
  );

  const positions = useMemo(() => buildLayout(rawNodes), [rawNodes]);

  const rfNodes = useMemo(() => {
    return rawNodes.map((n) => ({
      id: n.id,
      type: 'packageNode',
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
        animated: isHot,
        style: {
          stroke: isHot ? '#e11d48' : '#cbd5e1',
          strokeWidth: isHot ? 2 : 1.2,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: isHot ? '#e11d48' : '#94a3b8',
          width: 14,
          height: 14,
        },
      };
    });
  }, [rawEdges, blastSet]);

  const [nodes, setNodes, onNodesChange] = useNodesState(rfNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(rfEdges);

  // Sync ReactFlow internal state when rfNodes or rfEdges change
  useEffect(() => {
    setNodes(rfNodes);
  }, [rfNodes, setNodes]);

  useEffect(() => {
    setEdges(rfEdges);
  }, [rfEdges, setEdges]);

  const handleInject = useCallback(async (overrideNodeId) => {
    const target = typeof overrideNodeId === 'string' ? overrideNodeId : localSelected;
    if (!target || isSimulating) return;
    setIsSimulating(true);
    setSelectedNode(target);
    setBlastSet(new Set([target]));

    let blast = await simulate(target);
    if (!blast) {
      blast = MOCK_BLAST;
      setBlastData(blast);
    }

    const propOrder = blast.propagation_order || [];
    const timers = [];

    propOrder.forEach(({ node, delay_ms }, idx) => {
      const delay = delay_ms ?? idx * 150;
      const t = setTimeout(() => {
        setBlastSet((prev) => new Set([...prev, typeof node === 'string' ? node : node?.id || node]));
      }, delay);
      timers.push(t);
    });

    const maxDelay = propOrder.length ? Math.max(...propOrder.map((p, i) => p.delay_ms ?? i * 150)) : 800;
    const finalTimer = setTimeout(() => {
      setIsSimulating(false);
      const paths =
        blast.propagation_paths && blast.propagation_paths.length > 0
          ? blast.propagation_paths
          : [propOrder.map((p) => (typeof p.node === 'string' ? p.node : p.node?.id || p.node))];
      const longestChain = findCriticalChain(paths);
      setCriticalChainNodeIds(longestChain);
    }, maxDelay + 200);
    timers.push(finalTimer);
  }, [localSelected, isSimulating, simulate, setBlastData, setIsSimulating, setSelectedNode]);

  const handleReset = useCallback(() => {
    setBlastData(null);
    setBlastSet(new Set());
    setCriticalChainNodeIds([]);
  }, [setBlastData]);

  const handleRemoveNode = useCallback(
    (nodeId) => {
      const targetNode = nodes.find((n) => n.id === nodeId);
      if (targetNode?.data?.isRoot || targetNode?.data?.depth === 0) {
        setToast({
          type: 'warn',
          text: 'Cannot remove the root package — try analyzing a different package instead',
        });
        return;
      }

      const mutation = removeNodeAndDescendants(nodes, edges, nodeId);
      const delta = calculateBlastRadiusDelta(nodes, mutation.nodes);

      setNodes(mutation.nodes);
      setEdges(mutation.edges);
      setDetailNode(null);
      setLocalSelected(null);
      setSelectedNode(null);
      setCriticalChainNodeIds((prev) => prev.filter((id) => id !== nodeId));

      const nodeName = targetNode?.data?.label || targetNode?.data?.name || nodeId;
      setToast({
        type: 'success',
        text: `Removed ${nodeName} — reduced blast radius by ${delta.percentReduced}%, ${delta.nodesRemoved} packages affected`,
      });
    },
    [nodes, edges, setNodes, setEdges, setSelectedNode]
  );

  const getNodePosition = useCallback(
    (nodeId) => {
      const node = nodes.find((n) => n.id === nodeId);
      if (!node || !node.position) return null;
      const w = node.width ?? 180;
      const h = node.height ?? 65;
      return {
        x: node.position.x + w / 2,
        y: node.position.y + h / 2,
      };
    },
    [nodes]
  );

  const onNodeClick = useCallback(
    (_, node) => {
      setDetailNode((prev) => (prev?.id === node.id ? null : node));
      setLocalSelected((prev) => {
        const next = prev === node.id ? null : node.id;
        setSelectedNode(next);
        return next;
      });
    },
    [setSelectedNode]
  );

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
                <span>
                  {blastSet.size}/{rawNodes.length} compromised
                </span>
              </span>
              {criticalChainNodeIds.length >= 2 && (
                <>
                  <span className="text-border">·</span>
                  <span className="text-amber-700 font-medium flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                    <span>🦋</span>
                    <span>Critical Chain: {criticalChainNodeIds.length} hops</span>
                  </span>
                </>
              )}
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
          {/* Butterfly Trace Overlay Layer synced with React Flow viewport */}
          <ButterflyTraceViewportLayer
            criticalChainNodeIds={criticalChainNodeIds}
            getNodePosition={getNodePosition}
            visible={Boolean(blastData) && criticalChainNodeIds.length >= 2}
          />

          <Background
            variant={BackgroundVariant.Dots}
            gap={24}
            size={1.2}
            color="#e4e4e7"
          />

          <Controls className="!bg-white !border !border-border !rounded-xl !shadow-sm" />

          <MiniMap
            className="!bg-white !border !border-border !rounded-xl !shadow-sm"
            nodeColor={(n) =>
              n.data?.blasted
                ? '#e11d48'
                : n.data?.vulnerabilities?.length
                ? '#d97706'
                : '#e4e4e7'
            }
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

      {/* Node detail slide-in inspection panel */}
      <AnimatePresence>
        {detailNode && (
          <NodeDetail
            node={detailNode}
            onClose={() => setDetailNode(null)}
            onInjectCompromise={handleInject}
            onRemoveNode={handleRemoveNode}
          />
        )}
      </AnimatePresence>

      {/* Client-side mutation result toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.96 }}
            transition={{ duration: 0.18 }}
            className={`absolute top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl border shadow-xl flex items-center gap-2.5 font-mono text-xs backdrop-blur-md select-none ${
              toast.type === 'warn'
                ? 'bg-amber-950/90 border-amber-500/60 text-amber-200 shadow-amber-950/30'
                : 'bg-[#0d1829]/95 border-[#1a2d4a] text-emerald-300 shadow-emerald-950/30'
            }`}
          >
            <span>{toast.type === 'warn' ? '⚠️' : '🛡️'}</span>
            <span>{toast.text}</span>
            <button
              type="button"
              onClick={() => setToast(null)}
              className="ml-2 text-slate-400 hover:text-white cursor-pointer leading-none text-sm"
              aria-label="Dismiss toast"
            >
              ×
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
