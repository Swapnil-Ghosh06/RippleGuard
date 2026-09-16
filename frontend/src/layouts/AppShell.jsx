import { useGraphStore } from '../store/graphStore'

export default function AppShell({ children }) {
  const { reset, setView, view, graphData, blastData } = useGraphStore()

  function handleNewAnalysis() {
    reset()
    setView('idle')
  }

  // Status pill
  const statusMap = {
    idle:    null,
    loading: { label: 'ANALYZING',  color: '#C49A3C' },
    graph:   blastData
               ? { label: 'BLAST ACTIVE', color: '#C0392B' }
               : { label: 'GRAPH READY',  color: '#6B8F71' },
  }
  const status = statusMap[view] ?? null

  return (
    <div className="min-h-screen bg-void text-text flex flex-col">

      {/* Header */}
      <header
        className="h-12 flex items-center justify-between px-6 shrink-0 fixed top-0 left-0 right-0 z-50"
        style={{ background: '#201e1b', borderBottom: '1px solid #3a3530' }}
      >
        {/* Left — wordmark */}
        <div className="flex items-center gap-3">
          <span
            className="text-sm tracking-widest text-accent uppercase"
            style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 700, letterSpacing: '0.12em' }}
          >
            RippleGuard
          </span>

          {/* Status pill */}
          {status && (
            <span
              className="font-mono text-xs px-2 py-0.5 rounded-sm"
              style={{
                color:      status.color,
                background: status.color + '18',
                border:     `1px solid ${status.color}40`,
                letterSpacing: '0.08em',
              }}
            >
              {status.label}
            </span>
          )}
        </div>

        {/* Right — meta + action */}
        <div className="flex items-center gap-4">
          {graphData && view === 'graph' && (
            <span className="font-mono text-muted text-xs">
              {(graphData.nodes ?? graphData.graph?.nodes ?? []).length} nodes
              {' · '}
              {(graphData.edges ?? graphData.graph?.edges ?? []).length} edges
            </span>
          )}
          <button
            onClick={handleNewAnalysis}
            className="font-mono text-dim text-xs hover:text-text transition-colors duration-150"
          >
            ← New Analysis
          </button>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 pt-12 flex flex-col">
        {children}
      </main>
    </div>
  )
}
