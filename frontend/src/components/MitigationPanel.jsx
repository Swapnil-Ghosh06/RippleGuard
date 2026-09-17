import { useState } from 'react';
import { useGraphStore } from '../store/graphStore';

export default function MitigationPanel({ isExpanded = false }) {
  const { blastData, sandboxPatches, toggleSandboxPatch, clearSandboxPatches } = useGraphStore();
  const [copiedIndex, setCopiedIndex] = useState(null);

  if (!blastData || !blastData.mitigations?.length) {
    return (
      <div className="p-6 text-center select-none text-zinc-400">
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
    <div className="flex flex-col gap-3.5 p-4 sm:p-5 select-none text-zinc-100">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
        <span className="font-mono text-[11px] font-bold text-zinc-400 tracking-wider uppercase">
          Priority Mitigations
        </span>
        <span className="text-xs text-emerald-400 font-medium">
          {blastData.mitigations.length} Recommended
        </span>
      </div>

      {/* Sandbox status pill if active */}
      {sandboxPatches.length > 0 && (
        <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-xs font-sans text-emerald-300 flex items-center justify-between shadow-sm">
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
              className={`rounded-2xl bg-zinc-900/90 border p-4 flex flex-col gap-2.5 shadow-md transition-all ${
                isPatchedInSandbox ? 'border-emerald-500 ring-2 ring-emerald-500/40 bg-emerald-950/20' : 'border-zinc-800 hover:border-zinc-700'
              }`}
            >
              {/* Top Row */}
              <div className="flex items-center justify-between gap-2 select-none">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className="w-5 h-5 rounded-full bg-zinc-800 border border-zinc-700 text-[11px] font-mono text-zinc-400 flex items-center justify-center shrink-0">
                    {i + 1}
                  </span>
                  <span className="font-mono text-xs font-bold text-white truncate">
                    {item.package}
                  </span>
                </div>

                <span className="bg-emerald-950/80 text-emerald-300 border border-emerald-700/60 text-xs font-mono font-semibold px-2 py-0.5 rounded-full shrink-0">
                  −{pct}% Blast
                </span>
              </div>

              {/* Progress Reduction Bar */}
              <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${barColor} transition-all duration-700`}
                  style={{ width: `${pct}%` }}
                />
              </div>

              {/* Command box with copy button */}
              <div className="flex items-center justify-between gap-2 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-1.5 font-mono text-xs text-zinc-200">
                <span className="truncate">{patchCmd}</span>
                <button
                  type="button"
                  onClick={() => handleCopy(patchCmd, i)}
                  className="text-xs font-sans font-medium text-emerald-400 hover:text-emerald-300 shrink-0 ml-2 cursor-pointer transition-colors"
                >
                  {isCopied ? '✓ Copied' : 'Copy'}
                </button>
              </div>

              {/* Description */}
              {item.description && (
                <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                  {item.description}
                </p>
              )}

              {/* Interactive Test in Sandbox CTA */}
              <button
                type="button"
                onClick={() => toggleSandboxPatch(item.package)}
                className={`mt-1 py-2 px-3 rounded-xl font-sans text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer border shadow-sm ${
                  isPatchedInSandbox
                    ? 'bg-emerald-950 text-emerald-300 border-emerald-600 hover:bg-emerald-900'
                    : 'bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-300 border-emerald-800/80'
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
