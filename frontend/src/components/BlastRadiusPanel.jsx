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
      className="text-5xl font-normal text-text tracking-tight tabular-nums font-serif"
    >
      0
    </span>
  );
}

const SCORE_LABELS = [
  { min: 75, label: 'Critical Blast', color: 'text-rose-700', bg: 'bg-rose-50', border: 'border-rose-200', dot: 'bg-rose-600' },
  { min: 50, label: 'High Impact',    color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200', dot: 'bg-amber-600' },
  { min: 25, label: 'Moderate Risk',  color: 'text-stone-700', bg: 'bg-stone-50', border: 'border-stone-200', dot: 'bg-stone-600' },
  { min: 0,  label: 'Contained',      color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', dot: 'bg-emerald-600' },
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
      <div className="h-full flex flex-col items-center justify-center p-8 text-center select-none">
        <div className="w-12 h-12 rounded-full bg-surface2 border border-border flex items-center justify-center text-muted mb-4">
          <svg className="w-5 h-5 text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
          </svg>
        </div>
        <h4 className="font-serif font-normal text-lg text-text mb-1">
          Awaiting Simulation
        </h4>
        <p className="text-xs text-muted max-w-xs font-sans leading-relaxed">
          Select any package node on the canvas and trigger <span className="font-medium text-text">&ldquo;Inject Compromise&rdquo;</span> to map the blast radius.
        </p>
      </div>
    );
  }

  const label = getScoreLabel(blastData.blast_score);
  const score = blastData.blast_score;
  const timeline = (blastData.propagation_order || []).slice(0, 8);

  return (
    <div className="flex flex-col gap-4 p-5">

      {/* Top Header Label */}
      <div className="flex items-center justify-between pb-1 border-b border-border select-none">
        <span className="font-sans text-xs font-semibold text-muted tracking-wider uppercase">
          Blast Radius Assessment
        </span>
        <span className="inline-flex items-center gap-1.5 text-xs text-rose-600 font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse" />
          Threat Active
        </span>
      </div>

      {/* Score Hero Card */}
      <div className="rounded-2xl bg-surface2 border border-border p-4 relative overflow-hidden">
        <div className="flex items-end justify-between mb-3">
          <div>
            <div className="flex items-baseline gap-1.5">
              <ScoreCounter value={score} />
              <span className="text-sm font-sans text-muted">/ 100</span>
            </div>
            <p className="text-xs text-muted font-sans mt-0.5">
              Cumulative Threat Index
            </p>
          </div>

          {/* Threat severity pill */}
          <div className={`px-2.5 py-1 rounded-full border flex items-center gap-1.5 ${label.bg} ${label.border}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${label.dot}`} />
            <span className={`text-xs font-medium font-sans ${label.color}`}>
              {label.label}
            </span>
          </div>
        </div>

        {/* Delicate Progress Bar */}
        <div className="w-full h-1.5 bg-border/60 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-amber-400 via-rose-500 to-rose-600 rounded-full transition-all duration-1000"
            style={{ width: `${score}%` }}
          />
        </div>
      </div>

      {/* 2×2 Structured Impact Metric Cards */}
      <div className="grid grid-cols-2 gap-2.5 select-none">
        {/* Metric 1: Direct Hits */}
        <div className="rounded-xl bg-white border border-border p-3 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between text-muted mb-1 text-xs">
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
          <div className="flex items-center justify-between text-amber-600 mb-1 text-xs">
            <span>Transitive</span>
            <span>⚡</span>
          </div>
          <div>
            <span className="font-serif text-2xl font-normal text-amber-700">
              {blastData.transitive_affected}
            </span>
            <span className="text-xs text-muted ml-1 font-sans">pkgs</span>
          </div>
          <span className="text-[11px] text-muted font-sans">Deep cascade</span>
        </div>

        {/* Metric 3: Downloads Exposed */}
        <div className="rounded-xl bg-white border border-border p-3 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between text-rose-600 mb-1 text-xs">
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

        {/* Metric 4: Max Depth */}
        <div className="rounded-xl bg-white border border-border p-3 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between text-emerald-600 mb-1 text-xs">
            <span>Max Depth</span>
            <span>📐</span>
          </div>
          <div>
            <span className="font-serif text-2xl font-normal text-text">
              Level 3
            </span>
          </div>
          <span className="text-[11px] text-muted font-sans">Propagation frontier</span>
        </div>
      </div>

      {/* Real-World Equivalence Card */}
      <div className="rounded-2xl bg-amber-50/50 border border-amber-200/60 p-4">
        <div className="flex items-center gap-1.5 mb-1.5 select-none text-amber-900 text-xs font-semibold">
          <span>💡</span>
          <span>Real-World Impact Equivalence</span>
        </div>
        <p className="text-xs text-dim leading-relaxed font-sans">
          &ldquo;{blastData.human_comparison}&rdquo;
        </p>
      </div>

      {/* Selected Node Profile Drawer */}
      {selectedNodeData && (
        <div className="rounded-xl bg-surface2 border border-border p-3.5">
          <div className="flex items-center justify-between mb-1.5 select-none">
            <span className="text-xs font-semibold text-text uppercase tracking-wider font-sans">
              Selected Target Profile
            </span>
            <span className="text-[10px] font-mono border border-border bg-white px-1.5 py-0.2 rounded-full text-muted">
              depth {selectedNodeData.depth ?? 0}
            </span>
          </div>

          <p className="font-mono text-xs font-bold text-text mb-1">
            {selectedNodeData.id}
          </p>

          <p className="text-xs text-muted leading-relaxed font-sans">
            {selectedNodeData.vulnerabilities?.[0]?.summary ?? 'Standard dependency participating in active topology propagation tree.'}
          </p>
        </div>
      )}

      {/* Propagation Timeline */}
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
