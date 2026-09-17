import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGraphStore } from '../store/graphStore';
import { useAnalyze } from '../hooks/useAnalyze';

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
    pillClass: 'bg-amber-50 text-amber-900 border-amber-200/70 hover:bg-amber-100/70',
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
    pillClass: 'bg-rose-50 text-rose-900 border-rose-200/70 hover:bg-rose-100/70',
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
    pillClass: 'bg-orange-50 text-orange-900 border-orange-200/70 hover:bg-orange-100/70',
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
    pillClass: 'bg-red-50 text-red-900 border-red-200/70 hover:bg-red-100/70',
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
    pillClass: 'bg-rose-50 text-rose-900 border-rose-200/70 hover:bg-rose-100/70',
  },
];

export default function SearchPanel() {
  const [pkg, setPkg]                 = useState('');
  const [eco, setEco]                 = useState('npm');
  const [isFocused, setIsFocused]     = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const { setView, setGraphData, setBlastData, error, setError } = useGraphStore();
  const { analyze } = useAnalyze();
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

  const handleAnalyze = async (targetPkg, targetEco) => {
    const query = (targetPkg ?? pkg).trim();
    const ecosystem = targetEco ?? eco;
    if (!query) return;

    setBlastData(null);
    try {
      await analyze({ packageName: query, ecosystem, depth: 3 });
    } catch {
      // Handled in useAnalyze
    }
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
    <div className="relative w-full h-[calc(100vh-56px)] min-h-[calc(100vh-56px)] flex flex-col justify-between overflow-hidden bg-white">

      {/* Center Main Content Container */}
      <div className="relative z-20 w-full max-w-4xl mx-auto px-6 pt-16 sm:pt-20 flex flex-col items-center text-center">

        {/* Delicate Tag */}
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface2 border border-border text-xs text-muted font-sans mb-6 select-none"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span className="font-medium text-dim">Live Vulnerability Intelligence</span>
          <span className="text-border">·</span>
          <span>OSV & deps.dev</span>
        </motion.div>

        {/* Editorial Headline with Soft Watercolor Highlight */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.05 }}
          className="flex flex-col items-center tracking-tight leading-tight select-none"
        >
          <span className="font-serif italic font-light text-3xl sm:text-5xl text-muted">
            See the
          </span>

          <span className="font-serif font-normal text-6xl sm:text-8xl text-text my-1 tracking-tight">
            <span className="highlight-yellow">Compromise</span>
          </span>

          <span className="font-serif font-normal text-4xl sm:text-6xl text-text">
            before it strikes your stack.
          </span>
        </motion.div>

        {/* Minimal Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mt-6 text-base sm:text-lg text-muted max-w-lg mx-auto font-sans leading-relaxed font-normal"
        >
          Model supply chain attacks across deep transitive dependency trees with real CVE data and deterministic blast radii.
        </motion.p>

        {/* Error notification */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-xl mt-4 px-4 py-2.5 border border-rose-200 bg-rose-50/70 rounded-xl text-center"
          >
            <p className="font-sans text-danger text-xs font-medium">{error}</p>
          </motion.div>
        )}

        {/* Minimalist Search Bar Capsule */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          ref={searchContainerRef}
          className="mt-10 w-full max-w-2xl relative"
        >
          <div
            className={`w-full rounded-full bg-white border p-1.5 flex items-center gap-2 transition-all duration-200 shadow-sm ${
              isFocused
                ? 'border-text shadow-md ring-2 ring-black/5'
                : 'border-border hover:border-borderGlow'
            }`}
          >
            <div className="pl-4 flex items-center gap-3 flex-1 min-w-0">
              {/* Minimal Search Icon */}
              <svg className="w-4 h-4 text-muted shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>

              {/* Search input */}
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
                placeholder="Enter any package (e.g. lodash, express, react)..."
                className="w-full bg-transparent font-sans text-sm sm:text-base text-text placeholder:text-muted/60 outline-none font-normal"
                spellCheck={false}
                autoComplete="off"
              />
            </div>

            {/* Ecosystem toggle */}
            <div className="flex items-center bg-surface2 border border-border rounded-full p-0.5 shrink-0 select-none">
              {['npm', 'pypi'].map(e => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setEco(e)}
                  className={`px-3 py-1 rounded-full text-xs font-sans font-medium transition-all cursor-pointer ${
                    eco === e
                      ? 'bg-white text-text font-semibold shadow-xs'
                      : 'text-muted hover:text-text'
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>

            {/* Elegant Analyze Button */}
            <button
              type="button"
              onClick={() => handleAnalyze()}
              className="bg-text hover:bg-neutral-800 text-white font-sans font-medium text-xs px-5 py-2.5 rounded-full cursor-pointer transition-all shrink-0 select-none shadow-xs"
            >
              Analyze
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
                className="absolute left-0 right-0 top-full mt-2 rounded-2xl bg-white border border-border shadow-xl p-2 z-50 overflow-hidden text-left"
              >
                <div className="px-3 py-1.5 border-b border-border flex items-center justify-between text-[11px] font-sans text-muted font-medium">
                  <span>Historical Attack Scenarios</span>
                  <span>Press enter to run</span>
                </div>

                <div className="flex flex-col gap-1 max-h-64 overflow-y-auto mt-1 p-1">
                  {filteredAttacks.map((scenario, i) => {
                    const isSelected = i === selectedIndex;
                    return (
                      <div
                        key={scenario.id}
                        onClick={() => handleSelectScenario(scenario)}
                        onMouseEnter={() => setSelectedIndex(i)}
                        className={`rounded-xl p-2.5 flex items-center justify-between cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-surface2 text-text'
                            : 'hover:bg-surface2/60 text-dim'
                        }`}
                      >
                        <div className="min-w-0 flex-1 pr-3">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="font-mono text-xs font-semibold text-text truncate">
                              {scenario.package}@{scenario.version}
                            </span>
                            <span className="text-[10px] font-mono text-muted border border-border px-1.5 py-0.2 rounded">
                              {scenario.ecosystem}
                            </span>
                            <span className="text-[11px] font-mono text-muted">
                              {scenario.cve}
                            </span>
                          </div>
                          <p className="text-xs text-muted truncate font-sans">
                            {scenario.summary}
                          </p>
                        </div>

                        <div className="shrink-0 flex items-center gap-2">
                          <span className="font-sans text-[11px] px-2 py-0.5 rounded-full font-medium bg-rose-50 text-rose-800 border border-rose-200/60">
                            {scenario.tag}
                          </span>
                          <span className="text-muted font-sans text-xs">→</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Soft Pastel Attack Scenario Pills */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="mt-6 flex flex-wrap items-center justify-center gap-2 max-w-2xl select-none"
        >
          <span className="text-xs text-muted mr-1 font-sans">
            Replay known compromise:
          </span>
          {ATTACK_SCENARIOS.map(a => (
            <button
              key={a.id}
              type="button"
              onClick={() => handleSelectScenario(a)}
              className={`border text-xs px-3 py-1 rounded-full font-sans font-medium transition-all cursor-pointer flex items-center gap-1.5 ${a.pillClass}`}
            >
              <span className="font-semibold">{a.package}</span>
              <span className="opacity-70 text-[10px]">({a.label})</span>
            </button>
          ))}
        </motion.div>
      </div>

      {/* Minimal Editorial Footer */}
      <div className="relative z-20 w-full py-5 px-8 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted font-sans select-none">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span>Live OSV & deps.dev API Connected</span>
        </div>

        <div className="flex items-center gap-4 text-xs font-normal">
          <span>3.2M+ Packages Mapped</span>
          <span>·</span>
          <span>Deterministic Blast Propagation</span>
          <span>·</span>
          <span>Zero Configuration</span>
        </div>
      </div>
    </div>
  );
}
