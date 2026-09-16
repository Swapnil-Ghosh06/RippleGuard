import { useGraphStore } from '../store/graphStore'

function EmptyState() {
  return (
    <div className="h-full flex items-center justify-center">
      <p className="font-mono text-muted text-xs text-center max-w-xs">
        Mitigation actions will appear here.
      </p>
    </div>
  )
}

export default function MitigationPanel() {
  const blastData = useGraphStore((s) => s.blastData)

  if (!blastData || !blastData.mitigations || blastData.mitigations.length === 0) {
    return <EmptyState />
  }

  return (
    <div className="py-4 px-5 flex flex-col gap-1 mb-2">
      <p className="font-mono text-muted text-xs tracking-widest mb-2">MITIGATION PRIORITY</p>

      {blastData.mitigations.map((item) => (
        <div key={item.package} className="py-3 border-b border-border last:border-0">
          {/* First line — package name + reduction */}
          <div className="flex justify-between">
            <span className="font-mono text-text text-xs">{item.package}</span>
            <span className="font-mono text-safe text-xs">{item.blast_reduction}% reduction</span>
          </div>

          {/* Second line — fix version */}
          <p className="font-mono text-dim text-xs mt-1">Upgrade to {item.fix_version}</p>

          {/* Third line — description (optional) */}
          {item.description && (
            <p className="font-sans text-muted text-xs mt-1 leading-relaxed">{item.description}</p>
          )}
        </div>
      ))}
    </div>
  )
}
