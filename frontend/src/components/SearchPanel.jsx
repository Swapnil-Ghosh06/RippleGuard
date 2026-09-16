import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGraphStore } from '../store/graphStore';

const ATTACK_SCENARIOS = [
  {
    id: 'lodash',
    package: 'lodash',
    version: '4.17.20',
    ecosystem: 'npm',
    cve: 'CVE-2021-23337',
    label: 'Prototype Pollution',
    downloads: '82M/mo',
    summary: 'Command injection via template engine in lodash. Cascades to 9 downstream packages.',
    tag: 'HIGH 7.2',
    tagColor: 'text-amber-400 bg-amber-400/10 border-amber-400/30',
  },
  {
    id: 'event-stream',
    package: 'event-stream',
    version: '3.3.6',
    ecosystem: 'npm',
    cve: 'CVE-2018-3721',
    label: 'Targeted Wallet Theft',
    downloads: '2.1M/mo',
    summary: 'Flatmap-stream injected by rogue maintainer to harvest Copay Bitcoin wallet keys.',
    tag: 'CRIT 9.8',
    tagColor: 'text-red-400 bg-red-400/10 border-red-400/30',
  },
  {
    id: 'colors',
    package: 'colors',
    version: '1.4.1',
    ecosystem: 'npm',
    cve: 'CVE-2022-23305',
    label: 'Maintainer DoS Sabotage',
    downloads: '20M/mo',
    summary: 'Maintainer published infinite-loop code with zalgo text, breaking thousands of CLIs.',
    tag: 'HIGH 7.5',
    tagColor: 'text-amber-400 bg-amber-400/10 border-amber-400/30',
  },
  {
    id: 'log4j-core',
    package: 'log4j-core',
    version: '2.14.1',
    ecosystem: 'pypi',
    cve: 'CVE-2021-44228',
    label: 'Log4Shell RCE',
    downloads: '15M/mo',
    summary: 'JNDI lookups in log strings execute remote payload code on enterprise servers.',
    tag: 'CRIT 10.0',
    tagColor: 'text-red-400 bg-red-400/10 border-red-400/30',
  },
  {
    id: 'xz',
    package: 'xz',
    version: '5.6.0',
    ecosystem: 'pypi',
    cve: 'CVE-2024-3094',
    label: 'SSH Nation-State Backdoor',
    downloads: '50M/mo',
    summary: 'Multi-year social engineering campaign backdooring OpenSSH authentication.',
    tag: 'CRIT 10.0',
    tagColor: 'text-red-400 bg-red-400/10 border-red-400/30',
  },
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
  const [pkg, setPkg]                 = useState('');
  const [eco, setEco]                 = useState('npm');
  const [isFocused, setIsFocused]     = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const { setView, setGraphData, setBlastData } = useGraphStore();
  const searchContainerRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredAttacks = ATTACK_SCENARIOS.filter(a =>
    !pkg.trim() ||
    a.package.toLowerCase().includes(pkg.toLowerCase()) ||
    a.label.toLowerCase().includes(pkg.toLowerCase()) ||
    a.cve.toLowerCase().includes(pkg.toLowerCase())
  );

  const handleAnalyze = (targetPkg, targetEco) => {
    const query = targetPkg ?? pkg;
    if (!query.trim()) return;

    setGraphData({
      nodes: MOCK_GRAPH.nodes,
      edges: MOCK_GRAPH.edges,
      stats: MOCK_GRAPH.stats,
    });
    setBlastData(null);
    setView('loading');
    setTimeout(() => setView('graph'), 2800);
  };

  const handleSelectScenario = (scenario) => {
    setPkg(scenario.package);
    setEco(scenario.ecosystem);
    setShowDropdown(false);
    handleAnalyze(scenario.package, scenario.ecosystem);
  };

  const handleKeyDown = (e) => {
    if (!showDropdown) {
      if (e.key === 'Enter') handleAnalyze();
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % filteredAttacks.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + filteredAttacks.length) % filteredAttacks.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredAttacks[selectedIndex]) {
        handleSelectScenario(filteredAttacks[selectedIndex]);
      } else {
        handleAnalyze();
      }
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
    }
  };

  return (
    <div className="w-full flex-1 flex flex-col items-center justify-center px-4 py-8 relative">

      {/* Editorial Headline & Kicker (Inspo 4 Nexora style) */}
      <div className="max-w-2xl text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-surface2/60 text-muted text-xs font-mono mb-4 tracking-wider">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span>SOFTWARE SUPPLY CHAIN SECURITY</span>
        </div>

        <h1
          className="text-3xl sm:text-5xl font-black text-text tracking-tight leading-tight uppercase"
          style={{ fontFamily: 'Montserrat, sans-serif' }}
        >
          Simulate the Blast.<br />
          <span className="text-dim font-light normal-case">Before it strikes your stack.</span>
        </h1>

        <p
          className="text-sm text-muted mt-3 max-w-lg mx-auto leading-relaxed font-light"
          style={{ fontFamily: 'Sora, sans-serif' }}
        >
          Inspect full nested dependency trees, model malware injection vectors, and measure cascading blast radius across npm and PyPI topologies.
        </p>
      </div>

      {/* Search Bar Capsule with Autocomplete Popover (Inspo 5) */}
      <div ref={searchContainerRef} className="w-full max-w-xl relative mb-6">
        {/* Floating Capsule Bar */}
        <div
          className={`w-full flex items-center rounded-full px-4 py-2.5 bg-surface2 border transition-all duration-200 shadow-xl ${
            isFocused
              ? 'border-borderGlow ring-1 ring-borderGlow/80 bg-surface3/90'
              : 'border-border hover:border-borderGlow'
          }`}
        >
          {/* Search Icon */}
          <svg className="w-4 h-4 text-muted mr-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>

          {/* Input field */}
          <input
            type="text"
            value={pkg}
            onChange={e => {
              setPkg(e.target.value);
              setShowDropdown(true);
            }}
            onFocus={() => {
              setIsFocused(true);
              setShowDropdown(true);
            }}
            onBlur={() => setIsFocused(false)}
            onKeyDown={handleKeyDown}
            placeholder="Search package (e.g. lodash, express, react)..."
            className="flex-1 bg-transparent font-mono text-sm text-text placeholder:text-muted outline-none min-w-0"
            spellCheck={false}
            autoComplete="off"
          />

          {/* Ecosystem Segment Switcher */}
          <div className="flex items-center bg-void/80 border border-border rounded-full p-0.5 ml-2 shrink-0">
            {['npm', 'pypi'].map(e => (
              <button
                key={e}
                type="button"
                onClick={() => setEco(e)}
                className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-medium transition-all ${
                  eco === e
                    ? 'bg-surface3 text-text font-bold shadow-sm'
                    : 'text-muted hover:text-dim'
                }`}
              >
                {e}
              </button>
            ))}
          </div>

          {/* Clean Action Button */}
          <button
            type="button"
            onClick={() => handleAnalyze()}
            className="ml-2.5 px-4 py-1.5 rounded-full bg-text hover:bg-white text-void text-xs font-semibold font-sans tracking-wide transition-all shrink-0 cursor-pointer shadow-sm"
          >
            Analyze
          </button>
        </div>

        {/* Floating Dropdown Autocomplete Popover (Inspo 5) */}
        <AnimatePresence>
          {showDropdown && filteredAttacks.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.98 }}
              transition={{ duration: 0.15 }}
              className="absolute left-0 right-0 top-full mt-2 rounded-2xl bg-surface2 border border-border shadow-2xl p-2 z-50 backdrop-blur-xl overflow-hidden"
            >
              <div className="px-3 py-1.5 border-b border-border/60 flex items-center justify-between text-[10px] font-mono text-muted uppercase tracking-wider">
                <span>Recommended Attack Scenarios</span>
                <span>↑↓ to select · ↵ to run</span>
              </div>

              <div className="flex flex-col gap-1 max-h-60 overflow-y-auto mt-1 pr-1">
                {filteredAttacks.map((scenario, i) => {
                  const isSelected = i === selectedIndex;
                  return (
                    <div
                      key={scenario.id}
                      onClick={() => handleSelectScenario(scenario)}
                      onMouseEnter={() => setSelectedIndex(i)}
                      className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-surface3 text-text'
                          : 'hover:bg-surface text-dim'
                      }`}
                    >
                      <div className="min-w-0 flex-1 pr-3">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-mono text-xs font-semibold text-text truncate">
                            {scenario.package}@{scenario.version}
                          </span>
                          <span className="font-mono text-[10px] text-muted border border-border px-1 rounded">
                            {scenario.ecosystem}
                          </span>
                          <span className="font-mono text-[10px] text-muted">
                            {scenario.cve}
                          </span>
                        </div>
                        <p className="text-xs text-dim truncate font-sans">
                          {scenario.summary}
                        </p>
                      </div>

                      <div className="shrink-0 flex items-center gap-2">
                        <span className={`font-mono text-[10px] px-2 py-0.5 rounded-full font-bold border ${scenario.tagColor}`}>
                          {scenario.tag}
                        </span>
                        <span className="text-muted font-mono text-xs">↗</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Preset Quick-Attack Chips (Replaces clunky open boxes) */}
      <div className="flex flex-wrap items-center justify-center gap-2 max-w-xl">
        <span className="font-mono text-xs text-muted mr-1">Replay:</span>
        {ATTACK_SCENARIOS.map(a => (
          <button
            key={a.id}
            type="button"
            onClick={() => handleSelectScenario(a)}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface2 hover:bg-surface3 border border-border hover:border-borderGlow text-dim hover:text-text font-mono text-xs transition-all duration-150 cursor-pointer shadow-sm"
          >
            <span className="text-text font-medium">{a.package}</span>
            <span className="text-muted text-[10px]">({a.label})</span>
          </button>
        ))}
      </div>

      {/* Clean Trust Indicators at Bottom (Inspo 4) */}
      <div className="mt-12 flex items-center gap-6 font-mono text-xs text-muted">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span>Real-time OSV Vulnerability Feed</span>
        </div>
        <span>·</span>
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
          <span>npm & PyPI Graph Resolvers</span>
        </div>
      </div>

    </div>
  );
}
