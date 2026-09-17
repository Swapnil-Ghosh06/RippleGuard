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
      className="text-5xl font-normal text-text tracking-tight tabular-nums font-serif"
    >
      0
    </span>
  );
}

const SCORE_LABELS = [
  { min: 75, label: 'Critical Cascade', color: 'text-rose-700', bg: 'bg-rose-50', border: 'border-rose-200', dot: 'bg-rose-600' },
  { min: 50, label: 'High Impact',      color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200', dot: 'bg-amber-600' },
  { min: 25, label: 'Elevated Risk',    color: 'text-stone-700', bg: 'bg-stone-50', border: 'border-stone-200', dot: 'bg-stone-600' },
  { min: 0,  label: 'Contained',        color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', dot: 'bg-emerald-600' },
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
      severityBadge: 'bg-amber-100 text-amber-900 border-amber-300',
    };
  }
  if (text.includes('rce') || text.includes('jndi') || text.includes('remote shell') || text.includes('command injection')) {
    return {
      type: 'REMOTE CODE EXECUTION (RCE)',
      vector: 'UNAUTHENTICATED NETWORK PAYLOAD',
      consequence: 'Direct remote shell invocation allowing arbitrary command execution within host runtime environment.',
      severityBadge: 'bg-rose-100 text-rose-900 border-rose-300',
    };
  }
  if (text.includes('redos') || text.includes('regex') || text.includes('comparator')) {
    return {
      type: 'REGULAR EXPRESSION DOS (ReDoS)',
      vector: 'LOW-COMPLEXITY PAYLOAD',
      consequence: 'Catastrophic backtracking freezes Node.js event loop, terminating API availability across dependent microservices.',
      severityBadge: 'bg-amber-100 text-amber-900 border-amber-300',
    };
  }
  if (text.includes('wallet') || text.includes('trojan') || text.includes('exfiltration') || text.includes('backdoor')) {
    return {
      type: 'SUPPLY CHAIN TROJAN / KEY EXFILTRATION',
      vector: 'STEALTH RUNTIME TAMPERING',
      consequence: 'Silent harvesting of environment secrets, auth tokens, and cryptographic keys dispatched to C2 infrastructure.',
      severityBadge: 'bg-purple-100 text-purple-900 border-purple-300',
    };
  }
  return {
    type: 'TRANSITIVE DEPENDENCY TAINT',
    vector: 'DIRECT DEPENDENCY CASCADE',
    consequence: 'Tainted upstream package links downstream build pipelines and runtime memory pools to untrusted code execution.',
    severityBadge: 'bg-stone-100 text-stone-900 border-stone-300',
  };
}

export default function BlastRadiusPanel() {
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

  // Compute or extract Shadow Dependencies (Idea 3 from CREATIVE_IDEAS.md)
  const shadowDependencies = useMemo(() => {
    if (blastData?.shadow_dependencies && blastData.shadow_dependencies.length > 0) {
      return blastData.shadow_dependencies.slice(0, 3);
    }
    // Client-side computation for offline/mock demo
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

  // Critical Butterfly Domino Chain (Idea 2 from CREATIVE_IDEAS.md)
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

  // Selected node details (defaults to selectedNode or highestRiskNode or rootNode)
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

  // Handle triggering simulation directly from this panel
  const handleTriggerSim = async (nodeId) => {
    const target = nodeId || activeTargetNode?.id || rootNode?.id;
    if (!target || isSimulating) return;

    setSelectedNode(target);
    setIsSimulating(true);

    try {
      const res = await simulate(target);
      if (!res) {
        // Fallback for offline simulation
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

  // Top recommendation patch
  const topMitigation = blastData?.mitigations?.[0];

  // ==========================================
  // PRE-SIMULATION STATE (Awaiting Simulation)
  // ==========================================
  if (!blastData) {
    const totalVulnerable = rawNodes.filter(n => (n.vulnerabilities || []).length > 0).length;

    return (
      <div className="flex flex-col gap-4 p-5 select-none">
        {/* Header Badge */}
        <div className="flex items-center justify-between pb-1 border-b border-border">
          <span className="font-sans text-xs font-semibold text-muted tracking-wider uppercase">
            Ecosystem Reconnaissance
          </span>
          <span className="inline-flex items-center gap-1.5 text-xs text-amber-700 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse" />
            Vulnerability Audit
          </span>
        </div>

        {/* Tree Overview Summary */}
        <div className="rounded-2xl bg-surface2 border border-border p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-text uppercase tracking-wider font-sans">
              Analyzed Target
            </span>
            <span className="text-[10px] font-mono border border-border bg-white px-2 py-0.5 rounded-full text-muted">
              {rootNode?.ecosystem || 'npm'}
            </span>
          </div>

          <h3 className="font-mono text-base font-bold text-text truncate mb-1">
            {rootNode?.name || rootNode?.id || 'Dependency Graph'}
            {rootNode?.version && <span className="text-muted font-normal text-xs ml-1">@{rootNode.version}</span>}
          </h3>

          <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-border/60 text-center">
            <div>
              <p className="font-serif text-xl text-text font-normal">{rawNodes.length}</p>
              <p className="text-[10px] text-muted font-sans">Packages</p>
            </div>
            <div>
              <p className="font-serif text-xl text-text font-normal">{rawEdges.length}</p>
              <p className="text-[10px] text-muted font-sans">Linkages</p>
            </div>
            <div>
              <p className={`font-serif text-xl font-normal ${totalVulnerable > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                {totalVulnerable}
              </p>
              <p className="text-[10px] text-muted font-sans">Known CVEs</p>
            </div>
          </div>
        </div>

        {/* Threat Origin Candidate */}
        {highestRiskNode && (
          <div className="rounded-2xl bg-rose-50/50 border border-rose-200/70 p-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-rose-900 font-sans flex items-center gap-1.5">
                <span>⚠️</span>
                <span>Critical Contagion Origin</span>
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold border border-rose-200">
                {highestRiskNode.vulnerabilities?.[0]?.severity || 'HIGH RISK'}
              </span>
            </div>

            <p className="font-mono text-xs font-bold text-text mb-1">
              {highestRiskNode.id}
            </p>

            <p className="text-xs text-dim font-sans leading-relaxed mb-3">
              {highestRiskNode.vulnerabilities?.[0]?.summary || 'Critical entrypoint package with verified exploit vector.'}
            </p>

            <button
              onClick={() => handleTriggerSim(highestRiskNode.id)}
              disabled={isSimulating}
              className="w-full py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-[0.99] disabled:opacity-50 text-white font-sans text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer shadow-sm transition-all"
            >
              <span>⚡</span>
              <span>{isSimulating ? 'Simulating Cascade…' : `Simulate Breach on ${highestRiskNode.name || 'Target'}`}</span>
            </button>
          </div>
        )}

        {/* Selected Target Profile Preview if user clicked canvas */}
        {selectedNode && selectedNode !== highestRiskNode?.id && (
          <div className="rounded-xl bg-white border border-border p-3.5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-text font-sans">Canvas Selected Node</span>
              <span className="text-[10px] font-mono text-muted">depth {activeTargetNode?.depth ?? 0}</span>
            </div>
            <p className="font-mono text-xs font-bold text-text mb-1">{selectedNode}</p>
            <button
              onClick={() => handleTriggerSim(selectedNode)}
              disabled={isSimulating}
              className="mt-2 w-full py-2 rounded-lg bg-surface3 hover:bg-border text-text font-sans text-xs font-medium transition-colors"
            >
              ⚡ Model Contagion from this Node
            </button>
          </div>
        )}

        <p className="text-center text-[11px] text-muted font-sans mt-2 leading-relaxed">
          Click any node card on the canvas to inspect dependencies or model breach propagation.
        </p>
      </div>
    );
  }

  // ==========================================
  // POST-SIMULATION STATE (Threat Active)
  // ==========================================
  const effectiveScore = sandboxStats.isEffective ? sandboxStats.score : blastData.blast_score;
  const label = getScoreLabel(effectiveScore);
  const score = effectiveScore;
  const timeline = (blastData.propagation_order || []).slice(0, 8);
  const maxDepth = Math.max(...rawNodes.map(n => n.depth ?? 0), 1);

  return (
    <div className="flex flex-col gap-4 p-5">

      {/* Top Header Status */}
      <div className="flex items-center justify-between pb-1 border-b border-border select-none">
        <span className="font-sans text-xs font-semibold text-muted tracking-wider uppercase">
          Blast Radius Assessment
        </span>
        <span className="inline-flex items-center gap-1.5 text-xs text-rose-600 font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse" />
          Threat Active ({score}/100)
        </span>
      </div>

      {/* 1. Score Hero Card */}
      <div className="rounded-2xl bg-surface2 border border-border p-4 relative overflow-hidden">
        <div className="flex items-end justify-between mb-3">
          <div>
            <div className="flex items-baseline gap-1.5 flex-wrap">
              <ScoreCounter value={score} />
              <span className="text-sm font-sans text-muted">/ 100</span>
              {sandboxStats.isEffective && (
                <span className="text-[11px] font-bold font-sans text-emerald-900 bg-emerald-100 border border-emerald-300 rounded-full px-2 py-0.5 ml-1 animate-pulse">
                  −{sandboxStats.scoreDelta} pts ({sandboxStats.pctReduction}% cut)
                </span>
              )}
            </div>
            <p className="text-xs text-muted font-sans mt-0.5">
              Cumulative Threat Index {sandboxStats.isEffective ? '(Sandbox Mode)' : ''}
            </p>
          </div>

          {/* Threat severity pill */}
          <div className={`px-2.5 py-1 rounded-full border flex items-center gap-1.5 ${label.bg} ${label.border}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${label.dot}`} />
            <span className={`text-xs font-semibold font-sans ${label.color}`}>
              {label.label}
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-2 bg-border/60 rounded-full overflow-hidden mb-2">
          <div
            className="h-full bg-gradient-to-r from-amber-400 via-rose-500 to-rose-600 rounded-full transition-all duration-1000"
            style={{ width: `${Math.min(100, Math.max(8, score))}%` }}
          />
        </div>

        <p className="text-[11px] text-muted font-sans leading-relaxed">
          Aggregated risk factor across dependency reach, exploit severity, and active monthly consumer footprint.
        </p>
      </div>

      {/* 2. 2×2 Structured Impact Telemetry Matrix */}
      <div className="grid grid-cols-2 gap-2.5 select-none">
        {/* Metric 1: Direct Hits */}
        <div className="rounded-xl bg-white border border-border p-3 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between text-muted mb-1 text-xs font-sans">
            <span>Direct Hits</span>
            <span>🎯</span>
          </div>
          <div>
            <span className="font-serif text-2xl font-normal text-text">
              {blastData.direct_affected}
            </span>
            <span className="text-xs text-muted ml-1 font-sans">pkgs</span>
          </div>
          <span className="text-[11px] text-muted font-sans">Tier 1 dependencies</span>
        </div>

        {/* Metric 2: Transitive Cascade */}
        <div className="rounded-xl bg-white border border-border p-3 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between text-amber-600 mb-1 text-xs font-sans">
            <span>Transitive</span>
            <span>⚡</span>
          </div>
          <div>
            <span className="font-serif text-2xl font-normal text-amber-700">
              {blastData.transitive_affected}
            </span>
            <span className="text-xs text-muted ml-1 font-sans">pkgs</span>
          </div>
          <span className="text-[11px] text-muted font-sans">Deep cascade infection</span>
        </div>

        {/* Metric 3: Downloads Exposed */}
        <div className="rounded-xl bg-white border border-border p-3 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between text-rose-600 mb-1 text-xs font-sans">
            <span>Downloads</span>
            <span>⚠️</span>
          </div>
          <div>
            <span className="font-serif text-2xl font-normal text-rose-700">
              {blastData.monthly_downloads_affected}
            </span>
          </div>
          <span className="text-[11px] text-muted font-sans">Monthly exposure</span>
        </div>

        {/* Metric 4: Max Depth Frontier */}
        <div className="rounded-xl bg-white border border-border p-3 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between text-emerald-600 mb-1 text-xs font-sans">
            <span>Max Depth</span>
            <span>📐</span>
          </div>
          <div>
            <span className="font-serif text-2xl font-normal text-text">
              Level {maxDepth}
            </span>
          </div>
          <span className="text-[11px] text-muted font-sans">Propagation frontier</span>
        </div>
      </div>

      {/* 3. Interactive What-If Dependency Sandbox Card */}
      <div className="rounded-2xl bg-emerald-50/70 border border-emerald-300 p-4 shadow-xs">
        <div className="flex items-center justify-between mb-2 select-none">
          <div className="flex items-center gap-2">
            <span className="text-base animate-pulse">🧪</span>
            <div>
              <h4 className="font-sans text-xs font-bold text-emerald-950 uppercase tracking-wider">
                Interactive "What-If" Sandbox
              </h4>
              <p className="text-[10px] text-emerald-800 font-sans">
                Virtual Patch & Surgical Containment
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {sandboxPatches.length > 0 && (
              <button
                type="button"
                onClick={clearSandboxPatches}
                className="text-[10px] font-mono text-emerald-800 hover:text-emerald-950 underline cursor-pointer"
              >
                Reset
              </button>
            )}
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold border border-emerald-300">
              {sandboxPatches.length} Patched
            </span>
          </div>
        </div>

        <p className="text-[11px] text-emerald-950/90 font-sans mb-3 leading-relaxed">
          Experiment with patches on any dependency to test risk reduction before deployment. Watch the cascade contain live.
        </p>

        {/* Quick Scenario Buttons */}
        <div className="flex items-center gap-2 mb-2.5">
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
            className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-sans text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm cursor-pointer transition-all"
          >
            <span>🛡️</span>
            <span>Apply Optimal Patch Set</span>
          </button>
        </div>

        {/* Active Patches List */}
        {sandboxPatches.length > 0 ? (
          <div className="flex flex-col gap-1.5 pt-2 border-t border-emerald-200/80">
            <span className="text-[10px] font-sans font-bold text-emerald-900 uppercase tracking-wider">
              Active Virtual Patches:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {sandboxPatches.map((pkgId) => (
                <span
                  key={pkgId}
                  className="inline-flex items-center gap-1 bg-white border border-emerald-300 text-emerald-900 text-[11px] font-mono font-medium px-2 py-1 rounded-lg shadow-2xs"
                >
                  <span>🛡️</span>
                  <span className="truncate max-w-[170px]">{pkgId}</span>
                  <button
                    type="button"
                    onClick={() => toggleSandboxPatch(pkgId)}
                    className="text-emerald-700 hover:text-emerald-950 font-bold ml-1 cursor-pointer"
                    title="Remove patch"
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>

            <div className="mt-1 p-2 rounded-xl bg-emerald-100/70 border border-emerald-300 text-xs font-sans text-emerald-950 flex items-center justify-between">
              <span>Risk Reduction:</span>
              <span className="font-mono font-bold text-emerald-900">
                −{sandboxStats.scoreDelta} pts ({sandboxStats.pctReduction}% eliminated)
              </span>
            </div>
          </div>
        ) : (
          <p className="text-[10px] text-emerald-800/80 font-sans italic pt-1 border-t border-emerald-200/60">
            Tip: Click "Apply Virtual Patch" on any node in the canvas or click "Apply Optimal Patch Set" above.
          </p>
        )}
      </div>

      {/* 4. Real-World Equivalence Card */}
      <div className="rounded-2xl bg-amber-50/50 border border-amber-200/70 p-4">
        <div className="flex items-center gap-1.5 mb-1.5 select-none text-amber-900 text-xs font-semibold">
          <span>💡</span>
          <span>Real-World Impact Equivalence</span>
        </div>
        <p className="text-xs text-dim leading-relaxed font-sans">
          &ldquo;{blastData.human_comparison || 'Exposure exceeds millions of downstream consumer endpoints monthly.'}&rdquo;
        </p>
      </div>

      {/* 4. The Butterfly Trace (Critical Domino Path Hero) */}
      {criticalChain.length > 1 && (
        <div className="rounded-2xl bg-amber-50/70 border border-amber-300 p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2 select-none">
            <div className="flex items-center gap-2">
              <span className="text-base animate-pulse">🦋</span>
              <div>
                <h4 className="font-sans text-xs font-bold text-amber-950 uppercase tracking-wider">
                  The Butterfly Trace
                </h4>
                <p className="text-[10px] text-amber-800 font-sans">
                  Critical Domino Chain ({criticalChain.length} hops)
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
              className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-sans text-xs font-semibold flex items-center gap-1.5 shadow-sm cursor-pointer transition-all"
            >
              <span>{isDominoPlaying ? '⏸' : '▶'}</span>
              <span>{isDominoPlaying ? 'Pause Cascade' : 'Play Domino Trace'}</span>
            </button>
          </div>

          <p className="text-[11px] text-amber-900/90 font-sans mb-3 leading-relaxed">
            The single deadliest transmission path through your dependency tree. A micro-change at the origin ripples all the way to production leaves.
          </p>

          {/* Sequential Domino Chain Hops */}
          <div className="flex flex-col gap-2">
            {criticalChain.map((nodeId, idx) => {
              const isStart = idx === 0;
              const isEnd = idx === criticalChain.length - 1;
              const isCurrent = activeDominoIndex === idx;
              const matchingNode = rawNodes.find(n => n.id === nodeId);
              const downloads = matchingNode?.monthly_downloads;

              return (
                <div
                  key={nodeId}
                  onClick={() => {
                    setActiveDominoIndex(idx);
                    setSelectedNode(nodeId);
                  }}
                  className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 text-xs cursor-pointer transition-all ${
                    isCurrent
                      ? 'bg-amber-100/95 border-amber-500 ring-2 ring-amber-400/60 shadow-xs scale-[1.01]'
                      : 'bg-white border-amber-200/80 hover:border-amber-400'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className={`text-[10px] font-sans font-bold px-1.5 py-0.2 rounded border ${
                        isStart
                          ? 'bg-rose-100 text-rose-800 border-rose-200'
                          : isEnd
                          ? 'bg-purple-100 text-purple-800 border-purple-200'
                          : 'bg-amber-100 text-amber-900 border-amber-300'
                      }`}>
                        {isStart ? 'Origin' : isEnd ? 'Frontier' : `Hop #${idx}`}
                      </span>
                      <span className="font-mono text-xs font-bold text-text truncate">
                        {nodeId}
                      </span>
                    </div>
                    <p className="text-[10px] text-muted font-sans">
                      {isStart
                        ? 'Exploit entrypoint package'
                        : isEnd
                        ? 'Downstream consumer exposed'
                        : `Transitive parent linkage`}
                      {downloads ? ` · ${formatDownloads(downloads)} dl/mo` : ''}
                    </p>
                  </div>

                  <div className="shrink-0 flex items-center gap-1">
                    <span className="font-mono text-[10px] text-amber-800 font-semibold">
                      {isCurrent ? '● Active' : 'Select'}
                    </span>
                    <span className="text-amber-600 text-xs">→</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Domino Breaker Recommendation */}
          {criticalChain.length >= 2 && (
            <div className="mt-3 pt-3 border-t border-amber-200/80 flex items-start gap-2 text-xs font-sans text-amber-950">
              <span className="text-sm shrink-0 mt-0.5">✂️</span>
              <div>
                <p className="font-semibold mb-0.5">Domino Breaker Opportunity</p>
                <p className="text-[11px] text-amber-900 leading-relaxed">
                  Pinning or upgrading the link between <code className="font-mono font-bold bg-amber-100 px-1 py-0.5 rounded">{criticalChain[0].split('@')[0]}</code> and <code className="font-mono font-bold bg-amber-100 px-1 py-0.5 rounded">{criticalChain[1].split('@')[0]}</code> breaks this entire cascade before it reaches production leaves.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 5. Shadow Dependency Revealer (Chokepoint Analyzer) */}
      <div className="rounded-2xl bg-surface2 border border-border p-4">
        <div className="flex items-center justify-between mb-2 select-none">
          <div className="flex items-center gap-1.5">
            <span className="text-sm">🕵️</span>
            <span className="text-xs font-semibold text-text uppercase tracking-wider font-sans">
              Shadow Dependencies
            </span>
          </div>
          <span className="text-[10px] font-mono bg-white border border-border px-2 py-0.5 rounded-full text-muted">
            Silent Chokepoints
          </span>
        </div>

        <p className="text-[11px] text-muted font-sans mb-3 leading-relaxed">
          Deep, invisible packages that multiple upstream dependencies secretly rely on. A breach here contaminates the tree without direct import.
        </p>

        <div className="flex flex-col gap-2">
          {shadowDependencies.map((sd) => (
            <div
              key={sd.node}
              className="p-2.5 rounded-xl bg-white border border-border flex items-center justify-between gap-2 text-xs hover:border-borderGlow transition-all"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="font-mono text-xs font-bold text-text truncate">
                    {sd.package || sd.node}
                  </span>
                  <span className="text-[10px] font-mono text-muted">d:{sd.depth}</span>
                </div>
                <p className="text-[10px] text-muted font-sans">
                  {sd.in_degree} dependents route here · {formatDownloads(sd.monthly_downloads)} dl/mo
                </p>
              </div>

              <div className="shrink-0 flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setSelectedNode(sd.node)}
                  className="px-2 py-1 rounded-lg bg-surface2 hover:bg-surface3 border border-border font-mono text-[10px] font-medium text-text cursor-pointer transition-colors"
                >
                  Inspect 🔍
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 5. Selected Target Technical Profile & Exploit Vector Drawer */}
      <div className="rounded-2xl bg-white border border-border p-4 shadow-xs">
        <div className="flex items-center justify-between mb-2 select-none">
          <span className="text-xs font-semibold text-text uppercase tracking-wider font-sans flex items-center gap-1.5">
            <span>🎯</span>
            <span>Target Exploit Profile</span>
          </span>
          <span className="text-[10px] font-mono border border-border bg-surface2 px-2 py-0.5 rounded-full text-muted">
            depth {activeTargetNode?.depth ?? 0}
          </span>
        </div>

        <div className="flex items-center gap-2 mb-2">
          <p className="font-mono text-xs font-bold text-text truncate">
            {activeTargetNode?.id}
          </p>
          {activeTargetNode?.vulnerabilities?.[0]?.id && (
            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-surface3 border border-border text-dim">
              {activeTargetNode.vulnerabilities[0].id}
            </span>
          )}
        </div>

        {/* Exploit Classification Pill */}
        <div className="mb-2">
          <span className={`inline-block font-mono text-[10px] font-bold px-2 py-0.5 rounded-md border ${targetExploit.severityBadge}`}>
            {targetExploit.type}
          </span>
        </div>

        {/* Exploit Vector & Consequence */}
        <div className="bg-surface2 rounded-xl p-2.5 border border-border/80 flex flex-col gap-1.5 text-xs font-sans">
          <div className="flex items-center justify-between text-[10px] text-muted font-mono">
            <span>ATTACK VECTOR</span>
            <span className="text-rose-700 font-bold">{targetExploit.vector}</span>
          </div>
          <p className="text-[11px] text-dim leading-relaxed">
            {targetExploit.consequence}
          </p>
        </div>

        {/* Sandbox Virtual Patch Button on Target */}
        {activeTargetNode && (
          <button
            type="button"
            onClick={() => toggleSandboxPatch(activeTargetNode.id)}
            className={`mt-2.5 w-full py-2 px-3 rounded-xl font-sans text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer border shadow-2xs ${
              sandboxPatches.includes(activeTargetNode.id)
                ? 'bg-emerald-100 text-emerald-900 border-emerald-400 hover:bg-emerald-200'
                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-950 border-emerald-300'
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

      {/* 6. High-Leverage Remediation & Rapid Patch Action */}
      {topMitigation && (
        <div className="rounded-2xl bg-emerald-50/60 border border-emerald-200 p-4">
          <div className="flex items-center justify-between mb-1.5 select-none">
            <span className="text-xs font-semibold text-emerald-900 font-sans flex items-center gap-1.5">
              <span>🛡️</span>
              <span>High-Leverage Remediation</span>
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold border border-emerald-300">
              -{topMitigation.blast_reduction}% BLAST
            </span>
          </div>

          <p className="text-xs text-emerald-950 font-medium font-sans mb-2">
            Upgrading <code className="font-mono font-bold text-xs bg-emerald-100/80 px-1 py-0.5 rounded">{topMitigation.package}</code> eliminates {topMitigation.blast_reduction}% of downstream contagion.
          </p>

          {/* Copyable CLI command */}
          {topMitigation.command && (
            <div className="flex items-center justify-between bg-white border border-emerald-300 rounded-xl px-3 py-2 text-xs font-mono text-text shadow-2xs mb-2">
              <span className="truncate mr-2 select-all">{topMitigation.command}</span>
              <button
                type="button"
                onClick={() => handleCopyCommand(topMitigation.command)}
                className="shrink-0 px-2 py-0.5 rounded text-[11px] bg-emerald-100 hover:bg-emerald-200 text-emerald-900 font-sans font-medium transition-colors cursor-pointer"
              >
                {copiedCmd ? '✓ Copied' : 'Copy'}
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => setActiveTab('mitigation')}
            className="w-full text-center text-xs font-sans font-semibold text-emerald-800 hover:text-emerald-950 transition-colors pt-1 cursor-pointer"
          >
            Explore Full Mitigation Matrix & Set-Cover Plan →
          </button>
        </div>
      )}

      {/* 7. Contagion Sequence (Propagation Stages) */}
      {timeline.length > 0 && (
        <div className="flex flex-col gap-2 pt-1">
          <div className="flex items-center justify-between border-t border-border pt-3 select-none">
            <span className="text-xs font-semibold text-muted uppercase tracking-wider font-sans">
              Contagion Sequence
            </span>
            <span className="text-xs text-muted font-sans">
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
                  className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 text-xs transition-colors ${
                    isFirst
                      ? 'bg-rose-50/60 border-rose-200'
                      : 'bg-white border-border'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-xs font-medium text-text truncate">
                      {nodeName}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 text-[11px] font-sans">
                    <span className={`font-semibold ${isFirst ? 'text-rose-700' : 'text-amber-700'}`}>
                      {eventLabel}
                    </span>
                    <span className="text-muted">+{delay}ms</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
}
