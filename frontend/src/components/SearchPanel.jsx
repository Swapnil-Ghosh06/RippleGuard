import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGraphStore } from '../store/graphStore';
import TopologyField from '@/components/ui/topology-field';

const ATTACK_SCENARIOS = [
  {
    id: 'lodash',
    package: 'lodash',
    version: '4.17.20',
    ecosystem: 'npm',
    cve: 'CVE-2021-23337',
    label: 'Prototype Pollution',
    downloads: '82M/mo',
    summary: 'Command injection via template engine in lodash. Cascades across downstream dependencies.',
    tag: 'HIGH 7.2',
    tagColor: 'text-amber-400 bg-amber-400/10 border-amber-400/30',
  },
  {
    id: 'event-stream',
    package: 'event-stream',
    version: '3.3.6',
    ecosystem: 'npm',
    cve: 'CVE-2018-3721',
    label: 'Wallet Theft Trojan',
    downloads: '2.1M/mo',
    summary: 'Flatmap-stream injected by rogue maintainer to steal Copay Bitcoin wallet private keys.',
    tag: 'CRIT 9.8',
    tagColor: 'text-red-400 bg-red-400/10 border-red-400/30',
  },
  {
    id: 'colors',
    package: 'colors',
    version: '1.4.1',
    ecosystem: 'npm',
    cve: 'CVE-2022-23305',
    label: 'Maintainer Sabotage',
    downloads: '20M/mo',
    summary: 'Maintainer published infinite-loop code printing zalgo text in protest, breaking builds.',
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
    summary: 'JNDI lookup parser triggers remote shell payload execution across backend infrastructure.',
    tag: 'CRIT 10.0',
    tagColor: 'text-red-400 bg-red-400/10 border-red-400/30',
  },
  {
    id: 'xz',
    package: 'xz',
    version: '5.6.0',
    ecosystem: 'pypi',
    cve: 'CVE-2024-3094',
    label: 'SSH Backdoor',
    downloads: '50M/mo',
    summary: 'Multi-year targeted supply chain campaign injecting unauthorized OpenSSH auth bypass.',
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
    <div className="relative w-full h-[calc(100vh-56px)] flex flex-col justify-between overflow-hidden bg-void">
      {/* 3D Topology Field Background (Interactive WebGL Sphere) */}
      <div className="absolute inset-0 w-full h-full z-0 opacity-60 pointer-events-none">
        <TopologyField />
      </div>

      {/* Subtle top & bottom vignette to blend 3D canvas seamlessly */}
      <div className="absolute inset-0 pointer-events-none z-10 bg-gradient-to-t from-void via-transparent to-void/70" />

      {/* Main Content Area — Spacious, Breathable, Refined */}
      <div className="relative z-20 w-full max-w-4xl mx-auto px-6 pt-16 md:pt-24 flex flex-col items-center text-center">

        {/* Top Status Pill */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full border border-white/10 bg-surface/80 text-muted text-xs font-mono mb-6 backdrop-blur-md"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span className="text-zinc-300">SUPPLY CHAIN SECURITY INTELLIGENCE</span>
          <span className="text-zinc-600">·</span>
          <span className="text-zinc-400">OSV GRAPH ENGINE</span>
        </motion.div>

        {/* Editorial Headline with Generous Breathing Space */}
        <motion.h1
          initial={{ opacity: 0, y: -14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.05 }}
          className="text-4xl sm:text-6xl font-black text-text tracking-tight leading-tight uppercase mb-4"
          style={{ fontFamily: 'Montserrat, sans-serif' }}
        >
          Simulate the Blast.<br />
          <span className="text-zinc-400 font-light normal-case">Before it strikes your stack.</span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-sm sm:text-base text-zinc-400 max-w-xl mx-auto leading-relaxed font-light mb-10"
          style={{ fontFamily: 'Sora, sans-serif' }}
        >
          Model malicious injection, prototype pollution, and rogue packages across deep transitive dependency trees in real-time.
        </motion.p>

        {/* Floating Capsule Search Bar with Autocomplete (Inspo 5) */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          ref={searchContainerRef}
          className="w-full max-w-xl relative mb-8"
        >
          <div
            className={`w-full flex items-center rounded-full px-5 py-3.5 bg-surface/90 border transition-all duration-200 shadow-2xl backdrop-blur-xl ${
              isFocused
                ? 'border-white/30 ring-1 ring-white/20 bg-surface2/90'
                : 'border-white/15 hover:border-white/25'
            }`}
          >
            {/* Search Icon */}
            <svg className="w-4 h-4 text-zinc-400 mr-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
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
              className="flex-1 bg-transparent font-mono text-sm text-text placeholder:text-zinc-500 outline-none min-w-0"
              spellCheck={false}
              autoComplete="off"
            />

            {/* Ecosystem Toggle */}
            <div className="flex items-center bg-void/90 border border-white/10 rounded-full p-0.5 ml-2 shrink-0">
              {['npm', 'pypi'].map(e => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setEco(e)}
                  className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-medium transition-all cursor-pointer ${
                    eco === e
                      ? 'bg-surface3 text-text font-bold shadow-sm'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>

            {/* Analyze Button */}
            <button
              type="button"
              onClick={() => handleAnalyze()}
              className="ml-3 px-4 py-1.5 rounded-full bg-text hover:bg-white text-void text-xs font-semibold font-sans tracking-wide transition-all shrink-0 cursor-pointer shadow-md"
            >
              Analyze ↵
            </button>
          </div>

          {/* Autocomplete Dropdown Popover */}
          <AnimatePresence>
            {showDropdown && filteredAttacks.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 4, scale: 0.98 }}
                transition={{ duration: 0.15 }}
                className="absolute left-0 right-0 top-full mt-2 rounded-2xl bg-surface/95 border border-white/10 shadow-2xl p-2 z-50 backdrop-blur-2xl overflow-hidden text-left"
              >
                <div className="px-3 py-1.5 border-b border-border/60 flex items-center justify-between text-[10px] font-mono text-muted uppercase tracking-wider">
                  <span>Simulated Attack Topologies</span>
                  <span>↑↓ select · ↵ analyze</span>
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
                            : 'hover:bg-surface2/60 text-zinc-300'
                        }`}
                      >
                        <div className="min-w-0 flex-1 pr-3">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="font-mono text-xs font-semibold text-text truncate">
                              {scenario.package}@{scenario.version}
                            </span>
                            <span className="font-mono text-[10px] text-zinc-500 border border-border px-1 rounded">
                              {scenario.ecosystem}
                            </span>
                            <span className="font-mono text-[10px] text-zinc-400">
                              {scenario.cve}
                            </span>
                          </div>
                          <p className="text-xs text-zinc-400 truncate font-sans">
                            {scenario.summary}
                          </p>
                        </div>

                        <div className="shrink-0 flex items-center gap-2">
                          <span className={`font-mono text-[10px] px-2 py-0.5 rounded-full font-bold border ${scenario.tagColor}`}>
                            {scenario.tag}
                          </span>
                          <span className="text-zinc-500 font-mono text-xs">↗</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Quick Attack Replay Chips with Generous Margin */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="flex flex-wrap items-center justify-center gap-2 max-w-2xl"
        >
          <span className="font-mono text-xs text-zinc-500 mr-1">Replay Attack:</span>
          {ATTACK_SCENARIOS.map(a => (
            <button
              key={a.id}
              type="button"
              onClick={() => handleSelectScenario(a)}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface/70 hover:bg-surface2 border border-white/10 hover:border-white/25 text-zinc-400 hover:text-zinc-100 font-mono text-xs transition-all cursor-pointer backdrop-blur-md shadow-sm"
            >
              <span className="text-zinc-200 font-medium">{a.package}</span>
              <span className="text-zinc-500 text-[10px]">({a.label})</span>
            </button>
          ))}
        </motion.div>
      </div>

      {/* Clean Footer Bar with Ample Space */}
      <div className="relative z-20 w-full py-6 px-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-xs text-zinc-500 bg-void/60 backdrop-blur-md">
        <div className="flex items-center gap-2 text-zinc-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span>Real-time OSV Vulnerability Feed</span>
        </div>

        <div className="flex items-center gap-6">
          <span>3.2M+ Packages Mapped</span>
          <span>·</span>
          <span>Deterministic Blast Radial</span>
        </div>
      </div>
    </div>
  );
}
