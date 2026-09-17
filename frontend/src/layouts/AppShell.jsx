import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGraphStore } from '../store/graphStore';

export default function AppShell({ children }) {
  const { reset, setView, view, graphData, blastData } = useGraphStore();
  const [showHelp, setShowHelp] = useState(false);

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

        {/* Right — Stats & Actions */}
        <div className="flex items-center gap-3">
          {graphData && view === 'graph' && (
            <div className="hidden sm:flex items-center gap-3 text-xs text-muted font-sans mr-1">
              <span>{nodes.length} packages</span>
              <span className="text-border">·</span>
              <span>{edges.length} links</span>
              <span className="text-border">·</span>
              <span className={vulnNodes > 0 ? 'text-danger font-medium' : 'text-safe'}>
                {vulnNodes} vulnerable
              </span>
            </div>
          )}

          {/* "?" Help Guide Trigger Button */}
          <button
            type="button"
            onClick={() => setShowHelp(true)}
            title="What is RippleGuard? (Guide)"
            className="w-7 h-7 rounded-lg border border-border bg-surface2 hover:border-borderGlow hover:bg-surface3 flex items-center justify-center text-muted hover:text-text transition-all font-mono text-xs font-bold cursor-pointer"
          >
            ?
          </button>

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

      {/* Full-Screen "What is RippleGuard?" Help Guide Modal Overlay */}
      <AnimatePresence>
        {showHelp && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[100] bg-void/95 backdrop-blur-xl flex flex-col overflow-y-auto"
          >
            {/* Fixed Close Button */}
            <button
              type="button"
              onClick={() => setShowHelp(false)}
              className="fixed top-5 right-6 sm:right-10 z-[110] font-mono text-dim hover:text-text w-10 h-10 rounded-xl border border-border hover:border-borderGlow bg-surface2 flex items-center justify-center cursor-pointer shadow-sm transition-all text-sm"
            >
              ✕
            </button>

            {/* Centered Content Container */}
            <div className="max-w-3xl w-full mx-auto px-8 py-16 text-left">
              {/* HEADLINE section */}
              <div>
                <p className="font-mono text-[10px] text-muted tracking-widest uppercase mb-4">
                  GETTING STARTED
                </p>
                <h1 className="font-serif font-black text-4xl text-text mb-4">
                  What is RippleGuard?
                </h1>
                <p className="font-sans text-base text-dim leading-relaxed max-w-xl">
                  A supply chain compromise simulator. Not a vulnerability scanner — a blast radius engine. You tell us a package. We show you the explosion.
                </p>
              </div>

              {/* STEPS section (mt-12) */}
              <div className="mt-12 flex flex-col">
                {/* Step 1 */}
                <div className="flex gap-6 mb-10 relative">
                  <div className="flex flex-col items-center">
                    <div className="w-10 h-10 rounded-full border border-border bg-surface2 flex items-center justify-center font-mono text-sm font-bold text-accent shrink-0">
                      01
                    </div>
                    <div className="w-px flex-1 bg-border/60 my-2" />
                  </div>
                  <div className="flex-1 pb-4">
                    <h3 className="font-sans font-semibold text-base text-text mb-1.5">
                      Search a Package
                    </h3>
                    <p className="font-sans text-sm text-muted leading-relaxed mb-3">
                      Type any npm or PyPI package name in the search bar. Try <code className="font-mono text-xs bg-surface3 px-1.5 py-0.5 rounded text-text">lodash</code>, <code className="font-mono text-xs bg-surface3 px-1.5 py-0.5 rounded text-text">express</code>, or <code className="font-mono text-xs bg-surface3 px-1.5 py-0.5 rounded text-text">react</code>. Or click one of the attack replay chips to load a famous real-world attack.
                    </p>
                    {/* Fake search bar mockup */}
                    <div className="rounded-xl border border-border/60 bg-surface2/60 px-4 py-3 font-mono text-sm text-muted flex items-center gap-2">
                      <svg className="w-4 h-4 text-muted shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <circle cx="11" cy="11" r="8" />
                        <path d="M21 21l-4.35-4.35" />
                      </svg>
                      <span className="text-text font-bold">lodash</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-surface3 border border-border text-muted ml-1">npm</span>
                      <span className="ml-auto bg-text text-white px-3 py-1 rounded-full text-xs font-sans font-medium">
                        Analyze ↵
                      </span>
                    </div>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="flex gap-6 mb-10 relative">
                  <div className="flex flex-col items-center">
                    <div className="w-10 h-10 rounded-full border border-border bg-surface2 flex items-center justify-center font-mono text-sm font-bold text-accent shrink-0">
                      02
                    </div>
                    <div className="w-px flex-1 bg-border/60 my-2" />
                  </div>
                  <div className="flex-1 pb-4">
                    <h3 className="font-sans font-semibold text-base text-text mb-1.5">
                      Explore the Dependency Graph
                    </h3>
                    <p className="font-sans text-sm text-muted leading-relaxed mb-3">
                      RippleGuard builds a live dependency graph using Google&apos;s deps.dev API. Every node is a real package. Color coding: 🔴 CRITICAL CVE · 🟡 HIGH/MEDIUM CVE · 🟢 No known CVEs · ⚡ Compromised (after simulation).
                    </p>
                    {/* Legend row */}
                    <div className="flex gap-4 flex-wrap mt-3">
                      <div className="flex items-center gap-2 font-mono text-[11px] text-muted">
                        <span className="w-3 h-3 rounded-full bg-danger inline-block" />
                        <span>CRITICAL CVE</span>
                      </div>
                      <div className="flex items-center gap-2 font-mono text-[11px] text-muted">
                        <span className="w-3 h-3 rounded-full bg-warn inline-block" />
                        <span>HIGH/MEDIUM CVE</span>
                      </div>
                      <div className="flex items-center gap-2 font-mono text-[11px] text-muted">
                        <span className="w-3 h-3 rounded-full bg-safe inline-block" />
                        <span>No known CVEs</span>
                      </div>
                      <div className="flex items-center gap-2 font-mono text-[11px] text-muted">
                        <span className="w-3 h-3 rounded-full bg-amber-400 inline-block" />
                        <span>Compromised</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="flex gap-6 mb-10 relative">
                  <div className="flex flex-col items-center">
                    <div className="w-10 h-10 rounded-full border border-border bg-surface2 flex items-center justify-center font-mono text-sm font-bold text-accent shrink-0">
                      03
                    </div>
                    <div className="w-px flex-1 bg-border/60 my-2" />
                  </div>
                  <div className="flex-1 pb-4">
                    <h3 className="font-sans font-semibold text-base text-text mb-1.5">
                      Inject a Compromise
                    </h3>
                    <p className="font-sans text-sm text-muted leading-relaxed">
                      Click any node in the graph to select it. Then click the red &apos;Inject Compromise&apos; button at the bottom of the graph canvas. The blast propagates in real time — watch the cascade spread node by node.
                    </p>
                  </div>
                </div>

                {/* Step 4 */}
                <div className="flex gap-6 mb-10 relative">
                  <div className="flex flex-col items-center">
                    <div className="w-10 h-10 rounded-full border border-border bg-surface2 flex items-center justify-center font-mono text-sm font-bold text-accent shrink-0">
                      04
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-sans font-semibold text-base text-text mb-1.5">
                      Read the Blast Report
                    </h3>
                    <p className="font-sans text-sm text-muted leading-relaxed">
                      The right panel shows your Blast Radius Score (0–100), affected package counts, monthly download exposure, and a prioritized list of fixes ranked by how much blast radius each upgrade eliminates.
                    </p>
                  </div>
                </div>
              </div>

              {/* BOTTOM section (mt-12) */}
              <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-surface2/60 border border-border rounded-2xl p-6">
                  <h4 className="font-sans font-semibold text-sm text-text mb-2">
                    Why this matters
                  </h4>
                  <p className="font-sans text-xs text-muted leading-relaxed">
                    The average supply chain breach costs $4.88M (IBM 2024). Log4Shell affected 3 billion devices from one library. RippleGuard lets you see the blast radius before the attacker does.
                  </p>
                </div>

                <div className="bg-surface2/60 border border-border rounded-2xl p-6">
                  <h4 className="font-sans font-semibold text-sm text-text mb-2">
                    Data sources
                  </h4>
                  <p className="font-sans text-xs text-muted leading-relaxed">
                    npm Registry · PyPI API · Google deps.dev · Google OSV.dev · All free. All live. Zero API keys.
                  </p>
                </div>
              </div>

              {/* Big CTA button */}
              <button
                type="button"
                onClick={() => setShowHelp(false)}
                className="rounded-2xl bg-accent/10 hover:bg-accent/20 border border-accent/30 text-accent font-mono text-sm px-8 py-4 w-full text-center mt-10 cursor-pointer transition-all duration-200 block font-semibold"
              >
                Start Analyzing →
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
