import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useGraphStore } from '../store/graphStore';
import GraphCanvas from '../components/GraphCanvas';
import BlastRadiusPanel from '../components/BlastRadiusPanel';
import MitigationPanel from '../components/MitigationPanel';
import CompareView from '../components/CompareView';


export default function GraphView() {
  const graphData    = useGraphStore((s) => s.graphData);
  const blastData    = useGraphStore((s) => s.blastData);
  const selectedNode = useGraphStore((s) => s.selectedNode);
  const error        = useGraphStore((s) => s.error);
  const reset        = useGraphStore((s) => s.reset);
  const setView      = useGraphStore((s) => s.setView);
  const activeTab    = useGraphStore((s) => s.activeTab);
  const setActiveTab = useGraphStore((s) => s.setActiveTab);

  const [time, setTime] = useState(() => new Date().toLocaleTimeString());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  function handleStartOver() {
    reset();
    setView('idle');
  }

  // Derive root package information and node metrics
  const rawNodes = graphData?.nodes ?? graphData?.graph?.nodes ?? [];
  const rootNode = rawNodes.find((n) => n.is_root || n.depth === 0) ?? rawNodes[0];
  const packageName = graphData?.root?.name ?? rootNode?.name ?? 'Package';
  const packageVersion = graphData?.root?.version ?? rootNode?.version ?? '';
  const ecosystem = graphData?.root?.ecosystem ?? rootNode?.ecosystem ?? 'npm';
  const totalNodes = rawNodes.length;
  const vulnerableNodes = rawNodes.filter(
    (n) => (n.vulnerabilities || []).length > 0
  ).length;

  return (
    <div
      className="w-full flex flex-row overflow-hidden bg-white"
      style={{ height: 'calc(100vh - 64px)' }}
    >
      {/* Left — Graph canvas wrapper */}
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
          <>
            {/* Graph info header bar above the canvas */}
            {graphData !== null && (
              <div className="w-full px-4 py-2 bg-surface/80 backdrop-blur-md border-b border-border/40 flex items-center justify-between shrink-0 z-20 select-none">
                {/* Left: Package Name + Version + Ecosystem */}
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="font-mono text-sm font-bold text-text truncate">
                    {packageName}
                  </span>
                  {packageVersion && (
                    <span className="font-mono text-xs text-muted">
                      @{packageVersion}
                    </span>
                  )}
                  <span className="font-mono text-[9px] px-2 py-0.5 rounded-full bg-surface3 border border-border text-muted ml-2 shrink-0 uppercase">
                    {ecosystem}
                  </span>
                </div>

                {/* Right: Total nodes, Vulnerability count, Blast status */}
                <div className="flex items-center gap-3 shrink-0">
                  <span className="font-mono text-xs text-muted">
                    {totalNodes} nodes
                  </span>
                  <span
                    className={`font-mono text-xs ${
                      vulnerableNodes > 0 ? 'text-warn font-medium' : 'text-safe'
                    }`}
                  >
                    {vulnerableNodes > 0 ? `${vulnerableNodes} vulnerable` : '0 CVEs'}
                  </span>
                  {blastData && (
                    <span className="font-mono text-xs text-danger font-semibold">
                      {blastData.blast_score}/100 blast
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* React Flow Canvas Container */}
            <div className="flex-1 min-h-0 w-full relative">
              <GraphCanvas />

              {/* First-time use hint overlay */}
              <AnimatePresence>
                {graphData !== null && blastData === null && !selectedNode && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    transition={{ duration: 0.25 }}
                    className="absolute bottom-20 left-1/2 -translate-x-1/2 z-30 pointer-events-none animate-pulse"
                  >
                    <div className="rounded-full bg-surface2/90 border border-border/60 backdrop-blur-xl px-5 py-2.5 flex items-center gap-2.5 shadow-xl font-mono text-xs text-dim">
                      <span>👆</span>
                      <span>Click any node in the graph to select it as your attack target</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </>
        )}
      </div>

      {/* Right — Slide-in Minimalist Security Dashboard Side Panel */}
      <AnimatePresence>
        {graphData !== null && (
          <motion.aside
            key="side-panel"
            className="w-[410px] shrink-0 h-full bg-white border-l border-border flex flex-col overflow-hidden shadow-sm z-30"
            initial={{ x: 410, opacity: 0 }}
            animate={{ x: 0,   opacity: 1 }}
            exit={{ x: 410,    opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 32 }}
          >
            {/* Dashboard Top Header */}
            <div className="px-5 pt-4 pb-3 border-b border-border/60 flex items-center justify-between shrink-0 select-none bg-white">
              <span className="font-mono text-[10px] text-muted tracking-widest uppercase">
                SECURITY ANALYSIS
              </span>
              <span className="font-mono text-[10px] text-muted/60 tabular-nums">
                {time}
              </span>
            </div>

            {/* Three tabs: "Blast" | "Mitigation" | "Compare" */}
            <div className="flex border-b border-border/60 px-4 pt-2 pb-0 gap-1.5 select-none shrink-0 bg-surface/50">
              {[
                { id: 'blast', label: 'Blast' },
                { id: 'mitigation', label: 'Mitigation' },
                { id: 'compare', label: 'Compare' },
              ].map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`font-mono text-[11px] px-4 py-2 rounded-t-lg cursor-pointer transition-all ${
                      isActive
                        ? 'bg-white text-text border-b-2 border-accent font-semibold shadow-2xs'
                        : 'text-muted hover:text-dim hover:bg-surface2/40'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Tab content area */}
            <div className="flex-1 min-h-0 overflow-y-auto bg-white">
              {activeTab === 'blast' && <BlastRadiusPanel />}
              {activeTab === 'mitigation' && <MitigationPanel />}
              {activeTab === 'compare' && <CompareView />}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  );
}
