import { useGraphStore } from '../store/graphStore'

function EmptyState() {
  return (
    <div className="h-full flex items-center justify-center">
      <p className="font-mono text-muted text-xs text-center max-w-xs">
        Inject a compromise to see the blast radius.
      </p>
    </div>
  )
}

function ScoreSection({ blastData }) {
  return (
    <div className="py-4 px-5">
      <p className="font-mono text-muted text-xs tracking-widest mb-2">BLAST SCORE</p>
      <div>
        <span className="font-mono text-gold text-5xl font-medium">{blastData.blast_score}</span>
        <span className="font-mono text-muted text-lg">/100</span>
      </div>
      <p className="font-mono text-dim text-xs mt-2">
        {blastData.packages_affected} packages in blast zone
      </p>
    </div>
  )
}

function StatsSection({ blastData }) {
  return (
    <div className="py-4 px-5 flex flex-col gap-2">
      <div className="flex justify-between items-center">
        <span className="font-mono text-muted text-xs">DIRECT</span>
        <span className="font-mono text-text text-xs">{blastData.direct_affected}</span>
      </div>
      <div className="flex justify-between items-center">
        <span className="font-mono text-muted text-xs">TRANSITIVE</span>
        <span className="font-mono text-text text-xs">{blastData.transitive_affected}</span>
      </div>
      <div className="flex justify-between items-center">
        <span className="font-mono text-muted text-xs">DOWNLOADS AT RISK</span>
        <span className="font-mono text-text text-xs">{blastData.monthly_downloads_affected}/mo</span>
      </div>
    </div>
  )
}

function HumanTermsSection({ blastData }) {
  return (
    <div className="py-4 px-5">
      <p className="font-mono text-muted text-xs tracking-widest mb-2">IMPACT EQUIVALENT</p>
      <p className="font-sans text-text text-sm leading-relaxed">{blastData.human_comparison}</p>
    </div>
  )
}

export default function BlastRadiusPanel() {
  const blastData = useGraphStore((s) => s.blastData)

  if (!blastData) return <EmptyState />

  return (
    <div className="h-full flex flex-col">
      <ScoreSection blastData={blastData} />
      <div className="h-px bg-border" />
      <StatsSection blastData={blastData} />
      <div className="h-px bg-border" />
      <HumanTermsSection blastData={blastData} />
    </div>
  )
}
