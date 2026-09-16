import { useState } from 'react';
import { useGraphStore } from '../store/graphStore';

export default function MitigationPanel() {
  const { blastData } = useGraphStore();
  const [copiedIndex, setCopiedIndex] = useState(null);

  if (!blastData || !blastData.mitigations?.length) {
    return (
      <div className="p-6 text-center">
        <p className="font-mono text-muted text-xs leading-relaxed">
          Recommended mitigation steps<br />will populate once simulation runs.
        </p>
      </div>
    );
  }

  const handleCopy = (cmd, idx) => {
    navigator.clipboard.writeText(cmd);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 1800);
  };

  return (
    <div className="flex flex-col gap-4 p-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] text-muted tracking-widest uppercase">
          PRIORITY MITIGATION ACTIONS
        </span>
        <span className="font-mono text-[10px] text-safe">
          {blastData.mitigations.length} RECOMMENDED
        </span>
      </div>

      {/* Mitigation Action Cards */}
      <div className="flex flex-col gap-3">
        {blastData.mitigations.map((item, i) => {
          const pct = item.blast_reduction;
          const barColor = pct >= 80 ? 'bg-danger' : pct >= 50 ? 'bg-warn' : 'bg-safe';
          const isCopied = copiedIndex === i;
          const patchCmd = item.command || `npm install ${item.package.split('@')[0]}@${item.fix_version}`;

          return (
            <div
              key={i}
              className="rounded-xl bg-surface2 border border-border p-3.5 flex flex-col gap-2.5 shadow-sm hover:border-borderGlow transition-colors"
            >
              {/* Top Row: Package Name & Reduction Pill */}
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-xs font-bold text-text truncate max-w-[65%]">
                  {item.package}
                </span>

                <span className="font-mono text-[11px] font-bold text-safe bg-safe/10 border border-safe/30 px-2 py-0.5 rounded-full shrink-0">
                  −{pct}% Blast
                </span>
              </div>

              {/* Progress Reduction Bar */}
              <div className="w-full h-1 bg-surface3 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${barColor} transition-all duration-700`}
                  style={{ width: `${pct}%` }}
                />
              </div>

              {/* Fix recommendation & patch command */}
              <div className="flex items-center justify-between gap-2 bg-surface border border-border/80 rounded-lg px-2.5 py-1.5 font-mono text-[11px]">
                <span className="text-dim truncate">{patchCmd}</span>
                <button
                  type="button"
                  onClick={() => handleCopy(patchCmd, i)}
                  className="text-[10px] text-accent hover:text-accentHover shrink-0 font-medium ml-2"
                >
                  {isCopied ? '✓ Copied' : 'Copy'}
                </button>
              </div>

              {/* Description */}
              {item.description && (
                <p className="text-[11px] text-dim leading-relaxed font-sans">
                  {item.description}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
