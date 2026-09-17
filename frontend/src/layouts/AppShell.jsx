import { useGraphStore } from '../store/graphStore';

export default function AppShell({ children }) {
  const { reset, setView, view, graphData, blastData } = useGraphStore();

  function handleNewAnalysis() {
    reset();
    setView('idle');
  }

  // Minimalist status map with soft tones
  const statusMap = {
    idle: {
      label: 'System Ready',
      color: '#787571',
      bg: '#fcfbf9',
      border: '#e7e5e0',
      dotColor: '#a8a29e',
    },
    loading: {
      label: 'Analyzing Topology…',
      color: '#d97706',
      bg: '#fffbeb',
      border: '#fde68a',
      dotColor: '#d97706',
      pulse: true,
    },
    graph: blastData
      ? {
          label: `Breach Active (${blastData.blast_score}/100)`,
          color: '#e11d48',
          bg: '#fff1f2',
          border: '#fecdd3',
          dotColor: '#e11d48',
          pulse: true,
        }
      : {
          label: 'Topology Mapped',
          color: '#059669',
          bg: '#ecfdf5',
          border: '#a7f3d0',
          dotColor: '#059669',
        },
  };

  const status = statusMap[view] ?? statusMap.idle;

  const nodes = graphData?.nodes ?? graphData?.graph?.nodes ?? [];
  const edges = graphData?.edges ?? graphData?.graph?.edges ?? [];
  const vulnNodes = nodes.filter(n => (n.vulnerabilities || []).length > 0).length;

  return (
    <div className="min-h-screen bg-white text-text flex flex-col selection:bg-yellow-100 selection:text-black">
      {/* Editorial Minimalist Header */}
      <header className="h-[56px] flex items-center justify-between px-6 sm:px-10 shrink-0 fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-border">
        {/* Left — Elegant Brand & Status */}
        <div className="flex items-center gap-4">
          <div
            onClick={handleNewAnalysis}
            className="flex items-center gap-2.5 cursor-pointer group select-none"
          >
            {/* Minimal Monoline Shield */}
            <div className="w-7 h-7 rounded-full border border-border flex items-center justify-center group-hover:border-text transition-colors">
              <svg className="w-3.5 h-3.5 text-text" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>

            {/* Editorial Wordmark */}
            <div className="flex items-baseline gap-1.5">
              <span className="font-serif font-normal text-lg tracking-tight text-text">
                Ripple<span className="italic font-light text-muted">guard</span>
              </span>
            </div>
          </div>

          <span className="text-border text-sm">/</span>

          {/* Minimalist Status Pill */}
          <div
            className="inline-flex items-center gap-2 text-xs px-2.5 py-1 rounded-full border transition-all duration-200 select-none"
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
            <span className="font-medium tracking-tight font-sans">
              {status.label}
            </span>
          </div>
        </div>

        {/* Right — Stats & New Analysis button */}
        <div className="flex items-center gap-4">
          {graphData && view === 'graph' && (
            <div className="hidden sm:flex items-center gap-3 text-xs text-muted font-sans">
              <span>{nodes.length} packages</span>
              <span className="text-border">·</span>
              <span>{edges.length} links</span>
              <span className="text-border">·</span>
              <span className={vulnNodes > 0 ? 'text-danger font-medium' : 'text-safe'}>
                {vulnNodes} vulnerable
              </span>
            </div>
          )}

          {view !== 'idle' && (
            <button
              onClick={handleNewAnalysis}
              className="text-xs font-sans font-medium text-text hover:text-black bg-white hover:bg-surface2 border border-border hover:border-text px-3.5 py-1.5 rounded-full transition-all duration-150 cursor-pointer flex items-center gap-1.5 shadow-sm"
            >
              <span>←</span>
              <span>New Search</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 pt-[56px] flex flex-col relative">
        {children}
      </main>
    </div>
  );
}
