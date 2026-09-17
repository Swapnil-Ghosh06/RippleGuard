import { memo } from 'react';
import { Handle, Position } from 'reactflow';

function formatDownloads(n) {
  if (!n) return null;
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M dl/mo';
  if (n >= 1_000)     return (n / 1_000).toFixed(0) + 'K dl/mo';
  return n + ' dl/mo';
}

const PackageNode = memo(({ id, data }) => {
  const {
    name,
    version,
    depth = 0,
    ecosystem = 'npm',
    vulnerabilities = [],
    monthly_downloads,
    blasted,
    selected,
    dominoIndex,
    isDominoActive,
    isSandboxPatched,
    isSandboxProtected,
    childCount = 0,
    isExpanded = false,
    onToggleExpand,
  } = data;

  const nodeId = data?.id || id || (version ? `${name}@${version}` : name);

  const topSev = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].find(s =>
    vulnerabilities.some(v => v.severity === s)
  );

  const mainCVE = vulnerabilities[0];

  // Minimalist clean card styling
  let cardStyle = 'bg-white border border-border hover:border-zinc-400 shadow-[0_2px_12px_-2px_rgba(0,0,0,0.04)]';

  if (isSandboxPatched) {
    cardStyle = 'bg-emerald-50/95 border-emerald-500 ring-4 ring-emerald-400/60 shadow-[0_6px_28px_rgba(16,185,129,0.35)] scale-[1.03] z-30';
  } else if (isSandboxProtected) {
    cardStyle = 'bg-emerald-50/60 border-emerald-300 ring-2 ring-emerald-400/30 shadow-[0_4px_18px_rgba(16,185,129,0.15)] z-10';
  } else if (isDominoActive) {
    cardStyle = 'bg-amber-50/95 border-amber-500 ring-4 ring-amber-400/60 shadow-[0_6px_28px_rgba(245,158,11,0.35)] scale-[1.04] z-30';
  } else if (dominoIndex) {
    cardStyle = 'bg-amber-50/80 border-amber-400 ring-2 ring-amber-400/40 shadow-[0_4px_20px_rgba(245,158,11,0.2)] z-20';
  } else if (blasted) {
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
      className={`relative min-w-[210px] max-w-[235px] rounded-xl p-3 flex flex-col justify-between transition-all duration-200 cursor-pointer select-none ${cardStyle}`}
    >
      {/* Left target handle */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-2.5 !h-2.5 !rounded-full !bg-zinc-400 !border-2 !border-white !-left-1.5"
      />

      {/* TOP ROW */}
      <div className="flex items-center justify-between gap-1 mb-1">
        <div className="flex items-center gap-1">
          <span className="text-[9px] font-sans font-medium px-1.5 py-0.5 rounded-full bg-surface2 border border-border text-muted">
            {ecosystem}
          </span>
          <span className="text-[9px] font-sans text-muted">
            {roleLabel}
          </span>
        </div>

        {isSandboxPatched ? (
          <span className="text-[9px] font-sans font-bold px-1.5 py-0.5 rounded-full border bg-emerald-500 text-white border-emerald-600 shadow-xs flex items-center gap-0.5">
            <span>🛡️</span>
            <span>Patched</span>
          </span>
        ) : isSandboxProtected ? (
          <span className="text-[9px] font-sans font-semibold px-1.5 py-0.5 rounded-full border bg-emerald-100 text-emerald-800 border-emerald-300 flex items-center gap-0.5">
            <span>✓</span>
            <span>Shielded</span>
          </span>
        ) : dominoIndex ? (
          <span
            className={`text-[9px] font-sans font-bold px-1.5 py-0.5 rounded-full border flex items-center gap-0.5 transition-all ${
              isDominoActive
                ? 'bg-amber-500 text-white border-amber-600 shadow-sm animate-pulse'
                : 'bg-amber-100 text-amber-900 border-amber-300'
            }`}
          >
            <span>🦋</span>
            <span>{dominoIndex === 1 ? 'Origin #1' : `Domino #${dominoIndex}`}</span>
          </span>
        ) : blasted ? (
          <span className="text-[9px] font-sans font-semibold text-rose-700 bg-rose-100/80 px-1.5 py-0.5 rounded-full border border-rose-200">
            ⚡ Tainted
          </span>
        ) : topSev ? (
          <span
            className={`text-[9px] font-sans font-medium px-1.5 py-0.5 rounded-full border ${
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
          <span className="text-[9px] font-sans text-emerald-600 font-medium">
            ✓ Clean
          </span>
        )}
      </div>

      {/* PACKAGE NAME */}
      <div className="mb-0.5 truncate max-w-full" title={`${name}${version ? `@${version}` : ''}`}>
        <span className="font-sans text-xs font-bold text-text truncate">
          {name}
        </span>
        {version && (
          <span className="font-mono text-[9px] text-muted ml-1 shrink-0">
            @{version}
          </span>
        )}
      </div>

      {/* DESCRIPTION / SUMMARY */}
      <div className="min-h-[22px] mb-1 overflow-hidden">
        {isSandboxPatched ? (
          <p className="text-[10px] text-emerald-900 font-semibold leading-tight truncate font-sans">
            Virtual patch active · Cascade blocked
          </p>
        ) : isSandboxProtected ? (
          <p className="text-[10px] text-emerald-800 font-medium leading-tight truncate font-sans">
            Infection severed · Safeguarded
          </p>
        ) : dominoIndex ? (
          <p className="text-[10px] text-amber-900 font-semibold leading-tight truncate font-sans">
            {dominoIndex === 1 ? 'Critical Cascade Origin' : `Domino Path (Hop ${dominoIndex})`}
          </p>
        ) : blasted ? (
          <p className="text-[10px] text-rose-700 font-medium leading-tight truncate font-sans">
            Compromise chain active
          </p>
        ) : mainCVE?.summary ? (
          <p className="text-[10px] text-muted line-clamp-1 leading-tight font-sans">
            {mainCVE.summary}
          </p>
        ) : (
          <p className="text-[10px] text-muted/80 leading-tight font-sans">
            No known CVEs detected
          </p>
        )}
      </div>

      {/* BOTTOM ROW: Downloads on Left, Dependency Topology Tag on Right */}
      <div className="border-t border-border/60 mt-1.5 pt-1.5 flex items-center justify-between text-[10px] text-muted font-sans gap-1">
        <div>
          {monthly_downloads ? (
            <span className="font-mono text-[10px] text-dim font-medium">
              {formatDownloads(monthly_downloads)}
            </span>
          ) : (
            <span className="text-[10px] text-muted">0 dl/mo</span>
          )}
        </div>

        <div>
          {depth === 0 ? (
            <span className="text-[9px] font-mono uppercase text-muted bg-surface2 px-1.5 py-0.5 rounded border border-border/50">
              Root
            </span>
          ) : childCount > 0 ? (
            <span className="text-[9px] font-mono text-muted/80 bg-surface2/60 px-1.5 py-0.5 rounded border border-border/40">
              {childCount} {childCount === 1 ? 'dep' : 'deps'}
            </span>
          ) : (
            <span className="text-[9px] text-muted/60 uppercase font-sans tracking-wide">
              Leaf
            </span>
          )}
        </div>
      </div>

      {/* Right source handle */}
      <Handle
        type="source"
        position={Position.Right}
        className="!w-2.5 !h-2.5 !rounded-full !bg-zinc-400 !border-2 !border-white !-right-1.5"
      />
    </div>
  );
});

PackageNode.displayName = 'PackageNode';

export default PackageNode;
