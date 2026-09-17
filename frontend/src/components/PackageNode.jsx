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
  } = data;

  const topSev = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].find(s =>
    vulnerabilities.some(v => v.severity === s)
  );

  const mainCVE = vulnerabilities[0];

  // Light theme node palette — white cards, refined borders
  let cardBorder = 'border-stone-200 hover:border-stone-400';
  let cardBg = 'bg-white';
  let glowRing = 'shadow-sm';
  let iconBg = 'bg-indigo-50 text-indigo-500 border-indigo-200';
  let iconGlyph = '📦';

  if (isSandboxPatched) {
    cardBorder = 'border-emerald-400';
    cardBg = 'bg-emerald-50';
    glowRing = 'ring-2 ring-emerald-300/60 shadow-[0_0_18px_rgba(16,185,129,0.2)] scale-[1.02]';
    iconBg = 'bg-emerald-500 text-white border-emerald-400';
    iconGlyph = '🛡️';
  } else if (isSandboxProtected) {
    cardBorder = 'border-emerald-300';
    cardBg = 'bg-emerald-50/60';
    glowRing = 'ring-1 ring-emerald-200 shadow-sm';
    iconBg = 'bg-emerald-100 text-emerald-600 border-emerald-300';
    iconGlyph = '✓';
  } else if (isDominoActive) {
    cardBorder = 'border-amber-400';
    cardBg = 'bg-amber-50';
    glowRing = 'ring-2 ring-amber-300/80 shadow-[0_0_22px_rgba(245,158,11,0.3)] scale-[1.03] animate-pulse';
    iconBg = 'bg-amber-500 text-white border-amber-400';
    iconGlyph = '🦋';
  } else if (dominoIndex) {
    cardBorder = 'border-amber-300';
    cardBg = 'bg-amber-50/60';
    glowRing = 'ring-1 ring-amber-200 shadow-sm';
    iconBg = 'bg-amber-100 text-amber-600 border-amber-300';
    iconGlyph = '🦋';
  } else if (blasted) {
    cardBorder = 'border-rose-400';
    cardBg = 'bg-rose-50';
    glowRing = 'ring-2 ring-rose-300/50 shadow-[0_0_18px_rgba(244,63,94,0.2)]';
    iconBg = 'bg-rose-100 text-rose-500 border-rose-300';
    iconGlyph = '⚡';
  } else if (selected) {
    cardBorder = 'border-stone-900';
    glowRing = 'ring-2 ring-stone-300 shadow-md';
  } else if (topSev === 'CRITICAL') {
    cardBorder = 'border-rose-300';
    iconBg = 'bg-rose-50 text-rose-500 border-rose-200';
    iconGlyph = '⚠️';
  } else if (depth === 0) {
    cardBorder = 'border-violet-300';
    iconBg = 'bg-violet-50 text-violet-600 border-violet-200';
    iconGlyph = '⚡';
  }

  const roleLabel = depth === 0 ? 'Root Target' : depth === 1 ? 'Direct Dep' : `Transitive (L${depth})`;

  return (
    <div
      className={`relative min-w-[230px] max-w-[250px] rounded-2xl p-3.5 flex flex-col justify-between transition-all duration-200 cursor-pointer select-none border shadow-xl ${cardBg} ${cardBorder} ${glowRing}`}
    >
      {/* Left Target Handle */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3.5 !h-3.5 !rounded-full !bg-white !border-2 !border-stone-300 hover:!border-stone-900 hover:!scale-125 !transition-all !-left-2 shadow-sm"
      />

      {/* TOP ROW: Icon Badge + Name & Role */}
      <div className="flex items-center gap-2.5 mb-2">
        {/* Square Rounded Icon Badge (Like n8n node icons) */}
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm shrink-0 border ${iconBg} shadow-inner`}>
          <span>{iconGlyph}</span>
        </div>

        {/* Name & Subtitle */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <span className="font-mono text-xs font-bold text-stone-900 truncate" title={`${name}${version ? `@${version}` : ''}`}>
              {name}
            </span>
          </div>
          <p className="text-[10px] text-stone-400 font-sans truncate">
            {roleLabel}
            {version ? ` · v${version}` : ''}
          </p>
        </div>
      </div>

      {/* MIDDLE SECTION: Dynamic CVE or Cascade Status */}
      <div className="min-h-[22px] mb-2 px-2.5 py-1 rounded-lg bg-stone-50 border border-stone-100 flex items-center justify-between text-[10px]">
        {isSandboxPatched ? (
          <span className="text-emerald-600 font-semibold font-mono flex items-center gap-1">
            <span>🛡️</span>
            <span>Virtual Patch Active</span>
          </span>
        ) : isSandboxProtected ? (
          <span className="text-emerald-600 font-medium font-mono flex items-center gap-1">
            <span>✓</span>
            <span>Cascade Severed</span>
          </span>
        ) : dominoIndex ? (
          <span className="text-amber-600 font-semibold font-mono flex items-center gap-1">
            <span>🦋</span>
            <span>{dominoIndex === 1 ? 'Contagion Origin' : `Hop #${dominoIndex} in Path`}</span>
          </span>
        ) : blasted ? (
          <span className="text-rose-500 font-semibold font-mono flex items-center gap-1">
            <span>⚡</span>
            <span>Tainted Linkage</span>
          </span>
        ) : mainCVE?.id ? (
          <span className="text-rose-500 font-mono font-medium truncate">
            {mainCVE.id} ({topSev})
          </span>
        ) : (
          <span className="text-stone-400 font-sans">
            No known CVEs
          </span>
        )}

        {childCount > 0 && (
          <span className="text-[9px] font-mono text-stone-400 bg-stone-100 px-1.5 py-0.5 rounded ml-1 shrink-0">
            +{childCount}
          </span>
        )}
      </div>

      {/* BOTTOM ROW: Downloads + Ecosystem badge */}
      <div className="border-t border-stone-100 pt-2 flex items-center justify-between text-[10px] text-stone-400 font-sans">
        <span className="font-mono text-[10px] text-stone-400">
          {monthly_downloads ? formatDownloads(monthly_downloads) : '0 dl/mo'}
        </span>

        <span className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded bg-stone-100 text-stone-400 border border-stone-200">
          {ecosystem}
        </span>
      </div>

      {/* Right Source Handle */}
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3.5 !h-3.5 !rounded-full !bg-white !border-2 !border-stone-300 hover:!border-stone-900 hover:!scale-125 !transition-all !-right-2 shadow-sm"
      />
    </div>
  );
});

PackageNode.displayName = 'PackageNode';

export default PackageNode;
