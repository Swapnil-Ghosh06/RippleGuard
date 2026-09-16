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

  const [blastSet, setBlastSet] = useState(new Set());
  const [localSelected, setLocalSelected] = useState(null);
  const [logs, setLogs] = useState([]);
  const [logExpanded, setLogExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

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
    setLogs([]);
    setLogExpanded(false);
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

  const handleInject = useCallback(() => {
    if (!localSelected || isSimulating) return;
    setIsSimulating(true);
    setSelectedNode(localSelected);
    setLogExpanded(true);

    setLogs([
      { time: '00:00.000', type: 'SYS', msg: `Initiating breach simulation on ${localSelected}...` }
    ]);

    setTimeout(() => {
      setBlastData(MOCK_BLAST);
      const timers = [];

      MOCK_BLAST.propagation_order.forEach(({ node, delay_ms, event, msg }) => {
        const t = setTimeout(() => {
          setBlastSet(prev => new Set([...prev, node]));
          setLogs(prev => [
            ...prev,
            {
              time: `00:0${(delay_ms / 1000).toFixed(3)}`,
              type: event,
              target: node,
              msg,
            }
          ]);
        }, delay_ms);
        timers.push(t);
      });

      const finalTimer = setTimeout(() => {
        setIsSimulating(false);
        setLogs(prev => [
          ...prev,
          {
            time: '00:01.050',
            type: 'COMPLETE',
            msg: `Cascade complete: 9/10 packages compromised. Threat Score: 91/100 (CRITICAL).`,
          }
        ]);
      }, 1100);
      timers.push(finalTimer);

    }, 250);
  }, [localSelected, isSimulating, setBlastData, setIsSimulating, setSelectedNode]);

  const onNodeClick = useCallback((_, node) => {
    setLocalSelected(prev => {
      const next = prev === node.id ? null : node.id;
      setSelectedNode(next);
      return next;
    });
  }, [setSelectedNode]);

  const handleCopyLogs = () => {
    const text = logs.map(l => `[${l.time}] [${l.type}] ${l.target ? l.target + ' - ' : ''}${l.msg}`).join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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
          {logs.length > 0 && (
            <button
              onClick={() => setLogExpanded(prev => !prev)}
              className="font-mono text-xs text-dim hover:text-text border border-border bg-surface2 px-3 py-1.5 rounded-md transition-colors"
            >
              {logExpanded ? 'Hide Trace Log' : `View Trace Log (${logs.length})`}
            </button>
          )}

          <button
            onClick={handleInject}
            disabled={!localSelected || isSimulating}
            className="px-5 py-2 rounded-md bg-red-600 hover:bg-red-500 disabled:opacity-30 disabled:cursor-not-allowed text-white font-mono text-xs font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer"
          >
            <span>⚡</span>
            <span>{isSimulating ? 'Simulating Cascade…' : 'Inject Compromise'}</span>
          </button>
        </div>
      </div>

      {/* Collapsible Threat Propagation Trace (Inspo 2) */}
      {logExpanded && (
        <div className="border-t border-border bg-void px-5 py-3 shrink-0 z-20 flex flex-col gap-2 max-h-40 overflow-y-auto font-mono text-xs">
          <div className="flex items-center justify-between text-muted text-[11px] pb-1 border-b border-border/60">
            <span>PROPAGATION TELEMETRY TRACE</span>
            <button
              onClick={handleCopyLogs}
              className="text-dim hover:text-text"
            >
              {copied ? '✓ Copied' : 'Copy Log'}
            </button>
          </div>

          <div className="flex flex-col gap-1 select-text">
            {logs.map((log, idx) => (
              <div key={idx} className="flex items-start gap-2.5 leading-relaxed">
                <span className="text-muted shrink-0 text-[11px]">{log.time}</span>
                <span className={`px-1.5 rounded text-[10px] font-bold uppercase shrink-0 ${
                  log.type === 'COMPLETE' ? 'bg-emerald-500/20 text-emerald-400' :
                  log.type === 'INJECT' ? 'bg-red-500/20 text-red-400' :
                  'bg-amber-500/20 text-amber-400'
                }`}>
                  {log.type}
                </span>
                <span className="text-dim">
                  {log.target && <strong className="text-text mr-1">{log.target}</strong>}
                  {log.msg}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
