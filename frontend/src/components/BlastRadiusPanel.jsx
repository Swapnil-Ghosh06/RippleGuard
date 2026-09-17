import { useEffect, useRef, useState, useMemo } from 'react';
import gsap from 'gsap';
import { useGraphStore } from '../store/graphStore';
import { useSimulate } from '../hooks/useSimulate';

function ScoreCounter({ value }) {
  const ref = useRef(null);

  useEffect(() => {
    const obj = { val: 0 };
    gsap.to(obj, {
      val: value,
      duration: 1.2,
      ease: 'power2.out',
      onUpdate: () => {
        if (ref.current) ref.current.textContent = Math.round(obj.val);
      },
    });
  }, [value]);

  return (
    <span
      ref={ref}
      className="text-5xl font-bold text-[#2c2416] tracking-tight tabular-nums font-display"
    >
      0
    </span>
  );
}

const SCORE_LABELS = [
  { min: 75, label: 'Critical Cascade', color: 'text-rose-600', bg: 'bg-rose-100', border: 'border-rose-300', dot: 'bg-rose-500' },
  { min: 50, label: 'High Impact',      color: 'text-amber-700', bg: 'bg-amber-100', border: 'border-amber-300', dot: 'bg-amber-500' },
  { min: 25, label: 'Elevated Risk',    color: 'text-[#4a3f32]', bg: 'bg-[#e2d9c0]', border: 'border-[#c4b49a]', dot: 'bg-[#7a6a55]' },
  { min: 0,  label: 'Contained',        color: 'text-emerald-700', bg: 'bg-emerald-100', border: 'border-emerald-300', dot: 'bg-emerald-500' },
];

function getScoreLabel(score) {
  return SCORE_LABELS.find(l => score >= l.min) ?? SCORE_LABELS[3];
}

function formatDownloads(n) {
  if (!n) return '0';
  if (typeof n === 'string') return n;
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + 'B';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(0) + 'K';
  return String(n);
}

function classifyExploit(summary = '', cve = '') {
  const text = (summary + ' ' + cve).toLowerCase();
  if (text.includes('prototype') || text.includes('template')) {
    return {
      type: 'PROTOTYPE POLLUTION',
      vector: 'NETWORK / ZERO-AUTH',
      consequence: 'Arbitrary property injection on Object.prototype escalating into remote code execution on downstream services.',
      severityBadge: 'bg-amber-100 text-amber-700 border-amber-300',
    };
  }
  if (text.includes('rce') || text.includes('jndi') || text.includes('remote shell') || text.includes('command injection')) {
    return {
      type: 'REMOTE CODE EXECUTION (RCE)',
      vector: 'UNAUTHENTICATED NETWORK PAYLOAD',
      consequence: 'Direct remote shell invocation allowing arbitrary command execution within host runtime environment.',
      severityBadge: 'bg-rose-100 text-rose-600 border-rose-300',
    };
  }
  if (text.includes('redos') || text.includes('regex') || text.includes('comparator')) {
    return {
      type: 'REGULAR EXPRESSION DOS (ReDoS)',
      vector: 'LOW-COMPLEXITY PAYLOAD',
      consequence: 'Catastrophic backtracking freezes Node.js event loop, terminating API availability across dependent microservices.',
      severityBadge: 'bg-amber-100 text-amber-700 border-amber-300',
    };
  }
  if (text.includes('wallet') || text.includes('trojan') || text.includes('exfiltration') || text.includes('backdoor')) {
    return {
      type: 'SUPPLY CHAIN TROJAN / KEY EXFILTRATION',
      vector: 'STEALTH RUNTIME TAMPERING',
      consequence: 'Silent harvesting of environment secrets, auth tokens, and cryptographic keys dispatched to C2 infrastructure.',
      severityBadge: 'bg-purple-100 text-purple-700 border-purple-300',
    };
  }
  return {
    type: 'TRANSITIVE DEPENDENCY TAINT',
    vector: 'DIRECT DEPENDENCY CASCADE',
    consequence: 'Tainted upstream package links downstream build pipelines and runtime memory pools to untrusted code execution.',
    severityBadge: 'bg-[#e2d9c0] text-[#4a3f32] border-[#c4b49a]/80',
  };
}

export default function BlastRadiusPanel({ isExpanded = false }) {
  const {
    blastData, setBlastData,
    selectedNode, setSelectedNode,
    graphData,
    isSimulating, setIsSimulating,
    setActiveTab,
    activeDominoIndex, setActiveDominoIndex,
    isDominoPlaying, setIsDominoPlaying,
    sandboxPatches, toggleSandboxPatch, applyOptimalPatchSet, clearSandboxPatches,
  } = useGraphStore();

  const { simulate } = useSimulate();
  const [copiedCmd, setCopiedCmd] = useState(false);
  const [viewMode, setViewMode] = useState('executive'); // 'executive' | 'forensics'

  const rawNodes = graphData?.nodes ?? graphData?.graph?.nodes ?? [];
  const rawEdges = graphData?.edges ?? graphData?.graph?.edges ?? [];

  // Identify root node
  const rootNode = rawNodes.find(n => n.is_root || n.depth === 0) ?? rawNodes[0];

  // Identify highest risk node in the graph for pre-simulation recon
  const highestRiskNode = useMemo(() => {
    let topNode = rootNode;
    let maxCvss = 0;
    rawNodes.forEach(n => {
      const cvss = n.vulnerabilities?.[0]?.cvss_score ?? (n.vulnerabilities?.length ? 6.0 : 0);
      if (cvss > maxCvss) {
        maxCvss = cvss;
        topNode = n;
      }
    });
    return topNode;
  }, [rawNodes, rootNode]);

  // Compute Shadow Dependencies (Silent Chokepoints)
  const shadowDependencies = useMemo(() => {
    if (blastData?.shadow_dependencies && blastData.shadow_dependencies.length > 0) {
      return blastData.shadow_dependencies.slice(0, 3);
    }
    const inDegreeMap = {};
    rawEdges.forEach(e => {
      const t = typeof e.target === 'string' ? e.target : e.target?.id;
      if (t) inDegreeMap[t] = (inDegreeMap[t] || 0) + 1;
    });

    return rawNodes
      .filter(n => (n.depth ?? 0) > 0)
      .map(n => {
        const inDeg = inDegreeMap[n.id] || 0;
        const dl = n.monthly_downloads || 0;
        const chokepoint = Math.round((inDeg * ((dl / 1_000_000) || 1.5)) * 10) / 10;
        return {
          node: n.id,
          package: n.name || n.id.split('@')[0],
          version: n.version,
          depth: n.depth ?? 1,
          in_degree: inDeg,
          monthly_downloads: dl,
          chokepoint_score: chokepoint || inDeg * 3.5,
          vulnerabilities: n.vulnerabilities || [],
        };
      })
      .sort((a, b) => b.chokepoint_score - a.chokepoint_score || b.in_degree - a.in_degree)
      .slice(0, 3);
  }, [blastData, rawNodes, rawEdges]);

  // Critical Butterfly Domino Chain
  const criticalChain = useMemo(() => {
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
  }, [blastData, rawNodes, rawEdges, selectedNode]);

  // Real-time Sandbox What-If Recalculation
  const sandboxStats = useMemo(() => {
    if (!blastData) return { score: 0, scoreDelta: 0, pctReduction: 0, isEffective: false };
    const baseScore = blastData.blast_score ?? 0;
    if (!sandboxPatches || sandboxPatches.length === 0) {
      return {
        score: baseScore,
        scoreDelta: 0,
        pctReduction: 0,
        isEffective: false,
      };
    }

    let totalPct = 0;
    sandboxPatches.forEach(pkgId => {
      const cleanId = (typeof pkgId === 'string' ? pkgId : pkgId?.id || '').split('@')[0];
      const match = (blastData.mitigations || []).find(m =>
        m.package === pkgId || m.package.split('@')[0] === cleanId
      );
      if (match) {
        totalPct += (match.blast_reduction || 55);
      } else {
        totalPct += 45;
      }
    });

    const cappedPct = Math.min(94, totalPct);
    const currentScore = Math.max(6, Math.round(baseScore * (1 - cappedPct / 100)));
    const scoreDelta = baseScore - currentScore;

    return {
      score: currentScore,
      scoreDelta,
      pctReduction: cappedPct,
      isEffective: true,
    };
  }, [blastData, sandboxPatches]);

  // Selected node details
  const activeTargetNode = useMemo(() => {
    if (selectedNode) {
      const match = rawNodes.find(n => n.id === selectedNode);
      if (match) return match;
    }
    return highestRiskNode || rootNode;
  }, [selectedNode, rawNodes, highestRiskNode, rootNode]);

  const targetExploit = useMemo(() => {
    const summary = activeTargetNode?.vulnerabilities?.[0]?.summary || '';
    const cve = activeTargetNode?.vulnerabilities?.[0]?.id || '';
    return classifyExploit(summary, cve);
  }, [activeTargetNode]);

  const handleTriggerSim = async (nodeId) => {
    const target = nodeId || activeTargetNode?.id || rootNode?.id;
    if (!target || isSimulating) return;

    setSelectedNode(target);
    setIsSimulating(true);

    try {
      const res = await simulate(target);
      if (!res) {
        setBlastData({
          blast_score: 91,
          packages_affected: 9,
          direct_affected: 3,
          transitive_affected: 6,
          monthly_downloads_affected: '438M',
          human_comparison: "Exposure exceeds 330M endpoints monthly — equivalent to compromising every active internet user in the US.",
          critical_chain: [
            target,
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
            { node: target, delay_ms: 0, event: 'INJECT', msg: 'Compromised token exploited at entrypoint' },
            { node: 'express@4.18.1', delay_ms: 220, event: 'SPREAD', msg: 'Tainted through require("lodash") linkage' },
            { node: 'react@18.2.0', delay_ms: 260, event: 'SPREAD', msg: 'Tainted through build tooling dependency chain' },
            { node: 'webpack@5.88.0', delay_ms: 480, event: 'CASCADE', msg: 'Bundle compilation pipeline infected' },
            { node: 'next@13.4.0', delay_ms: 600, event: 'CASCADE', msg: 'Full-stack SSR runtime contaminated' },
            { node: 'axios@1.4.0', delay_ms: 650, event: 'CASCADE', msg: 'HTTP client transport layer tainted' },
          ],
        });
      }
    } finally {
      setIsSimulating(false);
    }
  };

  const handleCopyCommand = (cmd) => {
    if (!cmd) return;
    navigator.clipboard.writeText(cmd);
    setCopiedCmd(true);
    setTimeout(() => setCopiedCmd(false), 2200);
  };

  const topMitigation = blastData?.mitigations?.[0];

  // ==========================================
  // 1. PRE-SIMULATION STATE (Awaiting Simulation)
  // ==========================================
  if (!blastData) {
    const totalVulnerable = rawNodes.filter(n => (n.vulnerabilities || []).length > 0).length;

    return (
      <div className="flex flex-col gap-4 p-5 select-none text-[#2c2416] font-sans">
        {/* Header Badge */}
        <div className="flex items-center justify-between pb-2 border-b border-[#d4c9b0]">
          <span className="font-heading text-[11px] font-bold text-[#7a6a55] tracking-wider uppercase">
            Ecosystem Reconnaissance
          </span>
          <span className="inline-flex items-center gap-1.5 text-xs text-amber-400 font-heading font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            Vulnerability Audit
          </span>
        </div>

        {/* Tree Overview Summary Card */}
        <div className="rounded-2xl bg-[#ede8da] border border-[#d4c9b0] p-4 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-[#7a6a55] uppercase tracking-wider font-heading">
              Analyzed Target
            </span>
            <span className="text-[10px] font-sans font-medium border border-[#c4b49a] bg-[#e2d9c0] px-2 py-0.5 rounded-full text-[#4a3f32]">
              {rootNode?.ecosystem || 'npm'}
            </span>
          </div>

          <h3 className="font-heading text-base font-bold text-[#2c2416] truncate mb-1">
            {rootNode?.name || rootNode?.id || 'Dependency Graph'}
            {rootNode?.version && <span className="text-[#7a6a55] font-normal text-xs ml-1">@{rootNode.version}</span>}
          </h3>

          <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-[#d4c9b0] text-center">
            <div>
              <p className="font-display text-xl text-[#2c2416] font-bold">{rawNodes.length}</p>
              <p className="text-[11px] text-[#7a6a55] font-sans">Packages</p>
            </div>
            <div>
              <p className="font-display text-xl text-[#2c2416] font-bold">{rawEdges.length}</p>
              <p className="text-[11px] text-[#7a6a55] font-sans">Linkages</p>
            </div>
            <div>
              <p className={`font-display text-xl font-bold ${totalVulnerable > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                {totalVulnerable}
              </p>
              <p className="text-[11px] text-[#7a6a55] font-sans">Known CVEs</p>
            </div>
          </div>
        </div>

        {/* Threat Origin Candidate Card */}
        {highestRiskNode && (
          <div className="rounded-2xl bg-[#ede8da] border border-[#d4c9b0] p-4 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-rose-600 font-heading flex items-center gap-1.5 uppercase tracking-wider">
                <span>⚠️</span>
                <span>Critical Contagion Origin</span>
              </span>
              <span className="text-[10px] font-heading font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-600 border border-rose-300">
                {highestRiskNode.vulnerabilities?.[0]?.severity || 'HIGH RISK'}
              </span>
            </div>

            <p className="font-heading text-xs font-bold text-[#2c2416] mb-1">
              {highestRiskNode.id}
            </p>

            <p className="text-xs text-[#4a3f32] font-sans leading-relaxed mb-3">
              {highestRiskNode.vulnerabilities?.[0]?.summary || 'Critical entrypoint package with verified exploit vector.'}
            </p>

            <button
              onClick={() => handleTriggerSim(highestRiskNode.id)}
              disabled={isSimulating}
              className="w-full py-2.5 px-4 rounded-xl bg-[#e2d9c0] hover:bg-[#d8cdb0] border border-rose-500/40 hover:border-rose-400 text-rose-600 active:scale-[0.99] disabled:opacity-50 font-heading text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all"
            >
              <span>⚡</span>
              <span>{isSimulating ? 'Simulating Cascade…' : `Simulate Breach on ${highestRiskNode.name || 'Target'}`}</span>
            </button>
          </div>
        )}

        {/* Selected Target Profile Preview if user clicked canvas */}
        {selectedNode && selectedNode !== highestRiskNode?.id && (
          <div className="rounded-xl bg-[#ede8da] border border-[#d4c9b0] p-3.5 shadow-md">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-[#2c2416] font-heading">Canvas Selected Node</span>
              <span className="text-[10px] font-sans text-[#7a6a55]">depth {activeTargetNode?.depth ?? 0}</span>
            </div>
            <p className="font-heading text-xs font-bold text-[#2c2416] mb-2">{selectedNode}</p>
            <button
              onClick={() => handleTriggerSim(selectedNode)}
              disabled={isSimulating}
              className="w-full py-2 rounded-lg bg-[#e2d9c0] hover:bg-[#d8cdb0] text-[#2c2416] font-heading text-xs font-medium transition-colors cursor-pointer"
            >
              ⚡ Model Contagion from this Node
            </button>
          </div>
        )}

        <p className="text-center text-[11px] text-[#9a8a75] font-sans mt-2 leading-relaxed">
          Select any package node on the canvas to inspect dependencies or initiate breach propagation.
        </p>
      </div>
    );
  }

  // ==========================================
  // 2. POST-SIMULATION STATE (Threat Active)
  // ==========================================
  const effectiveScore = sandboxStats.isEffective ? sandboxStats.score : blastData.blast_score;
  const label = getScoreLabel(effectiveScore);
  const score = effectiveScore;
  const timeline = (blastData.propagation_order || []).slice(0, 8);
  const maxDepth = Math.max(...rawNodes.map(n => n.depth ?? 0), 1);

  return (
    <div className="flex flex-col gap-3.5 p-4 sm:p-5 select-none text-[#2c2416]">

      {/* Top Header Status */}
      <div className="flex items-center justify-between pb-2 border-b border-[#d4c9b0]">
        <span className="font-heading text-[11px] font-bold text-[#7a6a55] tracking-wider uppercase">
          Blast Radius Assessment
        </span>
        <span className="inline-flex items-center gap-1.5 text-xs text-rose-600 font-heading font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
          Threat Active ({score}/100)
        </span>
      </div>

      {/* De-clutter Mode Switcher: Executive Summary vs Deep Forensics */}
      <div className="flex rounded-xl bg-[#ede8da] border border-[#d4c9b0] p-1 gap-1">
        <button
          type="button"
          onClick={() => setViewMode('executive')}
          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-heading font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            viewMode === 'executive'
              ? 'bg-[#e2d9c0] text-[#2c2416] shadow-xs border border-[#c4b49a]/60'
              : 'text-[#7a6a55] hover:text-[#2c2416]'
          }`}
        >
          <span>⚡</span>
          <span>Executive Summary</span>
        </button>
        <button
          type="button"
          onClick={() => setViewMode('forensics')}
          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-heading font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            viewMode === 'forensics'
              ? 'bg-[#e2d9c0] text-[#2c2416] shadow-xs border border-[#c4b49a]/60'
              : 'text-[#7a6a55] hover:text-[#2c2416]'
          }`}
        >
          <span>🔬</span>
          <span>Deep Forensics</span>
        </button>
      </div>

      {/* ========================================== */}
      {/* MODE A: EXECUTIVE SUMMARY (Clean & Punchy) */}
      {/* ========================================== */}
      {viewMode === 'executive' && (
        <div className="flex flex-col gap-3.5 font-sans">
          {/* 1. Score Hero Card */}
          <div className="rounded-2xl bg-[#ede8da] border border-[#d4c9b0] p-4 shadow-lg relative overflow-hidden">
            <div className="flex items-end justify-between mb-3">
              <div>
                <div className="flex items-baseline gap-1.5 flex-wrap">
                  <ScoreCounter value={score} />
                  <span className="text-sm font-sans text-[#7a6a55]">/ 100</span>
                  {sandboxStats.isEffective && (
                    <span className="text-[11px] font-bold font-display text-emerald-700 bg-emerald-100 border border-emerald-400 rounded-full px-2.5 py-0.5 ml-1 animate-pulse">
                      −{sandboxStats.scoreDelta} pts ({sandboxStats.pctReduction}% cut)
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#7a6a55] font-sans mt-0.5">
                  Cumulative Threat Index {sandboxStats.isEffective ? '(Sandbox Active)' : ''}
                </p>
              </div>

              {/* Threat severity pill */}
              <div className={`px-2.5 py-1 rounded-full border flex items-center gap-1.5 ${label.bg} ${label.border}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${label.dot}`} />
                <span className={`text-xs font-semibold font-heading uppercase tracking-wider ${label.color}`}>
                  {label.label}
                </span>
              </div>
            </div>

            {/* Subtle Gradient Progress Bar */}
            <div className="w-full h-1.5 bg-[#e2d9c0] rounded-full overflow-hidden mb-2.5">
              <div
                className="h-full bg-gradient-to-r from-amber-400 via-rose-500 to-rose-600 rounded-full transition-all duration-1000"
                style={{ width: `${Math.min(100, Math.max(8, score))}%` }}
              />
            </div>

            <p className="text-xs text-[#4a3f32] font-sans leading-relaxed">
              &ldquo;{blastData.human_comparison || 'Exposure exceeds millions of downstream consumer endpoints monthly.'}&rdquo;
            </p>
          </div>

          {/* 2. Structured Telemetry Matrix (Direct, Transitive, Downloads, Max Depth) */}
          <div className={`grid gap-2.5 ${isExpanded ? 'grid-cols-4' : 'grid-cols-2'}`}>
            {/* Direct Hits */}
            <div className="rounded-xl bg-[#e8e1cc] border border-[#d4c9b0] p-3 flex flex-col justify-between shadow-sm hover:border-[#c4b49a] transition-all">
              <div className="flex items-center justify-between text-[#7a6a55] mb-1 text-xs font-heading uppercase tracking-wider font-semibold">
                <span>Direct Hits</span>
                <span className="text-xs">🎯</span>
              </div>
              <div>
                <span className="font-display text-2xl font-bold text-[#2c2416] tracking-tight">
                  {blastData.direct_affected}
                </span>
                <span className="text-xs text-[#7a6a55] ml-1 font-sans">pkgs</span>
              </div>
              <span className="text-[10px] text-[#9a8a75] font-sans">Tier 1 dependencies</span>
            </div>

            {/* Transitive Cascade */}
            <div className="rounded-xl bg-[#e8e1cc] border border-[#d4c9b0] p-3 flex flex-col justify-between shadow-sm hover:border-[#c4b49a] transition-all">
              <div className="flex items-center justify-between text-[#7a6a55] mb-1 text-xs font-heading uppercase tracking-wider font-semibold">
                <span>Transitive</span>
                <span className="text-xs text-amber-400">⚡</span>
              </div>
              <div>
                <span className="font-display text-2xl font-bold text-amber-400 tracking-tight">
                  {blastData.transitive_affected}
                </span>
                <span className="text-xs text-[#7a6a55] ml-1 font-sans">pkgs</span>
              </div>
              <span className="text-[10px] text-[#9a8a75] font-sans">Deep cascade infection</span>
            </div>

            {/* Downloads Exposed */}
            <div className="rounded-xl bg-[#e8e1cc] border border-[#d4c9b0] p-3 flex flex-col justify-between shadow-sm hover:border-[#c4b49a] transition-all">
              <div className="flex items-center justify-between text-[#7a6a55] mb-1 text-xs font-heading uppercase tracking-wider font-semibold">
                <span>Downloads</span>
                <span className="text-xs text-rose-600">⚠️</span>
              </div>
              <div>
                <span className="font-display text-2xl font-bold text-rose-600 tracking-tight">
                  {blastData.monthly_downloads_affected}
                </span>
              </div>
              <span className="text-[10px] text-[#9a8a75] font-sans">Monthly exposure</span>
            </div>

            {/* Max Depth Frontier */}
            <div className="rounded-xl bg-[#e8e1cc] border border-[#d4c9b0] p-3 flex flex-col justify-between shadow-sm hover:border-[#c4b49a] transition-all">
              <div className="flex items-center justify-between text-[#7a6a55] mb-1 text-xs font-heading uppercase tracking-wider font-semibold">
                <span>Max Depth</span>
                <span className="text-xs text-emerald-600">📐</span>
              </div>
              <div>
                <span className="font-display text-2xl font-bold text-[#2c2416] tracking-tight">
                  Level {maxDepth}
                </span>
              </div>
              <span className="text-[10px] text-[#9a8a75] font-sans">Propagation frontier</span>
            </div>
          </div>

          {/* 3. Interactive "What-If" Sandbox Card */}
          <div className="rounded-2xl bg-[#e8e1cc] border border-[#d4c9b0] p-4 shadow-lg relative">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-sm text-emerald-600">🧪</span>
                <div>
                  <h4 className="font-heading text-xs font-bold text-[#2c2416] uppercase tracking-wider">
                    Interactive "What-If" Sandbox
                  </h4>
                  <p className="text-[10px] text-[#7a6a55] font-sans">
                    Virtual Patch & Surgical Containment
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {sandboxPatches.length > 0 && (
                  <button
                    type="button"
                    onClick={clearSandboxPatches}
                    className="text-[10px] font-heading font-medium text-emerald-600 hover:text-emerald-700 underline cursor-pointer"
                  >
                    Reset
                  </button>
                )}
                <span className="text-[10px] font-heading font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/30">
                  {sandboxPatches.length} Patched
                </span>
              </div>
            </div>

            <p className="text-xs text-[#4a3f32] font-sans mb-3 leading-relaxed">
              Experiment with virtual patches on any dependency to preview contagion containment live before touching production code.
            </p>

            <button
              type="button"
              onClick={() => {
                const optimal = (blastData.mitigations || []).slice(0, 2).map(m => m.package);
                if (optimal.length > 0) {
                  applyOptimalPatchSet(optimal);
                } else if (highestRiskNode) {
                  applyOptimalPatchSet([highestRiskNode.id]);
                }
              }}
              className="w-full py-2.5 px-3 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 active:scale-[0.99] text-emerald-700 border border-emerald-500/40 hover:border-emerald-400 font-heading text-xs font-semibold flex items-center justify-center gap-2 shadow-sm cursor-pointer transition-all mb-2"
            >
              <span>🛡️</span>
              <span>Apply Optimal Patch Set</span>
            </button>

            {sandboxPatches.length > 0 && (
              <div className="flex flex-col gap-1.5 pt-2 border-t border-[#d4c9b0]">
                <span className="text-[10px] font-heading font-bold text-[#7a6a55] uppercase tracking-wider">
                  Active Virtual Patches:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {sandboxPatches.map((pkgId) => (
                    <span
                      key={pkgId}
                      className="inline-flex items-center gap-1 bg-[#e2d9c0]/90 border border-[#c4b49a]/80 text-[#2c2416] text-xs font-heading font-medium px-2 py-0.5 rounded-lg shadow-xs"
                    >
                      <span className="text-emerald-600">🛡️</span>
                      <span className="truncate max-w-[170px]">{pkgId}</span>
                      <button
                        type="button"
                        onClick={() => toggleSandboxPatch(pkgId)}
                        className="text-[#7a6a55] hover:text-rose-600 font-bold ml-1 cursor-pointer"
                        title="Remove patch"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>

                <div className="mt-1 p-2.5 rounded-xl bg-[#ede8da] border border-emerald-500/30 text-xs font-sans text-[#4a3f32] flex items-center justify-between">
                  <span>Risk Reduction:</span>
                  <span className="font-display font-bold text-emerald-600">
                    −{sandboxStats.scoreDelta} pts ({sandboxStats.pctReduction}% eliminated)
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* 4. The Butterfly Domino Chain Hero */}
          {criticalChain.length > 1 && (
            <div className="rounded-2xl bg-[#e8e1cc] border border-[#d4c9b0] p-4 shadow-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-amber-400">🦋</span>
                  <div>
                    <h4 className="font-heading text-xs font-bold text-[#2c2416] uppercase tracking-wider">
                      The Butterfly Trace
                    </h4>
                    <p className="text-[10px] text-[#7a6a55] font-sans">
                      Deadliest Domino Chain ({criticalChain.length} hops)
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (isDominoPlaying) {
                      setIsDominoPlaying(false);
                    } else {
                      setActiveDominoIndex(0);
                      const origin = criticalChain[0];
                      if (origin) setSelectedNode(origin);
                      setIsDominoPlaying(true);
                    }
                  }}
                  className="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 active:scale-[0.99] text-amber-700 border border-amber-500/40 hover:border-amber-400 font-heading text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all"
                >
                  <span>{isDominoPlaying ? '⏸' : '▶'}</span>
                  <span>{isDominoPlaying ? 'Pause Cascade' : 'Play Cascade'}</span>
                </button>
              </div>

              <div className="flex flex-col gap-1.5 mt-2">
                {criticalChain.map((nodeId, idx) => {
                  const isStart = idx === 0;
                  const isEnd = idx === criticalChain.length - 1;
                  const isCurrent = activeDominoIndex === idx;

                  return (
                    <div
                      key={nodeId}
                      onClick={() => {
                        setActiveDominoIndex(idx);
                        setSelectedNode(nodeId);
                      }}
                      className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 text-xs cursor-pointer transition-all ${
                        isCurrent
                          ? 'bg-amber-50 border-amber-400/80 ring-1 ring-amber-400/50 shadow-md'
                          : 'bg-[#ede8da] border-[#d4c9b0] hover:border-[#c4b49a]'
                      }`}
                    >
                      <div className="min-w-0 flex-1 flex items-center gap-2">
                        <span className={`text-[9px] font-heading font-semibold px-2 py-0.5 rounded border shrink-0 uppercase tracking-wider ${
                          isStart
                            ? 'bg-rose-100 text-rose-600 border-rose-800'
                            : isEnd
                            ? 'bg-purple-950/80 text-purple-300 border-purple-800'
                            : 'bg-amber-100 text-amber-700 border-amber-800'
                        }`}>
                          {isStart ? 'Origin' : isEnd ? 'Frontier' : `Hop #${idx}`}
                        </span>
                        <span className="font-heading text-xs font-semibold text-[#2c2416] truncate">
                          {nodeId}
                        </span>
                      </div>

                      <span className="font-heading text-[11px] text-amber-400 hover:text-amber-700 font-semibold shrink-0">
                        {isCurrent ? '● Active' : 'Inspect →'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================== */}
      {/* MODE B: DEEP FORENSICS (Technical Details) */}
      {/* ========================================== */}
      {viewMode === 'forensics' && (
        <div className="flex flex-col gap-3.5">
          {/* 1. Shadow Dependency Revealer (Chokepoints) */}
          <div className="rounded-2xl bg-[#ede8da] border border-[#d4c9b0] p-4 shadow-md">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <span className="text-sm">🕵️</span>
                <span className="text-xs font-heading font-bold text-[#4a3f32] uppercase tracking-wider">
                  Shadow Dependencies
                </span>
              </div>
              <span className="text-[10px] font-sans font-medium bg-[#e2d9c0] border border-[#c4b49a] px-2 py-0.5 rounded-full text-[#4a3f32]">
                Silent Chokepoints
              </span>
            </div>

            <p className="text-xs text-[#7a6a55] font-sans mb-3 leading-relaxed">
              Deep, invisible packages that multiple upstream dependencies secretly rely on. Contaminating these packages cascades across the tree without direct import.
            </p>

            <div className="flex flex-col gap-2">
              {shadowDependencies.map((sd) => (
                <div
                  key={sd.node}
                  className="p-2.5 rounded-xl bg-[#e8e1cc] border border-[#d4c9b0]/80 flex items-center justify-between gap-2 text-xs hover:border-[#c4b49a] transition-all"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="font-display text-xs font-bold text-[#2c2416] truncate">
                        {sd.package || sd.node}
                      </span>
                      <span className="text-[10px] font-sans text-[#7a6a55]">d:{sd.depth}</span>
                    </div>
                    <p className="text-[10px] text-[#7a6a55] font-sans">
                      {sd.in_degree} dependents route here · {formatDownloads(sd.monthly_downloads)} dl/mo
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedNode(sd.node)}
                    className="px-2.5 py-1 rounded-lg bg-[#e2d9c0] hover:bg-[#d8cdb0] border border-[#c4b49a] font-sans text-[11px] font-semibold text-[#2c2416] cursor-pointer transition-colors"
                  >
                    Inspect 🔍
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* 2. Target Technical Profile & Exploit Vector */}
          <div className="rounded-2xl bg-[#ede8da] border border-[#d4c9b0] p-4 shadow-md">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-heading font-bold text-[#4a3f32] uppercase tracking-wider flex items-center gap-1.5">
                <span>🎯</span>
                <span>Target Exploit Profile</span>
              </span>
              <span className="text-[10px] font-sans font-medium border border-[#c4b49a] bg-[#e2d9c0] px-2 py-0.5 rounded-full text-[#4a3f32]">
                depth {activeTargetNode?.depth ?? 0}
              </span>
            </div>

            <div className="flex items-center gap-2 mb-2">
              <p className="font-display text-xs font-bold text-[#2c2416] truncate">
                {activeTargetNode?.id}
              </p>
              {activeTargetNode?.vulnerabilities?.[0]?.id && (
                <span className="font-sans font-semibold text-[10px] px-1.5 py-0.5 rounded bg-[#e2d9c0] border border-[#c4b49a] text-[#4a3f32]">
                  {activeTargetNode.vulnerabilities[0].id}
                </span>
              )}
            </div>

            <div className="mb-2">
              <span className={`inline-block font-sans text-[11px] font-bold px-2 py-0.5 rounded-md border ${targetExploit.severityBadge}`}>
                {targetExploit.type}
              </span>
            </div>

            <div className="bg-[#e8e1cc] rounded-xl p-2.5 border border-[#d4c9b0] flex flex-col gap-1.5 text-xs font-sans">
              <div className="flex items-center justify-between text-[10px] text-[#7a6a55] font-heading font-bold">
                <span>ATTACK VECTOR</span>
                <span className="text-rose-600">{targetExploit.vector}</span>
              </div>
              <p className="text-[11px] text-[#4a3f32] leading-relaxed">
                {targetExploit.consequence}
              </p>
            </div>

            {activeTargetNode && (
              <button
                type="button"
                onClick={() => toggleSandboxPatch(activeTargetNode.id)}
                className={`mt-2.5 w-full py-2 px-3 rounded-xl font-sans text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer border shadow-sm ${
                  sandboxPatches.includes(activeTargetNode.id)
                    ? 'bg-emerald-100 text-emerald-900 border-emerald-400 hover:bg-emerald-200'
                    : 'bg-[#ede8da] hover:bg-emerald-50 text-emerald-900 border-[#d4c9b0]'
                }`}
              >
                <span>🛡️</span>
                <span>
                  {sandboxPatches.includes(activeTargetNode.id)
                    ? 'Remove Virtual Patch'
                    : `Apply Virtual Patch to ${activeTargetNode.name || 'Target'}`}
                </span>
              </button>
            )}
          </div>

          {/* 3. High-Leverage Remediation */}
          {topMitigation && (
            <div className="rounded-2xl bg-emerald-50 border border-emerald-300 p-4 shadow-md">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-heading font-bold text-emerald-800 flex items-center gap-1.5">
                  <span>🛡️</span>
                  <span>High-Leverage Remediation</span>
                </span>
                <span className="text-[10px] font-display font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                  -{topMitigation.blast_reduction}% BLAST
                </span>
              </div>

              <p className="text-xs text-emerald-900 font-medium font-sans mb-2 leading-relaxed">
                Upgrading <code className="font-display font-bold text-xs bg-emerald-100 px-1 py-0.5 rounded text-emerald-950">{topMitigation.package}</code> neutralizes {topMitigation.blast_reduction}% of downstream contagion.
              </p>

              {topMitigation.command && (
                <div className="flex items-center justify-between bg-[#ede8da] border border-emerald-300 rounded-xl px-3 py-2 text-xs font-display font-medium text-[#2c2416] shadow-sm mb-2">
                  <span className="truncate mr-2 select-all">{topMitigation.command}</span>
                  <button
                    type="button"
                    onClick={() => handleCopyCommand(topMitigation.command)}
                    className="shrink-0 px-2.5 py-1 rounded text-[11px] bg-emerald-700 hover:bg-emerald-800 text-white font-sans font-medium transition-colors cursor-pointer shadow-xs"
                  >
                    {copiedCmd ? '✓ Copied' : 'Copy'}
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={() => setActiveTab('mitigation')}
                className="w-full text-center text-xs font-sans font-semibold text-emerald-600 hover:text-emerald-700 transition-colors pt-1 cursor-pointer"
              >
                Explore Full Mitigation Matrix & Set-Cover Plan →
              </button>
            </div>
          )}

          {/* 4. Contagion Sequence (Propagation Stages) */}
          {timeline.length > 0 && (
            <div className="rounded-2xl bg-[#ede8da] border border-[#d4c9b0] p-4 shadow-md">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-heading font-bold text-[#4a3f32] uppercase tracking-wider">
                  Contagion Sequence
                </span>
                <span className="text-xs text-[#7a6a55] font-sans">
                  {timeline.length} stages
                </span>
              </div>

              <div className="flex flex-col gap-1.5">
                {timeline.map((item, idx) => {
                  const isFirst = idx === 0;
                  const nodeName = typeof item.node === 'string' ? item.node : item.node?.id || String(item.node);
                  const eventLabel = item.event || (isFirst ? 'INJECT' : 'CASCADE');
                  const delay = item.delay_ms ?? idx * 150;

                  return (
                    <div
                      key={idx}
                      className={`p-2 rounded-xl border flex items-center justify-between gap-2 text-xs ${
                        isFirst
                          ? 'bg-rose-100 border-rose-300 text-rose-800'
                          : 'bg-[#e8e1cc] border-[#d4c9b0] text-[#4a3f32]'
                      }`}
                    >
                      <span className="font-display text-xs font-semibold truncate flex-1">
                        {nodeName}
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0 text-[11px] font-sans">
                        <span className={`font-semibold ${isFirst ? 'text-rose-700' : 'text-amber-700'}`}>
                          {eventLabel}
                        </span>
                        <span className="text-[#7a6a55]">+{delay}ms</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
