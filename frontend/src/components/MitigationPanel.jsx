import { useGraphStore } from '../store/graphStore';

export default function MitigationPanel() {
  const { blastData } = useGraphStore();

  if (!blastData || !blastData.mitigations?.length) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <p className="font-mono text-muted text-xs text-center max-w-xs leading-relaxed">
          Mitigation actions<br />will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="px-5 py-4">
      <p className="font-mono text-muted text-xs tracking-widest mb-4">MITIGATION PRIORITY</p>

      <div className="flex flex-col gap-0">
        {blastData.mitigations.map((item, i) => {
          const pct      = item.blast_reduction;
          const barColor = pct >= 80 ? 'bg-danger' : pct >= 50 ? 'bg-warn' : 'bg-safe';

          return (
            <div key={i} className="py-3 border-b border-border last:border-0">

              {/* Header row */}
              <div className="flex justify-between items-start mb-1.5">
                <span className="font-mono text-text text-xs leading-tight max-w-[60%]">
                  {item.package}
                </span>
                <span className="font-mono text-safe text-xs shrink-0 ml-2">
                  −{pct}%
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full h-0.5 bg-border rounded-full mb-1.5 overflow-hidden">
                <div
                  className={`h-full rounded-full ${barColor} transition-all duration-700`}
                  style={{ width: `${pct}%` }}
                />
              </div>

              {/* Fix version */}
              <p className="font-mono text-dim text-xs">
                → upgrade to {item.fix_version}
              </p>

              {/* Description */}
              {item.description && (
                <p className="font-sans text-muted text-xs mt-1 leading-relaxed">
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
