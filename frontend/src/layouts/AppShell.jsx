import { useGraphStore } from '../store/graphStore';

export default function AppShell({ children }) {
  const { reset, setView, view, graphData, blastData } = useGraphStore();

  function handleNewAnalysis() {
    reset();
    setView('idle');
  }

  // Dynamic system status pill
  const statusMap = {
    idle: {
      label: 'SYSTEM IDLE',
      color: '#71717A',
      dotColor: '#A1A1AA',
      bg: 'rgba(113, 113, 122, 0.1)',
      border: 'rgba(113, 113, 122, 0.25)',
    },
    loading: {
      label: 'SCANNING CVE & GRAPH',
      color: '#F59E0B',
      dotColor: '#F59E0B',
      bg: 'rgba(245, 158, 11, 0.12)',
      border: 'rgba(245, 158, 11, 0.3)',
      pulse: true,
    },
    graph: blastData
      ? {
          label: `THREAT BREACH ACTIVE (${blastData.blast_score}/100)`,
          color: '#EF4444',
          dotColor: '#EF4444',
          bg: 'rgba(239, 68, 68, 0.15)',
          border: 'rgba(239, 68, 68, 0.4)',
          pulse: true,
        }
      : {
          label: 'DEPENDENCY TOPOLOGY READY',
          color: '#10B981',
          dotColor: '#10B981',
          bg: 'rgba(16, 185, 129, 0.12)',
          border: 'rgba(16, 185, 129, 0.3)',
        },
  };

  const status = statusMap[view] ?? statusMap.idle;

  const nodes = graphData?.nodes ?? graphData?.graph?.nodes ?? [];
  const edges = graphData?.edges ?? graphData?.graph?.edges ?? [];
  const vulnNodes = nodes.filter(n => (n.vulnerabilities || []).length > 0).length;

  return (
    <div className="min-h-screen bg-void text-text flex flex-col selection:bg-accent/30 selection:text-white">
      {/* Top Navbar Header */}
      <header className="h-14 flex items-center justify-between px-6 shrink-0 fixed top-0 left-0 right-0 z-50 bg-surface/90 backdrop-blur-md border-b border-border">
        {/* Left — Logo & Status Pill */}
        <div className="flex items-center gap-4">
          <div
            onClick={handleNewAnalysis}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            {/* Cyber Shield Icon */}
            <div className="w-7 h-7 rounded-md bg-surface2 border border-border group-hover:border-accent/50 flex items-center justify-center transition-colors duration-200">
              <svg className="w-4 h-4 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <path d="M12 8v4" />
                <path d="M12 16h.01" />
              </svg>
            </div>

            <div className="flex items-baseline gap-1.5">
              <span
                className="text-base tracking-wider text-text font-black uppercase"
                style={{ fontFamily: 'Montserrat, sans-serif' }}
              >
                Ripple<span className="text-accent">Guard</span>
              </span>
              <span className="font-mono text-[10px] text-muted tracking-tight border border-border px-1 rounded">
                v1.0
              </span>
            </div>
          </div>

          <div className="h-4 w-px bg-border mx-1" />

          {/* Status pill with animated dot */}
          <div
            className="inline-flex items-center gap-2 font-mono text-xs px-2.5 py-1 rounded-full border transition-all duration-200"
            style={{
              color: status.color,
              backgroundColor: status.bg,
              borderColor: status.border,
            }}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${status.pulse ? 'animate-ping' : ''}`}
              style={{ backgroundColor: status.dotColor }}
            />
            <span className="font-medium tracking-wide text-[11px]">
              {status.label}
            </span>
          </div>
        </div>

        {/* Right — Metadata & Actions */}
        <div className="flex items-center gap-5">
          {graphData && view === 'graph' && (
            <div className="hidden sm:flex items-center gap-3 font-mono text-xs text-muted">
              <span className="text-dim">{nodes.length} <span className="text-muted">nodes</span></span>
              <span>·</span>
              <span className="text-dim">{edges.length} <span className="text-muted">edges</span></span>
              <span>·</span>
              <span className={vulnNodes > 0 ? 'text-warn font-semibold' : 'text-safe'}>
                {vulnNodes} vulnerable
              </span>
            </div>
          )}

          {view !== 'idle' && (
            <button
              onClick={handleNewAnalysis}
              className="flex items-center gap-1.5 font-mono text-xs text-dim hover:text-text border border-border hover:border-borderGlow bg-surface2 px-3 py-1.5 rounded-md transition-all duration-150"
            >
              <span>←</span>
              <span>New Analysis</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 pt-14 flex flex-col relative">
        {children}
      </main>
    </div>
  );
}
