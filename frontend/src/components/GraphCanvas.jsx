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
      <div className="bg-white/95 backdrop-blur-md border border-amber-300 shadow-[0_8px_30px_rgb(245,158,11,0.22)] rounded-2xl p-3.5 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base animate-pulse">🦋</span>
            <div className="flex items-baseline gap-1.5">
              <span className="font-sans text-xs font-bold text-amber-950 uppercase tracking-wider">
                Butterfly Domino Trace
              </span>
              <span className="text-[10px] font-mono text-amber-800 bg-amber-100/90 px-1.5 py-0.5 rounded border border-amber-200">
                Hop {currentStep + 1} of {criticalChain.length}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <span className={`text-[10px] font-sans font-medium px-2 py-0.5 rounded-full border ${
              isOrigin
                ? 'bg-rose-100 text-rose-800 border-rose-200 font-semibold'
                : isFrontier
                ? 'bg-purple-100 text-purple-800 border-purple-200 font-semibold'
                : 'bg-amber-100 text-amber-800 border-amber-200'
            }`}>
              {isOrigin ? '⚡ Compromise Origin' : isFrontier ? '🏁 Exposure Frontier' : 'Cascading Link'}
            </span>
            <button
              type="button"
              onClick={onClose}
              className="w-5 h-5 rounded-full hover:bg-surface2 flex items-center justify-center text-muted hover:text-text text-xs cursor-pointer ml-1"
              title="Close Stepper"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Current Node Display & Stepper Controls */}
        <div className="flex items-center justify-between gap-3 pt-1 border-t border-amber-100">
          <div className="min-w-0 flex-1">
            <p className="font-mono text-xs font-bold text-text truncate">
              {currentNode}
            </p>
            <p className="text-[10px] text-muted font-sans truncate">
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
              className="px-2 py-1 rounded-lg bg-surface2 hover:bg-surface3 disabled:opacity-40 text-text font-mono text-[10px] cursor-pointer"
              title="Reset to Origin"
            >
              ⏮
            </button>
            <button
              type="button"
              onClick={() => onStepChange(Math.max(0, currentStep - 1))}
              disabled={currentStep === 0}
              className="px-2.5 py-1 rounded-lg bg-surface2 hover:bg-surface3 disabled:opacity-40 text-text font-sans text-xs font-semibold cursor-pointer"
              title="Previous Hop"
            >
              ◀
            </button>
            <button
              type="button"
              onClick={onTogglePlay}
              className={`px-3 py-1 rounded-lg font-sans text-xs font-semibold flex items-center gap-1 cursor-pointer transition-all shadow-xs ${
                isPlaying
                  ? 'bg-amber-600 hover:bg-amber-700 text-white animate-pulse'
                  : 'bg-amber-500 hover:bg-amber-600 text-white'
              }`}
            >
              <span>{isPlaying ? '⏸' : '▶'}</span>
              <span>{isPlaying ? 'Pause' : 'Cascade'}</span>
            </button>
            <button
              type="button"
              onClick={() => onStepChange(Math.min(criticalChain.length - 1, currentStep + 1))}
              disabled={currentStep === criticalChain.length - 1}
              className="px-2.5 py-1 rounded-lg bg-surface2 hover:bg-surface3 disabled:opacity-40 text-text font-sans text-xs font-semibold cursor-pointer"
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

export default function GraphCanvas() {
  const {
    graphData, blastData,
    setBlastData, selectedNode, setSelectedNode,
    isSimulating, setIsSimulating,
    activeTab, setActiveTab,
    activeDominoIndex, setActiveDominoIndex,
    isDominoPlaying, setIsDominoPlaying,
    sandboxPatches, toggleSandboxPatch, clearSandboxPatches,
  } = useGraphStore();

  const { simulate } = useSimulate();
  const [blastSet, setBlastSet] = useState(new Set());
  const [localSelected, setLocalSelected] = useState(selectedNode);

  useEffect(() => {
    if (selectedNode !== undefined && selectedNode !== localSelected) {
      setLocalSelected(selectedNode);
    }
  }, [selectedNode]);

  const rawNodes = graphData?.nodes ?? graphData?.graph?.nodes ?? [];
  const rawEdges = graphData?.edges ?? graphData?.graph?.edges ?? [];

  const positions = useMemo(() => buildLayout(rawNodes, rawEdges), [rawNodes]);

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

  const rfNodes = useMemo(() => {
    const activeDominoNodeId = (activeDominoIndex !== null && activeDominoIndex !== undefined)
      ? criticalChain[activeDominoIndex]
      : null;

    return rawNodes.map(n => ({
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
      },
    }));
  }, [rawNodes, positions, effectiveTaintedSet, localSelected, dominoIndexMap, activeDominoIndex, criticalChain, sandboxPatches, protectedSet]);

  const rfEdges = useMemo(() => {
    return rawEdges.map((e, i) => {
      const u = typeof e.source === 'string' ? e.source : e.source?.id;
      const v = typeof e.target === 'string' ? e.target : e.target?.id;
      const isCriticalPath = criticalEdgePairs.has(`${u}->${v}`);
      const isHot = effectiveTaintedSet.has(u) || effectiveTaintedSet.has(v);

      const isSeveredByPatch = sandboxPatches.includes(u) || sandboxPatches.includes(v);
      const isCurrentDominoHop = activeDominoIndex !== null && activeDominoIndex > 0 &&
        (
          (criticalChain[activeDominoIndex - 1] === u && criticalChain[activeDominoIndex] === v) ||
          (criticalChain[activeDominoIndex - 1] === v && criticalChain[activeDominoIndex] === u)
        );

      return {
        id: `e-${i}`,
        source: u,
        target: v,
        type: 'smoothstep',
        animated: isHot || isCriticalPath,
        style: {
          stroke: isSeveredByPatch
            ? '#10b981'
            : isCurrentDominoHop
            ? '#f59e0b'
            : isCriticalPath
            ? '#d97706'
            : isHot
            ? '#e11d48'
            : '#d4d4d8',
          strokeWidth: isSeveredByPatch ? 2.5 : isCurrentDominoHop ? 4.5 : isCriticalPath ? 3.5 : isHot ? 2 : 1.25,
          strokeDasharray: isSeveredByPatch ? '4 4' : isCriticalPath ? '6 4' : undefined,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: isSeveredByPatch ? '#10b981' : isCurrentDominoHop ? '#f59e0b' : isCriticalPath ? '#d97706' : isHot ? '#e11d48' : '#a1a1aa',
          width: isCriticalPath || isSeveredByPatch ? 14 : 12,
          height: isCriticalPath || isSeveredByPatch ? 14 : 12,
        },
      };
    });
  }, [rawEdges, effectiveTaintedSet, criticalEdgePairs, activeDominoIndex, criticalChain, sandboxPatches]);

  const [nodes, setNodes, onNodesChange] = useNodesState(rfNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(rfEdges);

  useEffect(() => { setNodes(rfNodes); }, [rfNodes]);
  useEffect(() => { setEdges(rfEdges); }, [rfEdges]);

  useEffect(() => {
    setBlastSet(new Set());
    setLocalSelected(null);
    setActiveDominoIndex(null);
    setIsDominoPlaying(false);
    clearSandboxPatches();
  }, [graphData]);

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
    setLocalSelected(prev => {
      const next = prev === node.id ? null : node.id;
      setSelectedNode(next);
      return next;
    });
  }, [setSelectedNode]);

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
                <span>{effectiveTaintedSet.size}/{rawNodes.length} compromised</span>
              </span>

              {criticalChain.length > 1 && (
                <>
                  <span className="text-border">·</span>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveDominoIndex(0);
                      const originId = criticalChain[0];
                      if (originId) setSelectedNode(originId);
                      setIsDominoPlaying(true);
                    }}
                    className="text-amber-900 font-bold flex items-center gap-1.5 bg-amber-100 hover:bg-amber-200 px-2.5 py-0.5 rounded-full border border-amber-300 cursor-pointer transition-all active:scale-95"
                  >
                    <span>🦋</span>
                    <span>Domino Trace ({criticalChain.length})</span>
                  </button>
                </>
              )}

              {sandboxPatches.length > 0 && (
                <>
                  <span className="text-border">·</span>
                  <span className="text-emerald-800 font-semibold flex items-center gap-1.5 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-300">
                    <span>🛡️</span>
                    <span>Sandbox: {sandboxPatches.length} Patched ({protectedSet.size} Shielded)</span>
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
            nodeColor={n => n.data?.isSandboxPatched ? '#10b981' : n.data?.dominoIndex ? '#f59e0b' : n.data?.blasted ? '#e11d48' : n.data?.vulnerabilities?.length ? '#d97706' : '#e4e4e7'}
            maskColor="rgba(255, 255, 255, 0.65)"
          />
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
      <div className="bg-white/95 backdrop-blur-md border-t border-border px-6 py-3 flex items-center justify-between z-20 shrink-0">
        {/* Left Side */}
        <div className="flex items-center gap-3 select-none">
          {localSelected ? (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-muted font-sans">Target:</span>
              <span className="font-mono text-xs font-semibold text-text bg-surface2 border border-border rounded-md px-2 py-0.5">
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
                      : 'bg-white hover:bg-emerald-50 text-emerald-950 border-emerald-300'
                  }`}
                >
                  <span>🛡️</span>
                  <span>{sandboxPatches.includes(localSelected) ? 'Remove Virtual Patch' : 'Apply Virtual Patch'}</span>
                </button>
              )}
            </div>
          ) : (
            <p className="text-xs text-muted font-sans">
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
