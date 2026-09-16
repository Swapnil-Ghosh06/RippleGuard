import { AnimatePresence, motion } from 'framer-motion';
import { useGraphStore } from '../store/graphStore';
import GraphCanvas from '../components/GraphCanvas';
import BlastRadiusPanel from '../components/BlastRadiusPanel';
import MitigationPanel from '../components/MitigationPanel';

export default function GraphView() {
  const graphData = useGraphStore((s) => s.graphData);
  const error     = useGraphStore((s) => s.error);
  const reset     = useGraphStore((s) => s.reset);
  const setView   = useGraphStore((s) => s.setView);

  function handleStartOver() {
    reset();
    setView('idle');
  }

  return (
    <div
      className="w-full flex flex-row overflow-hidden bg-void"
      style={{ height: 'calc(100vh - 56px)' }}
    >
      {/* Left — Graph canvas (takes all remaining space with explicit height) */}
      <div className="flex-1 min-w-0 h-full overflow-hidden relative flex flex-col">
        {error !== null ? (
          <div className="w-full h-full flex flex-col items-center justify-center gap-4">
            <p className="font-mono text-danger text-sm text-center max-w-sm">{error}</p>
            <button
              onClick={handleStartOver}
              className="font-sans text-sm border border-border text-text px-4 py-2 rounded-lg hover:bg-surface transition-colors duration-150"
            >
              Start over
            </button>
          </div>
        ) : (
          <GraphCanvas />
        )}
      </div>

      {/* Right — Slide-in Security Dashboard Side Panel (Inspo 1) */}
      <AnimatePresence>
        {graphData !== null && (
          <motion.aside
            key="side-panel"
            className="w-96 shrink-0 h-full bg-surface border-l border-border flex flex-col overflow-y-auto shadow-2xl z-30"
            initial={{ x: 384, opacity: 0 }}
            animate={{ x: 0,   opacity: 1 }}
            exit={{ x: 384,    opacity: 0 }}
            transition={{ type: 'spring', stiffness: 280, damping: 30 }}
          >
            <BlastRadiusPanel />
            <div className="h-px bg-border/80 mx-5 my-1" />
            <MitigationPanel />
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  );
}
