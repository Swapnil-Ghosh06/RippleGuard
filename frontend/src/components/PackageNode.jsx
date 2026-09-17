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

  // Minimalist clean card styling
  let cardStyle = 'bg-white border border-border hover:border-zinc-400 shadow-[0_2px_12px_-2px_rgba(0,0,0,0.04)]';

  if (blasted) {
    cardStyle = 'bg-rose-50/90 border-rose-300 shadow-[0_4px_20px_-2px_rgba(225,29,72,0.15)]';
  } else if (selected) {
    cardStyle = 'bg-white border-text ring-2 ring-black/10 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.08)]';
  } else if (topSev === 'CRITICAL') {
    cardStyle = 'bg-rose-50/40 border-rose-200/80 shadow-[0_2px_12px_-2px_rgba(0,0,0,0.04)]';
  } else if (topSev === 'HIGH' || topSev === 'MEDIUM') {
    cardStyle = 'bg-amber-50/40 border-amber-200/80 shadow-[0_2px_12px_-2px_rgba(0,0,0,0.04)]';
  }

  const roleLabel = depth === 0 ? 'Root' : depth === 1 ? 'Direct' : `Depth ${depth}`;

  return (
    <div
      className={`relative w-[245px] rounded-2xl p-4 transition-all duration-200 cursor-pointer select-none ${cardStyle}`}
    >
      {/* Left target handle */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-2.5 !h-2.5 !rounded-full !bg-zinc-400 !border-2 !border-white !-left-1.5"
      />

      {/* TOP ROW */}
      <div className="flex items-center justify-between gap-1 mb-2">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-sans font-medium px-2 py-0.5 rounded-full bg-surface2 border border-border text-muted">
            {ecosystem}
          </span>
          <span className="text-[10px] font-sans text-muted">
            {roleLabel}
          </span>
        </div>

        {blasted ? (
          <span className="text-[10px] font-sans font-semibold text-rose-700 bg-rose-100/80 px-2 py-0.5 rounded-full border border-rose-200">
            ⚡ Tainted
          </span>
        ) : topSev ? (
          <span
            className={`text-[10px] font-sans font-medium px-2 py-0.5 rounded-full border ${
              topSev === 'CRITICAL'
                ? 'bg-rose-50 text-rose-700 border-rose-200'
                : topSev === 'HIGH' || topSev === 'MEDIUM'
                ? 'bg-amber-50 text-amber-700 border-amber-200'
                : 'bg-zinc-100 text-zinc-600 border-zinc-200'
            }`}
          >
            {topSev}
          </span>
        ) : (
          <span className="text-[10px] font-sans text-emerald-600 font-medium">
            ✓ Clean
          </span>
        )}
      </div>

      {/* PACKAGE NAME */}
      <div className="mb-1.5 truncate max-w-full">
        <span className="font-sans text-sm font-bold text-text">
          {name}
        </span>
        {version && (
          <span className="font-mono text-xs text-muted ml-1.5">
            @{version}
          </span>
        )}
      </div>

      {/* DESCRIPTION / SUMMARY */}
      <div className="min-h-[30px] mb-2">
        {blasted ? (
          <p className="text-xs text-rose-700 font-medium leading-relaxed truncate font-sans">
            Compromise chain active
          </p>
        ) : mainCVE?.summary ? (
          <p className="text-xs text-muted line-clamp-2 leading-relaxed font-sans">
            {mainCVE.summary}
          </p>
        ) : (
          <p className="text-xs text-muted/80 leading-relaxed font-sans">
            No known CVEs detected
          </p>
        )}
      </div>

      {/* BOTTOM ROW */}
      <div className="border-t border-border/60 mt-2 pt-2 flex items-center justify-between text-[11px] text-muted font-sans">
        <span>Package</span>
        {monthly_downloads ? (
          <span className="font-mono text-xs text-dim">
            {formatDownloads(monthly_downloads)}
          </span>
        ) : (
          <span className="opacity-0">-</span>
        )}
      </div>

      {/* Right source handle */}
      <Handle
        type="source"
        position={Position.Right}
        className="!w-2 !h-2 !rounded-full !bg-zinc-400 !border-2 !border-white !-right-1"
      />
    </div>
  );
});

PackageNode.displayName = 'PackageNode';

export default PackageNode;
