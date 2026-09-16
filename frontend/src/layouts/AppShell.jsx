import { useGraphStore } from '../store/graphStore'

export default function AppShell({ children }) {
  const { reset, setView } = useGraphStore()

  function handleNewAnalysis() {
    reset()
    setView('idle')
  }

  return (
    <div className="min-h-screen bg-void text-text flex flex-col">
      {/* Header */}
      <header className="h-12 bg-surface border-b border-border flex items-center justify-between px-6 shrink-0 fixed top-0 left-0 right-0 z-50">
        <span className="font-mono text-accent text-sm tracking-widest uppercase">
          RippleGuard
        </span>
        <button
          onClick={handleNewAnalysis}
          className="font-mono text-dim text-xs hover:text-text transition-colors duration-150"
        >
          New Analysis
        </button>
      </header>

      {/* Main content — offset by header height */}
      <main className="flex-1 pt-12 flex flex-col">
        {children}
      </main>
    </div>
  )
}
