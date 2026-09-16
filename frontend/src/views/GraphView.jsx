import { AnimatePresence, motion } from 'framer-motion'
import { useGraphStore } from '../store/graphStore'
import GraphCanvas from '../components/GraphCanvas'
import BlastRadiusPanel from '../components/BlastRadiusPanel'
import MitigationPanel from '../components/MitigationPanel'

export default function GraphView() {
  const graphData = useGraphStore((s) => s.graphData)
  const error     = useGraphStore((s) => s.error)
  const reset     = useGraphStore((s) => s.reset)
  const setView   = useGraphStore((s) => s.setView)

  function handleStartOver() {
    reset()
    setView('idle')
  }

  return (
    <div
      className="w-full flex flex-row overflow-hidden"
      style={{ height: 'calc(100vh - 48px)' }}
    >
      {/* Left — Graph canvas (takes all remaining space) */}
      <div className="flex-1 overflow-hidden relative">
        {error !== null ? (
          <div className="w-full h-full flex flex-col items-center justify-center gap-4">
            <p className="font-mono text-danger text-sm text-center max-w-sm">{error}</p>
            <button
              onClick={handleStartOver}
              className="font-sans text-sm border border-border text-text px-4 py-2 rounded-sm hover:bg-surface transition-colors duration-150"
            >
              Start over
            </button>
          </div>
        ) : (
          <GraphCanvas />
        )}
      </div>

      {/* Right — Slide-in side panel */}
      <AnimatePresence>
        {graphData !== null && (
          <motion.aside
            key="side-panel"
            className="w-80 shrink-0 bg-surface border-l border-border flex flex-col overflow-y-auto"
            initial={{ x: 320, opacity: 0 }}
            animate={{ x: 0,   opacity: 1 }}
            exit={{ x: 320,    opacity: 0 }}
            transition={{ type: 'spring', stiffness: 280, damping: 30 }}
          >
            <BlastRadiusPanel />
            <div className="h-px bg-border" />
            <MitigationPanel />
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  )
}
