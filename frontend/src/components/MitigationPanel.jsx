import { useState } from 'react';
import { useGraphStore } from '../store/graphStore';

export default function MitigationPanel({ isExpanded = false }) {
  const { blastData, sandboxPatches, toggleSandboxPatch, clearSandboxPatches } = useGraphStore();
  const [copiedIndex, setCopiedIndex] = useState(null);

  if (!blastData || !blastData.mitigations?.length) {
    return (
      <div className="p-6 text-center select-none text-[#7a6a55]">
        <p className="text-xs font-sans leading-relaxed">
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
    <div className="flex flex-col gap-3.5 p-4 sm:p-5 select-none text-[#2c2416]">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-[#d4c9b0]">
        <span className="font-mono text-[11px] font-bold text-[#7a6a55] tracking-wider uppercase">
          Priority Mitigations
        </span>
        <span className="text-xs text-emerald-400 font-medium">
          {blastData.mitigations.length} Recommended
        </span>
      </div>

      {/* Sandbox status pill if active */}
      {sandboxPatches.length > 0 && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-xs font-sans text-emerald-700 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-1.5">
            <span className="animate-pulse">🛡️</span>
            <span><strong>{sandboxPatches.length}</strong> patch(es) active in Sandbox</span>
          </div>
          <button
            type="button"
            onClick={clearSandboxPatches}
            className="text-[10px] font-mono text-emerald-400 hover:text-emerald-200 underline cursor-pointer"
          >
            Reset All
          </button>
        </div>
      )}

      {/* Mitigation Action Cards */}
      <div className={`flex flex-col gap-3 ${isExpanded ? 'grid grid-cols-2' : ''}`}>
        {blastData.mitigations.map((item, i) => {
          const pct = item.blast_reduction;
          const barColor = pct >= 80 ? 'bg-rose-500' : pct >= 50 ? 'bg-amber-500' : 'bg-emerald-500';
          const isCopied = copiedIndex === i;
          const patchCmd = item.command || `npm install ${item.package.split('@')[0]}@${item.fix_version}`;
          const isPatchedInSandbox = sandboxPatches.includes(item.package) || sandboxPatches.some(p => p.startsWith(item.package.split('@')[0]));

          return (
            <div
              key={i}
              className={`rounded-2xl bg-[#ede8da] border p-4 flex flex-col gap-2.5 shadow-md transition-all ${
                isPatchedInSandbox ? 'border-emerald-500 ring-2 ring-emerald-500/40 bg-emerald-50' : 'border-[#d4c9b0] hover:border-[#c4b49a]'
              }`}
            >
              {/* Top Row */}
              <div className="flex items-center justify-between gap-2 select-none">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className="w-5 h-5 rounded-full bg-[#e2d9c0] border border-[#c4b49a] text-[11px] font-mono text-[#7a6a55] flex items-center justify-center shrink-0">
                    {i + 1}
                  </span>
                  <span className="font-mono text-xs font-bold text-[#2c2416] truncate">
                    {item.package}
                  </span>
                </div>

                <span className="bg-emerald-100 text-emerald-700 border border-emerald-400 text-xs font-mono font-semibold px-2 py-0.5 rounded-full shrink-0">
                  −{pct}% Blast
                </span>
              </div>

              {/* Progress Reduction Bar */}
              <div className="w-full h-1 bg-[#e2d9c0] rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${barColor} transition-all duration-700`}
                  style={{ width: `${pct}%` }}
                />
              </div>

              {/* Command box with copy button */}
              <div className="flex items-center justify-between gap-2 bg-[#e8e1cc] border border-[#d4c9b0] rounded-xl px-3 py-1.5 font-mono text-xs text-[#2c2416]">
                <span className="truncate">{patchCmd}</span>
                <button
                  type="button"
                  onClick={() => handleCopy(patchCmd, i)}
                  className="text-xs font-sans font-medium text-emerald-400 hover:text-emerald-700 shrink-0 ml-2 cursor-pointer transition-colors"
                >
                  {isCopied ? '✓ Copied' : 'Copy'}
                </button>
              </div>

              {/* Description */}
              {item.description && (
                <p className="text-xs text-[#7a6a55] leading-relaxed font-sans">
                  {item.description}
                </p>
              )}

              {/* Interactive Test in Sandbox CTA */}
              <button
                type="button"
                onClick={() => toggleSandboxPatch(item.package)}
                className={`mt-1 py-2 px-3 rounded-xl font-sans text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer border shadow-sm ${
                  isPatchedInSandbox
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-400 hover:bg-emerald-100'
                    : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-300'
                }`}
              >
                <span>🛡️</span>
                <span>{isPatchedInSandbox ? '✓ Patched in Sandbox (Active)' : 'Test Virtual Patch in Sandbox'}</span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
