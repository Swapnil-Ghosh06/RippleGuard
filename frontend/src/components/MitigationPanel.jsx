import { useState } from 'react';
import { useGraphStore } from '../store/graphStore';

export default function MitigationPanel() {
  const { blastData, sandboxPatches, toggleSandboxPatch, clearSandboxPatches } = useGraphStore();
  const [copiedIndex, setCopiedIndex] = useState(null);

  if (!blastData || !blastData.mitigations?.length) {
    return (
      <div className="p-6 text-center select-none">
        <p className="text-xs text-muted font-sans leading-relaxed">
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
    <div className="flex flex-col gap-3 p-5">
      {/* Header */}
      <div className="flex items-center justify-between pb-1 border-b border-border select-none">
        <span className="font-sans text-xs font-semibold text-muted tracking-wider uppercase">
          Priority Mitigations
        </span>
        <span className="text-xs text-emerald-700 font-medium">
          {blastData.mitigations.length} Recommended
        </span>
      </div>

      {/* Sandbox status pill if active */}
      {sandboxPatches.length > 0 && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-xs font-sans text-emerald-950 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-1.5">
            <span className="animate-pulse">🛡️</span>
            <span><strong>{sandboxPatches.length}</strong> patch(es) active in Sandbox</span>
          </div>
          <button
            type="button"
            onClick={clearSandboxPatches}
            className="text-[10px] font-mono text-emerald-800 hover:text-emerald-950 underline cursor-pointer"
          >
            Reset All
          </button>
        </div>
      )}

      {/* Mitigation Action Cards */}
      <div className="flex flex-col gap-3">
        {blastData.mitigations.map((item, i) => {
          const pct = item.blast_reduction;
          const barColor = pct >= 80 ? 'bg-rose-500' : pct >= 50 ? 'bg-amber-500' : 'bg-emerald-500';
          const isCopied = copiedIndex === i;
          const patchCmd = item.command || `npm install ${item.package.split('@')[0]}@${item.fix_version}`;
          const isPatchedInSandbox = sandboxPatches.includes(item.package) || sandboxPatches.some(p => p.startsWith(item.package.split('@')[0]));

          return (
            <div
              key={i}
              className={`rounded-2xl bg-white border p-4 flex flex-col gap-2.5 shadow-xs transition-all ${
                isPatchedInSandbox ? 'border-emerald-400 ring-2 ring-emerald-400/30' : 'border-border hover:border-zinc-400'
              }`}
            >
              {/* Top Row */}
              <div className="flex items-center justify-between gap-2 select-none">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className="w-5 h-5 rounded-full bg-surface2 border border-border text-[11px] font-mono text-muted flex items-center justify-center shrink-0">
                    {i + 1}
                  </span>
                  <span className="font-mono text-xs font-bold text-text truncate">
                    {item.package}
                  </span>
                </div>

                <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-medium px-2 py-0.5 rounded-full shrink-0">
                  −{pct}% Blast
                </span>
              </div>

              {/* Progress Reduction Bar */}
              <div className="w-full h-1 bg-border/60 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${barColor} transition-all duration-700`}
                  style={{ width: `${pct}%` }}
                />
              </div>

              {/* Command box with copy button */}
              <div className="flex items-center justify-between gap-2 bg-surface2 border border-border rounded-xl px-3 py-1.5 font-mono text-xs text-dim">
                <span className="truncate">{patchCmd}</span>
                <button
                  type="button"
                  onClick={() => handleCopy(patchCmd, i)}
                  className="text-xs font-sans font-medium text-text hover:text-black shrink-0 ml-2 cursor-pointer transition-colors"
                >
                  {isCopied ? '✓ Copied' : 'Copy'}
                </button>
              </div>

              {/* Description */}
              {item.description && (
                <p className="text-xs text-muted leading-relaxed font-sans">
                  {item.description}
                </p>
              )}

              {/* Interactive Test in Sandbox CTA */}
              <button
                type="button"
                onClick={() => toggleSandboxPatch(item.package)}
                className={`mt-1 py-2 px-3 rounded-xl font-sans text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer border shadow-2xs ${
                  isPatchedInSandbox
                    ? 'bg-emerald-100 text-emerald-900 border-emerald-400 hover:bg-emerald-200'
                    : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-950 border-emerald-300'
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
