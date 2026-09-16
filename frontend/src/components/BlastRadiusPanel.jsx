import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { useGraphStore } from '../store/graphStore';

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
      className="text-5xl font-black text-text tracking-tight tabular-nums"
      style={{ fontFamily: 'Montserrat, sans-serif' }}
    >
      0
    </span>
  );
}

const SCORE_LABELS = [
  { min: 75, label: 'CRITICAL BLAST', color: 'text-danger', bg: 'bg-danger/15', border: 'border-danger/40', dot: 'bg-danger' },
  { min: 50, label: 'HIGH IMPACT',    color: 'text-warn',   bg: 'bg-warn/15',   border: 'border-warn/40',   dot: 'bg-warn' },
  { min: 25, label: 'MODERATE RISK',  color: 'text-dim',    bg: 'bg-surface3',  border: 'border-border',    dot: 'bg-dim' },
  { min: 0,  label: 'CONTAINED',      color: 'text-safe',   bg: 'bg-safe/15',   border: 'border-safe/40',   dot: 'bg-safe' },
];

function getScoreLabel(score) {
  return SCORE_LABELS.find(l => score >= l.min) ?? SCORE_LABELS[3];
}

export default function BlastRadiusPanel() {
  const { blastData, selectedNode, graphData } = useGraphStore();

  const rawNodes = graphData?.nodes ?? graphData?.graph?.nodes ?? [];
  const selectedNodeData = rawNodes.find(n => n.id === selectedNode);

  if (!blastData) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 rounded-2xl bg-surface2 border border-border flex items-center justify-center text-muted mb-4 shadow-inner">
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
          </svg>
        </div>
        <h4 className="font-mono text-xs font-bold text-text uppercase tracking-widest mb-1">
          Awaiting Simulation
        </h4>
        <p className="font-sans text-xs text-muted max-w-xs leading-relaxed">
          Select any package node in the graph and click <strong className="text-accent">&quot;⚡ Inject Compromise&quot;</strong> to compute the cascading blast radius.
        </p>
      </div>
    );
  }

  const label = getScoreLabel(blastData.blast_score);
  const score = blastData.blast_score;

  return (
    <div className="flex flex-col gap-5 p-5">

      {/* Top Header Label */}
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] text-muted tracking-widest uppercase">
          BLAST RADIUS ASSESSMENT
        </span>
        <span className="inline-flex items-center gap-1.5 font-mono text-[10px] text-danger">
          <span className="w-1.5 h-1.5 rounded-full bg-danger animate-ping" />
          LIVE THREAT
        </span>
      </div>

      {/* Score Hero Card (Inspo 1 Lunor dashboard aesthetic) */}
      <div className="rounded-2xl bg-surface2 border border-border p-4 shadow-lg relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute -right-8 -top-8 w-28 h-28 bg-danger/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-end justify-between mb-3">
          <div>
            <div className="flex items-baseline gap-1.5">
              <ScoreCounter value={score} />
              <span className="font-mono text-muted text-sm">/ 100</span>
            </div>
            <p className="font-mono text-xs text-muted mt-0.5">
              Cumulative Threat Index
            </p>
          </div>

          {/* Threat severity pill */}
          <div className={`px-2.5 py-1 rounded-full border flex items-center gap-1.5 ${label.bg} ${label.border}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${label.dot} animate-pulse`} />
            <span className={`font-mono text-[10px] font-bold tracking-wider uppercase ${label.color}`}>
              {label.label}
            </span>
          </div>
        </div>

        {/* Linear Progress Bar */}
        <div className="w-full h-1.5 bg-surface3 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-warn via-danger to-red-600 rounded-full transition-all duration-1000"
            style={{ width: `${score}%` }}
          />
        </div>
      </div>

      {/* 2×2 Structured Impact Metric Cards (Inspo 1 Lunor style) */}
      <div className="grid grid-cols-2 gap-2.5">
        {/* Metric 1: Direct Hits */}
        <div className="rounded-xl bg-surface2 border border-border p-3 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between text-muted mb-2">
            <span className="font-mono text-[10px] tracking-wider uppercase">Direct Hits</span>
            <svg className="w-3.5 h-3.5 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="16" />
              <line x1="8" y1="12" x2="16" y2="12" />
            </svg>
          </div>
          <div>
            <span className="font-mono text-xl font-bold text-text">
              {blastData.direct_affected}
            </span>
            <span className="font-mono text-xs text-muted ml-1">packages</span>
          </div>
          <span className="font-mono text-[10px] text-muted mt-1">Tier 1 dependencies</span>
        </div>

        {/* Metric 2: Transitive Cascade */}
        <div className="rounded-xl bg-surface2 border border-border p-3 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between text-muted mb-2">
            <span className="font-mono text-[10px] tracking-wider uppercase">Transitive</span>
            <svg className="w-3.5 h-3.5 text-warn" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
          </div>
          <div>
            <span className="font-mono text-xl font-bold text-warn">
              {blastData.transitive_affected}
            </span>
            <span className="font-mono text-xs text-muted ml-1">packages</span>
          </div>
          <span className="font-mono text-[10px] text-muted mt-1">Deep tier cascade</span>
        </div>

        {/* Metric 3: Downloads Exposed */}
        <div className="rounded-xl bg-surface2 border border-border p-3 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between text-muted mb-2">
            <span className="font-mono text-[10px] tracking-wider uppercase">Downloads</span>
            <svg className="w-3.5 h-3.5 text-danger" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          </div>
          <div>
            <span className="font-mono text-xl font-bold text-danger">
              {blastData.monthly_downloads_affected}
            </span>
          </div>
          <span className="font-mono text-[10px] text-muted mt-1">Monthly exposure</span>
        </div>

        {/* Metric 4: Max Depth */}
        <div className="rounded-xl bg-surface2 border border-border p-3 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between text-muted mb-2">
            <span className="font-mono text-[10px] tracking-wider uppercase">Max Depth</span>
            <svg className="w-3.5 h-3.5 text-safe" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="12 2 2 7 12 12 22 7 12 2" />
              <polyline points="2 17 12 22 22 17" />
              <polyline points="2 12 12 17 22 12" />
            </svg>
          </div>
          <div>
            <span className="font-mono text-xl font-bold text-text">
              Level 3
            </span>
          </div>
          <span className="font-mono text-[10px] text-muted mt-1">Propagation frontier</span>
        </div>
      </div>

      {/* Real-World Equivalence Card (Inspo 1) */}
      <div className="rounded-2xl bg-surface2/60 border border-border p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-5 h-5 rounded-md bg-accent/10 border border-accent/30 flex items-center justify-center text-accent">
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <span className="font-mono text-[10px] font-bold text-text uppercase tracking-wider">
            Real-World Impact Equivalence
          </span>
        </div>
        <p
          className="text-xs text-dim leading-relaxed font-sans"
          style={{ fontFamily: 'Sora, sans-serif' }}
        >
          {blastData.human_comparison}
        </p>
      </div>

      {/* Selected Node Profile Drawer (Inspo 2 & 3) */}
      {selectedNodeData && (
        <div className="rounded-2xl bg-surface3/60 border border-borderGlow p-3.5">
          <div className="flex items-center justify-between mb-2">
            <span className="font-mono text-[10px] text-accent tracking-wider uppercase font-semibold">
              Selected Target Profile
            </span>
            <span className="font-mono text-[10px] text-muted">
              d:{selectedNodeData.depth ?? 0}
            </span>
          </div>

          <p className="font-mono text-xs font-bold text-text mb-1">
            {selectedNodeData.id}
          </p>

          <p className="text-[11px] text-dim leading-relaxed font-sans">
            {selectedNodeData.vulnerabilities?.[0]?.summary ?? 'Standard dependency participating in active topology propagation tree.'}
          </p>
        </div>
      )}

    </div>
  );
}
