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

  const [panelWidthMode, setPanelWidthMode] = useState('standard'); // 'standard' | 'expanded' | 'collapsed'

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'F7' || (e.ctrlKey && e.key.toLowerCase() === 'b')) {
        e.preventDefault();
        setPanelWidthMode(prev => prev === 'collapsed' ? 'standard' : 'collapsed');
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const panelWidthClass = panelWidthMode === 'expanded'
    ? 'w-[640px] xl:w-[700px]'
    : 'w-[420px]';

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

              {/* Floating Reopen Button if Side Panel is Collapsed */}
              {panelWidthMode === 'collapsed' && graphData !== null && (
                <motion.button
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  type="button"
                  onClick={() => setPanelWidthMode('standard')}
                  className="absolute top-4 right-4 z-30 px-3 py-2 rounded-xl bg-zinc-950/90 hover:bg-zinc-900 border border-zinc-800 text-zinc-100 font-mono text-xs font-semibold shadow-xl backdrop-blur-md flex items-center gap-2 cursor-pointer transition-all"
                  title="Open Security Analysis (F7)"
                >
                  <span className="text-emerald-400">🛡️</span>
                  <span>Security Analysis</span>
                  <span className="text-[10px] text-zinc-400 bg-zinc-800 px-1.5 py-0.5 rounded">F7</span>
                </motion.button>
              )}
            </div>
          </>
        )}
      </div>

      {/* Right — Expandable / Responsive Cyber Command Center Side Panel */}
      <AnimatePresence>
        {graphData !== null && panelWidthMode !== 'collapsed' && (
          <motion.aside
            key="side-panel"
            className={`${panelWidthClass} shrink-0 h-full bg-zinc-950 text-zinc-100 border-l border-zinc-800/80 flex flex-col overflow-hidden shadow-2xl z-30 transition-all duration-300 ease-out`}
            initial={{ x: 420, opacity: 0 }}
            animate={{ x: 0,   opacity: 1 }}
            exit={{ x: 420,    opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 32 }}
          >
            {/* Dashboard Top Header */}
            <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between shrink-0 select-none bg-zinc-950">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[11px] font-bold text-zinc-200 tracking-widest uppercase">
                  SECURITY ANALYSIS
                </span>
                <span className="font-mono text-[10px] text-zinc-500 tabular-nums">
                  {time}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                {/* Expand / Shrink toggle button */}
                <button
                  type="button"
                  onClick={() => setPanelWidthMode(prev => prev === 'expanded' ? 'standard' : 'expanded')}
                  className="px-2 py-1 rounded text-[11px] font-mono text-zinc-300 hover:text-white hover:bg-zinc-800 border border-zinc-700/80 transition-all flex items-center gap-1 cursor-pointer"
                  title={panelWidthMode === 'expanded' ? 'Restore standard width' : 'Expand panel width for spacious view'}
                >
                  <span>{panelWidthMode === 'expanded' ? '⤡' : '⤢'}</span>
                  <span>{panelWidthMode === 'expanded' ? 'Standard' : 'Expand'}</span>
                </button>

                {/* Hide button */}
                <button
                  type="button"
                  onClick={() => setPanelWidthMode('collapsed')}
                  className="w-6 h-6 rounded flex items-center justify-center text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors text-xs cursor-pointer ml-1"
                  title="Hide panel (F7)"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Three tabs: "Blast" | "Mitigation" | "Compare" */}
            <div className="flex border-b border-zinc-800 px-3 pt-2 pb-0 gap-1.5 select-none shrink-0 bg-zinc-900/60">
              {[
                { id: 'blast', label: 'Blast', icon: '⚡' },
                { id: 'mitigation', label: 'Mitigation', icon: '🛡️' },
                { id: 'compare', label: 'Compare', icon: '⚖️' },
              ].map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`font-mono text-[11px] px-3.5 py-1.5 rounded-t-lg cursor-pointer transition-all flex items-center gap-1.5 ${
                      isActive
                        ? 'bg-zinc-950 text-white border-b-2 border-emerald-400 font-semibold shadow-xs'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
                    }`}
                  >
                    <span className="text-[10px]">{tab.icon}</span>
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Tab content area */}
            <div className="flex-1 min-h-0 overflow-y-auto bg-zinc-950 text-zinc-100">
              {activeTab === 'blast' && <BlastRadiusPanel isExpanded={panelWidthMode === 'expanded'} />}
              {activeTab === 'mitigation' && <MitigationPanel isExpanded={panelWidthMode === 'expanded'} />}
              {activeTab === 'compare' && <CompareView isExpanded={panelWidthMode === 'expanded'} />}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  );
}
