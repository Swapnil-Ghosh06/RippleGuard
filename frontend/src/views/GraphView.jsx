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
      className="w-full flex flex-row overflow-hidden bg-stone-50"
      style={{ height: 'calc(100vh - 64px)' }}
    >
      {/* Left — Graph canvas wrapper */}
      <div className="flex-1 min-w-0 h-full overflow-hidden relative flex flex-col">
        {error !== null ? (
          <div className="w-full h-full flex flex-col items-center justify-center gap-4 p-6">
            <div className="rounded-2xl border border-stone-200 bg-white p-6 max-w-sm text-center shadow-lg">
              <p className="font-sans text-rose-500 text-sm mb-4">{error}</p>
              <button
                onClick={handleStartOver}
                className="text-xs font-sans font-medium text-stone-700 bg-stone-100 hover:bg-stone-200 border border-stone-300 px-4 py-2 rounded-full transition-colors"
              >
                ← Back to Search
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Graph info header bar above the canvas */}
            {graphData !== null && (
              <div className="w-full px-4 py-2.5 bg-[#ede8da] border-b border-[#d4c9b0] flex items-center justify-between shrink-0 z-20 select-none">
                {/* Left: Package Name + Version + Ecosystem */}
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="font-display text-sm font-bold text-[#2c2416] truncate">
                    {packageName}
                  </span>
                  {packageVersion && (
                    <span className="font-sans text-xs text-[#7a6a55]">
                      @{packageVersion}
                    </span>
                  )}
                  <span className="font-sans font-medium text-[10px] px-2 py-0.5 rounded-full bg-[#e2d9c0] border border-[#c4b49a] text-[#4a3f32] ml-2 shrink-0 uppercase tracking-wider">
                    {ecosystem}
                  </span>
                </div>

                {/* Right: Total nodes, Vulnerability count, Blast status */}
                <div className="flex items-center gap-3 shrink-0">
                  <span className="font-sans text-xs text-[#7a6a55]">
                    {totalNodes} nodes
                  </span>
                  <span
                    className={`font-sans text-xs font-semibold ${
                      vulnerableNodes > 0 ? 'text-amber-700' : 'text-emerald-700'
                    }`}
                  >
                    {vulnerableNodes > 0 ? `${vulnerableNodes} vulnerable` : '0 CVEs'}
                  </span>
                  {blastData && (
                    <span className="font-sans text-xs text-rose-600 font-bold">
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
                  className="absolute top-4 right-4 z-30 px-3.5 py-2 rounded-full bg-[#ede8da] hover:bg-[#e2d9c0] border border-[#c4b49a] text-[#2c2416] font-display text-xs font-semibold shadow-lg backdrop-blur-md flex items-center gap-2 cursor-pointer transition-all"
                  title="Open Security Analysis (F7)"
                >
                  <span className="text-emerald-600">🛡️</span>
                  <span>Security Analysis</span>
                  <span className="text-[10px] text-[#7a6a55] bg-[#e2d9c0] border border-[#c4b49a] px-1.5 py-0.5 rounded-full">F7</span>
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
            className={`${panelWidthClass} shrink-0 h-full bg-[#ede8da] text-[#2c2416] border-l border-[#d4c9b0] flex flex-col overflow-hidden shadow-xl z-30 transition-all duration-300 ease-out`}
            initial={{ x: 420, opacity: 0 }}
            animate={{ x: 0,   opacity: 1 }}
            exit={{ x: 420,    opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 32 }}
          >
            {/* Dashboard Top Header */}
            <div className="px-4 py-3 border-b border-[#d4c9b0] flex items-center justify-between shrink-0 select-none bg-[#ede8da]">
              <div className="flex items-center gap-2">
                <span className="font-heading text-xs font-bold text-[#2c2416] tracking-widest uppercase">
                  SECURITY ANALYSIS
                </span>
                <span className="font-sans text-[11px] text-[#7a6a55] tabular-nums">
                  {time}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                {/* Expand / Shrink toggle button */}
                <button
                  type="button"
                  onClick={() => setPanelWidthMode(prev => prev === 'expanded' ? 'standard' : 'expanded')}
                  className="px-2.5 py-1 rounded-full text-[11px] font-sans font-medium text-[#4a3f32] hover:text-[#2c2416] hover:bg-[#e2d9c0] border border-[#c4b49a] transition-all flex items-center gap-1 cursor-pointer"
                  title={panelWidthMode === 'expanded' ? 'Restore standard width' : 'Expand panel width for spacious view'}
                >
                  <span>{panelWidthMode === 'expanded' ? '⤡' : '⤢'}</span>
                  <span>{panelWidthMode === 'expanded' ? 'Standard' : 'Expand'}</span>
                </button>

                {/* Hide button */}
                <button
                  type="button"
                  onClick={() => setPanelWidthMode('collapsed')}
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[#7a6a55] hover:text-[#2c2416] hover:bg-black/5 transition-colors text-xs cursor-pointer ml-1"
                  title="Hide panel (F7)"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Three tabs: "Blast" | "Mitigation" | "Compare" */}
            <div className="flex border-b border-[#d4c9b0] px-3 pt-2 pb-0 gap-1.5 select-none shrink-0 bg-[#e2d9c0]">
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
                    className={`font-display text-xs px-4 py-2 rounded-t-xl cursor-pointer transition-all flex items-center gap-1.5 ${
                      isActive
                        ? 'bg-[#ede8da] text-[#2c2416] border-t border-x border-[#d4c9b0] font-bold shadow-xs'
                        : 'text-[#7a6a55] hover:text-[#2c2416] hover:bg-[#ede8da]/60 font-medium'
                    }`}
                  >
                    <span className="text-xs">{tab.icon}</span>
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Tab content area */}
            <div className="flex-1 min-h-0 overflow-y-auto bg-[#f5f0e6] text-[#2c2416]">
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
