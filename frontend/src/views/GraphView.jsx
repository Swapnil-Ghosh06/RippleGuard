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
      className="w-full flex flex-row overflow-hidden bg-white"
      style={{ height: 'calc(100vh - 56px)' }}
    >
      {/* Left — Graph canvas */}
      <div className="flex-1 min-w-0 h-full overflow-hidden relative flex flex-col">
        {error !== null ? (
          <div className="w-full h-full flex flex-col items-center justify-center gap-4 p-6">
            <div className="rounded-2xl border border-border bg-white p-6 max-w-sm text-center shadow-sm">
              <p className="font-sans text-danger text-sm mb-4">{error}</p>
              <button
                onClick={handleStartOver}
                className="text-xs font-sans font-medium text-text bg-surface2 hover:bg-surface3 border border-border px-4 py-2 rounded-full transition-colors"
              >
                ← Back to Search
              </button>
            </div>
          </div>
        ) : (
          <GraphCanvas />
        )}
      </div>

      {/* Right — Slide-in Minimalist Security Dashboard Side Panel */}
      <AnimatePresence>
        {graphData !== null && (
          <motion.aside
            key="side-panel"
            className="w-[380px] shrink-0 h-full bg-white border-l border-border flex flex-col overflow-y-auto shadow-sm z-30"
            initial={{ x: 380, opacity: 0 }}
            animate={{ x: 0,   opacity: 1 }}
            exit={{ x: 380,    opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 32 }}
          >
            <BlastRadiusPanel />
            <div className="h-px bg-border mx-5 my-1" />
            <MitigationPanel />
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  );
}
