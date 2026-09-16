import { memo } from 'react';
import { Handle, Position } from 'reactflow';

function formatDownloads(n) {
  if (!n) return null;
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M dl/mo';
  if (n >= 1_000)     return (n / 1_000).toFixed(0) + 'K dl/mo';
  return n + ' dl/mo';
}

const PackageNode = memo(({ data }) => {
  const {
    name,
    version,
    is_root,
    depth = 0,
    ecosystem = 'npm',
    vulnerabilities = [],
    monthly_downloads,
    blasted,
    selected,
  } = data;

  const topSev = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].find(s =>
    vulnerabilities.some(v => v.severity === s)
  );

  const mainCVE = vulnerabilities[0];

  // Subtle top border accent
  let rimColor = 'border-t-slate-500';
  let badgeClass = 'text-zinc-400 bg-zinc-800/60 border-zinc-700/60';
  let roleLabel = depth === 0 ? 'ROOT' : depth === 1 ? 'DIRECT' : `DEPTH ${depth}`;

  if (is_root || topSev === 'CRITICAL') {
    rimColor = 'border-t-red-500';
    badgeClass = 'text-red-400 bg-red-500/10 border-red-500/30';
  } else if (topSev === 'HIGH' || topSev === 'MEDIUM') {
    rimColor = 'border-t-amber-400';
    badgeClass = 'text-amber-400 bg-amber-400/10 border-amber-400/30';
  } else if (vulnerabilities.length === 0) {
    rimColor = 'border-t-emerald-400';
    badgeClass = 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30';
  }

  return (
    <div
      className={`relative rounded-xl p-3 min-w-[200px] max-w-[230px] transition-all duration-200 cursor-pointer select-none border-t-2 ${rimColor} ${
        blasted
          ? 'bg-red-950/20 border-x border-b border-red-500/80 shadow-[0_0_16px_rgba(239,68,68,0.25)]'
          : selected
          ? 'bg-surface2 border-x border-b border-accent shadow-[0_0_16px_rgba(56,189,248,0.2)]'
          : 'bg-[#141418] border-x border-b border-border hover:border-borderGlow shadow-lg'
      }`}
    >
      {/* Left target handle */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-2 !h-2 !bg-borderGlow !border !border-surface !-left-1"
      />

      {/* Header Row */}
      <div className="flex items-center justify-between gap-1.5 mb-1.5">
        <span className={`font-mono text-[9px] font-semibold tracking-wider uppercase px-1.5 py-0.5 rounded border ${badgeClass}`}>
          {roleLabel}
        </span>

        {blasted ? (
          <span className="font-mono text-[9px] font-bold text-red-400 uppercase tracking-wider">
            ⚡ TAINTED
          </span>
        ) : topSev ? (
          <span className="font-mono text-[9px] font-medium text-muted">
            {topSev}
          </span>
        ) : null}
      </div>

      {/* Package Name */}
      <div className="mb-1">
        <h4 className="font-mono text-xs font-bold text-text truncate">
          {name}
          <span className="text-muted font-normal text-[11px] ml-1">@{version}</span>
        </h4>
      </div>

      {/* Description / Summary */}
      <p className="text-[11px] text-muted line-clamp-2 leading-relaxed font-sans mb-2">
        {mainCVE?.summary
          ? mainCVE.summary
          : depth === 0
          ? 'Root target package'
          : `Dependency via direct linkage`}
      </p>

      {/* Bottom Metadata */}
      <div className="flex items-center justify-between pt-1.5 border-t border-border/60 font-mono text-[9px] text-muted">
        <span>{ecosystem}</span>
        {monthly_downloads && (
          <span>{formatDownloads(monthly_downloads)}</span>
        )}
      </div>

      {/* Right source handle */}
      <Handle
        type="source"
        position={Position.Right}
        className="!w-2 !h-2 !bg-borderGlow !border !border-surface !-right-1"
      />
    </div>
  );
});

PackageNode.displayName = 'PackageNode';

export default PackageNode;
