import { useState, useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { useGraphStore } from '../store/graphStore';

gsap.registerPlugin(useGSAP);

const FAMOUS_ATTACKS = [
  { label: 'Log4Shell',    package: 'log4j-core',    ecosystem: 'npm'  },
  { label: 'Event-Stream', package: 'event-stream',  ecosystem: 'npm'  },
  { label: 'XZ Utils',     package: 'xz',            ecosystem: 'pypi' },
];

const MOCK_GRAPH = {
  nodes: [
    { id: 'lodash@4.17.20',   name: 'lodash',     version: '4.17.20', ecosystem: 'npm', depth: 0, is_root: true,  monthly_downloads: 82000000,  vulnerabilities: [{ id: 'CVE-2021-23337',  severity: 'HIGH',   cvss_score: 7.2, summary: 'Command injection via template' }] },
    { id: 'express@4.18.1',   name: 'express',    version: '4.18.1',  ecosystem: 'npm', depth: 1, is_root: false, monthly_downloads: 31000000,  vulnerabilities: [] },
    { id: 'react@18.2.0',     name: 'react',      version: '18.2.0',  ecosystem: 'npm', depth: 1, is_root: false, monthly_downloads: 22000000,  vulnerabilities: [] },
    { id: 'next@13.4.0',      name: 'next',       version: '13.4.0',  ecosystem: 'npm', depth: 2, is_root: false, monthly_downloads: 6800000,   vulnerabilities: [{ id: 'CVE-2024-34351',  severity: 'HIGH',   cvss_score: 7.5, summary: 'Host header injection' }] },
    { id: 'webpack@5.88.0',   name: 'webpack',    version: '5.88.0',  ecosystem: 'npm', depth: 2, is_root: false, monthly_downloads: 24000000,  vulnerabilities: [] },
    { id: 'axios@1.4.0',      name: 'axios',      version: '1.4.0',   ecosystem: 'npm', depth: 2, is_root: false, monthly_downloads: 44000000,  vulnerabilities: [] },
    { id: 'chalk@5.3.0',      name: 'chalk',      version: '5.3.0',   ecosystem: 'npm', depth: 3, is_root: false, monthly_downloads: 38000000,  vulnerabilities: [] },
    { id: 'semver@7.5.4',     name: 'semver',     version: '7.5.4',   ecosystem: 'npm', depth: 3, is_root: false, monthly_downloads: 52000000,  vulnerabilities: [{ id: 'CVE-2022-25883', severity: 'MEDIUM', cvss_score: 5.3, summary: 'ReDoS in comparator' }] },
    { id: 'minimatch@3.0.4',  name: 'minimatch',  version: '3.0.4',   ecosystem: 'npm', depth: 3, is_root: false, monthly_downloads: 41000000,  vulnerabilities: [{ id: 'CVE-2022-3517',  severity: 'HIGH',   cvss_score: 7.5, summary: 'ReDoS vulnerability' }] },
    { id: 'ms@2.1.3',         name: 'ms',         version: '2.1.3',   ecosystem: 'npm', depth: 3, is_root: false, monthly_downloads: 78000000,  vulnerabilities: [] },
  ],
  edges: [
    { source: 'lodash@4.17.20',  target: 'express@4.18.1'  },
    { source: 'lodash@4.17.20',  target: 'react@18.2.0'    },
    { source: 'express@4.18.1',  target: 'next@13.4.0'     },
    { source: 'react@18.2.0',    target: 'next@13.4.0'     },
    { source: 'lodash@4.17.20',  target: 'webpack@5.88.0'  },
    { source: 'express@4.18.1',  target: 'axios@1.4.0'     },
    { source: 'next@13.4.0',     target: 'chalk@5.3.0'     },
    { source: 'webpack@5.88.0',  target: 'semver@7.5.4'    },
    { source: 'webpack@5.88.0',  target: 'minimatch@3.0.4' },
    { source: 'express@4.18.1',  target: 'ms@2.1.3'        },
  ],
  stats: { total_nodes: 10, total_edges: 10, vulnerable_nodes: 4 },
};

export default function SearchPanel() {
  const [pkg, setPkg]       = useState('');
  const [eco, setEco]       = useState('npm');
  const [focused, setFocused] = useState(false);
  const { setView, setGraphData, setBlastData } = useGraphStore();
  const containerRef = useRef(null);

  useGSAP(() => {
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    tl.from('.rg-wordmark', { y: -24, opacity: 0, duration: 0.7 })
      .from('.rg-tagline',  { y: 8,   opacity: 0, duration: 0.5 }, '-=0.3')
      .from('.rg-input',    { y: 16,  opacity: 0, duration: 0.4 }, '-=0.2')
      .from('.rg-eco',      { y: 8,   opacity: 0, duration: 0.3 }, '-=0.2')
      .from('.rg-btn',      { y: 8,   opacity: 0, duration: 0.3 }, '-=0.15')
      .from('.rg-chip',     { y: 6,   opacity: 0, duration: 0.25, stagger: 0.07 }, '-=0.1');
  }, { scope: containerRef });

  const handleAnalyze = (overridePkg, overrideEco) => {
    const p = overridePkg ?? pkg;
    if (!p.trim()) return;
    // Loads mock graph immediately — swap for real API call when backend is ready
    setGraphData({ nodes: MOCK_GRAPH.nodes, edges: MOCK_GRAPH.edges, stats: MOCK_GRAPH.stats });
    setBlastData(null);
    setView('loading');
    setTimeout(() => setView('graph'), 3200);
  };

  const handleChip = (attack) => {
    setPkg(attack.package);
    setEco(attack.ecosystem);
    handleAnalyze(attack.package, attack.ecosystem);
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full flex flex-col items-center justify-center overflow-hidden px-6"
    >
      {/* Scan line */}
      <div className="scanline" />

      {/* Wordmark */}
      <div className="rg-wordmark mb-3 text-center">
        <h1
          className="text-5xl font-black tracking-tight text-text"
          style={{ fontFamily: 'Montserrat, sans-serif', letterSpacing: '-0.01em' }}
        >
          Ripple<span className="text-accent">Guard</span>
        </h1>
      </div>

      {/* Tagline */}
      <p
        className="rg-tagline text-sm text-dim text-center mb-10 max-w-xs leading-relaxed"
        style={{ fontFamily: 'Sora, sans-serif', fontWeight: 300 }}
      >
        See the compromise before it becomes a catastrophe.
      </p>

      {/* Input */}
      <div
        className={`rg-input w-full max-w-md flex items-center border rounded-sm px-4 py-3 mb-3 transition-colors duration-200 ${
          focused ? 'border-accent' : 'border-border'
        } bg-surface`}
      >
        <span className="font-mono text-accent text-sm mr-3 select-none">›</span>
        <input
          type="text"
          value={pkg}
          onChange={e => setPkg(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={e => e.key === 'Enter' && handleAnalyze()}
          placeholder="lodash, requests, express…"
          className="flex-1 bg-transparent font-mono text-sm text-text placeholder:text-muted outline-none"
          spellCheck={false}
          autoComplete="off"
        />
        {focused && <span className="cursor-blink" />}
      </div>

      {/* Ecosystem toggle */}
      <div className="rg-eco flex gap-1 mb-4">
        {['npm', 'pypi'].map(e => (
          <button
            key={e}
            onClick={() => setEco(e)}
            className={`px-4 py-1.5 text-xs rounded-sm border transition-colors duration-150 ${
              eco === e
                ? 'border-accent bg-surface text-text'
                : 'border-border text-muted hover:text-dim'
            }`}
            style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 600 }}
          >
            {e}
          </button>
        ))}
      </div>

      {/* Analyze button */}
      <button
        onClick={() => handleAnalyze()}
        className="rg-btn w-full max-w-md py-3 bg-accent hover:bg-accentHover text-void text-sm font-semibold rounded-sm transition-colors duration-200 mb-8"
        style={{ fontFamily: 'DM Sans, sans-serif' }}
      >
        Analyze Dependency Graph
      </button>

      {/* Attack chips */}
      <div className="flex flex-col items-center gap-2">
        <p className="font-mono text-muted text-xs tracking-widest mb-1">REPLAY A REAL ATTACK</p>
        <div className="flex gap-2">
          {FAMOUS_ATTACKS.map(a => (
            <button
              key={a.label}
              onClick={() => handleChip(a)}
              className="rg-chip font-mono text-xs px-3 py-1.5 border border-border text-dim hover:text-text hover:border-dim rounded-sm transition-colors duration-150"
            >
              {a.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
