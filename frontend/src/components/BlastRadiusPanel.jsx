import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { useGraphStore } from '../store/graphStore';

function ScoreCounter({ value }) {
  const ref = useRef(null);

  useEffect(() => {
    const obj = { val: 0 };
    gsap.to(obj, {
      val: value,
      duration: 1.4,
      ease: 'power2.out',
      onUpdate: () => {
        if (ref.current) ref.current.textContent = Math.round(obj.val);
      },
    });
  }, [value]);

  return (
    <span
      ref={ref}
      className="text-5xl font-black text-gold tabular-nums"
      style={{ fontFamily: 'Montserrat, sans-serif' }}
    >
      0
    </span>
  );
}

const SCORE_LABELS = [
  { min: 75, label: 'CRITICAL BLAST', color: 'text-danger' },
  { min: 50, label: 'HIGH IMPACT',    color: 'text-warn'   },
  { min: 25, label: 'MODERATE RISK',  color: 'text-dim'    },
  { min: 0,  label: 'CONTAINED',      color: 'text-safe'   },
];

function getScoreLabel(score) {
  return SCORE_LABELS.find(l => score >= l.min) ?? SCORE_LABELS[3];
}

export default function BlastRadiusPanel() {
  const { blastData } = useGraphStore();

  if (!blastData) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <p className="font-mono text-muted text-xs text-center max-w-xs leading-relaxed">
          Click a node in the graph<br />then inject a compromise<br />to see the blast radius.
        </p>
      </div>
    );
  }

  const label = getScoreLabel(blastData.blast_score);

  return (
    <div className="flex flex-col">

      {/* Score */}
      <div className="px-5 py-5">
        <p className="font-mono text-muted text-xs tracking-widest mb-3">BLAST SCORE</p>
        <div className="flex items-end gap-2 mb-1">
          <ScoreCounter value={blastData.blast_score} />
          <span className="font-mono text-muted text-base mb-1">/100</span>
        </div>
        <span className={`font-mono text-xs tracking-widest ${label.color}`}>
          {label.label}
        </span>
        <p className="font-mono text-dim text-xs mt-2">
          {blastData.packages_affected} packages in blast zone
        </p>
      </div>

      <div className="h-px bg-border mx-5" />

      {/* Stats */}
      <div className="px-5 py-4 flex flex-col gap-2">
        {[
          { label: 'DIRECT DEPS HIT',  value: blastData.direct_affected              },
          { label: 'TRANSITIVE HIT',   value: blastData.transitive_affected           },
          { label: 'DOWNLOADS/MONTH',  value: blastData.monthly_downloads_affected    },
        ].map(row => (
          <div key={row.label} className="flex justify-between items-center">
            <span className="font-mono text-muted text-xs">{row.label}</span>
            <span className="font-mono text-text text-xs">{row.value}</span>
          </div>
        ))}
      </div>

      <div className="h-px bg-border mx-5" />

      {/* Human terms */}
      <div className="px-5 py-4">
        <p className="font-mono text-muted text-xs tracking-widest mb-2">IMPACT EQUIVALENT</p>
        <p
          className="text-sm text-text leading-relaxed"
          style={{ fontFamily: 'Sora, sans-serif', fontWeight: 300 }}
        >
          {blastData.human_comparison}
        </p>
      </div>
    </div>
  );
}
