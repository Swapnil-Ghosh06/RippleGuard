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

  // n8n Workflow Node Palette (Obsidian slate background, crisp neon accents)
  let cardBorder = 'border-[#2d3448] hover:border-[#475569]';
  let cardBg = 'bg-[#181c28]';
  let glowRing = '';
  let iconBg = 'bg-indigo-600/30 text-indigo-400 border-indigo-500/40';
  let iconGlyph = '📦';

  if (isSandboxPatched) {
    cardBorder = 'border-emerald-500';
    cardBg = 'bg-[#0f241d]';
    glowRing = 'ring-2 ring-emerald-400/60 shadow-[0_0_24px_rgba(16,185,129,0.3)] scale-[1.02]';
    iconBg = 'bg-emerald-500 text-white border-emerald-400';
    iconGlyph = '🛡️';
  } else if (isSandboxProtected) {
    cardBorder = 'border-emerald-500/60';
    cardBg = 'bg-[#10201a]';
    glowRing = 'ring-1 ring-emerald-400/30 shadow-[0_0_16px_rgba(16,185,129,0.15)]';
    iconBg = 'bg-emerald-600/30 text-emerald-300 border-emerald-500/40';
    iconGlyph = '✓';
  } else if (isDominoActive) {
    cardBorder = 'border-amber-500';
    cardBg = 'bg-[#291e0e]';
    glowRing = 'ring-2 ring-amber-400/80 shadow-[0_0_28px_rgba(245,158,11,0.4)] scale-[1.03] animate-pulse';
    iconBg = 'bg-amber-500 text-white border-amber-400';
    iconGlyph = '🦋';
  } else if (dominoIndex) {
    cardBorder = 'border-amber-500/70';
    cardBg = 'bg-[#22180b]';
    glowRing = 'ring-1 ring-amber-400/40 shadow-[0_0_18px_rgba(245,158,11,0.2)]';
    iconBg = 'bg-amber-600/30 text-amber-300 border-amber-500/40';
    iconGlyph = '🦋';
  } else if (blasted) {
    cardBorder = 'border-rose-500/80';
    cardBg = 'bg-[#241218]';
    glowRing = 'ring-2 ring-rose-500/40 shadow-[0_0_22px_rgba(244,63,94,0.3)]';
    iconBg = 'bg-rose-500/30 text-rose-300 border-rose-500/50';
    iconGlyph = '⚡';
  } else if (selected) {
    cardBorder = 'border-white';
    glowRing = 'ring-2 ring-white/30 shadow-[0_0_20px_rgba(255,255,255,0.15)]';
  } else if (topSev === 'CRITICAL') {
    cardBorder = 'border-rose-500/50';
    iconBg = 'bg-rose-900/40 text-rose-400 border-rose-600/40';
    iconGlyph = '⚠️';
  } else if (depth === 0) {
    iconBg = 'bg-purple-600/30 text-purple-300 border-purple-500/50';
    iconGlyph = '⚡';
  }

  const roleLabel = depth === 0 ? 'Root Target' : depth === 1 ? 'Direct Dep' : `Transitive (L${depth})`;

  return (
    <div
      className={`relative min-w-[230px] max-w-[250px] rounded-2xl p-3.5 flex flex-col justify-between transition-all duration-200 cursor-pointer select-none border shadow-xl ${cardBg} ${cardBorder} ${glowRing}`}
    >
      {/* n8n Circular Port - Left Target Handle */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3.5 !h-3.5 !rounded-full !bg-[#181c28] !border-2 !border-zinc-400 hover:!border-white hover:!scale-125 !transition-all !-left-2 shadow-sm"
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
            <span className="font-mono text-xs font-bold text-white truncate" title={`${name}${version ? `@${version}` : ''}`}>
              {name}
            </span>
          </div>
          <p className="text-[10px] text-zinc-400 font-sans truncate">
            {roleLabel}
            {version ? ` · v${version}` : ''}
          </p>
        </div>
      </div>

      {/* MIDDLE SECTION: Dynamic CVE or Cascade Status */}
      <div className="min-h-[22px] mb-2 px-2.5 py-1 rounded-lg bg-[#111420]/80 border border-white/5 flex items-center justify-between text-[10px]">
        {isSandboxPatched ? (
          <span className="text-emerald-400 font-semibold font-mono flex items-center gap-1">
            <span>🛡️</span>
            <span>Virtual Patch Active</span>
          </span>
        ) : isSandboxProtected ? (
          <span className="text-emerald-400 font-medium font-mono flex items-center gap-1">
            <span>✓</span>
            <span>Cascade Severed</span>
          </span>
        ) : dominoIndex ? (
          <span className="text-amber-300 font-semibold font-mono flex items-center gap-1">
            <span>🦋</span>
            <span>{dominoIndex === 1 ? 'Contagion Origin' : `Hop #${dominoIndex} in Path`}</span>
          </span>
        ) : blasted ? (
          <span className="text-rose-400 font-semibold font-mono flex items-center gap-1">
            <span>⚡</span>
            <span>Tainted Linkage</span>
          </span>
        ) : mainCVE?.id ? (
          <span className="text-rose-400 font-mono font-medium truncate">
            {mainCVE.id} ({topSev})
          </span>
        ) : (
          <span className="text-zinc-500 font-sans">
            No known CVEs
          </span>
        )}

        {childCount > 0 && (
          <span className="text-[9px] font-mono text-zinc-400 bg-white/5 px-1.5 py-0.5 rounded ml-1 shrink-0">
            +{childCount}
          </span>
        )}
      </div>

      {/* BOTTOM ROW: Downloads on Left, Clean Ecosystem / Status Badge on Right */}
      <div className="border-t border-white/5 pt-2 flex items-center justify-between text-[10px] text-zinc-400 font-sans">
        <span className="font-mono text-[10px] text-zinc-400">
          {monthly_downloads ? formatDownloads(monthly_downloads) : '0 dl/mo'}
        </span>

        <span className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/5 text-zinc-400 border border-white/5">
          {ecosystem}
        </span>
      </div>

      {/* n8n Circular Port - Right Source Handle */}
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3.5 !h-3.5 !rounded-full !bg-[#181c28] !border-2 !border-zinc-400 hover:!border-white hover:!scale-125 !transition-all !-right-2 shadow-sm"
      />
    </div>
  );
});

PackageNode.displayName = 'PackageNode';

export default PackageNode;
