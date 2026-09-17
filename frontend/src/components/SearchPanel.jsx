import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGraphStore } from '../store/graphStore';
import { useAnalyze } from '../hooks/useAnalyze';
import SketchHeroIllustration from './SketchHeroIllustration';
import SketchStoryIllustration from './SketchStoryIllustration';

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

  const { setBlastData, error, setError } = useGraphStore();
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
    <div className="relative w-full min-h-[calc(100vh-64px)] flex flex-col justify-between overflow-y-auto bg-[#ffffff]">
      {/* Top Container */}
      <div className="relative z-20 w-full max-w-6xl mx-auto px-6 sm:px-10 pt-10 sm:pt-16 pb-16 flex flex-col">

        {/* ======================================================== */}
        {/* HERO SECTION — 2 COLUMNS (Matching Reference Design)     */}
        {/* ======================================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">

          {/* Left Column: Headline, Subtitle, Capsule Pill Input */}
          <div className="lg:col-span-7 flex flex-col items-start text-left">

            {/* Overline tag */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface2 border border-border text-[11px] font-sans font-medium tracking-wide text-muted mb-6 select-none">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>LIVE BLAST RADIUS ENGINE</span>
              <span className="text-border">·</span>
              <span>deps.dev + OSV</span>
            </div>

            {/* Big Editorial Serif Headline */}
            <h1 className="font-serif font-normal text-5xl sm:text-6xl lg:text-[70px] text-text leading-[1.05] tracking-tight">
              The blast radius of <br />
              <span className="italic font-normal">a single package</span>
            </h1>

            {/* Sub-headline directly mirroring reference aesthetic */}
            <p className="mt-5 text-base sm:text-lg text-muted font-sans leading-relaxed max-w-lg">
              The no-brainer way of mapping exactly what breaks across your dependency tree when a package gets poisoned.
            </p>

            {/* Error banner if any */}
            {error && (
              <div className="w-full max-w-md mt-4 px-4 py-2 border border-rose-200 bg-rose-50/80 rounded-xl">
                <p className="font-sans text-danger text-xs font-medium">{error}</p>
              </div>
            )}

            {/* Capsule Pill Search Bar (Matching Reference Input Shape) */}
            <div
              ref={searchContainerRef}
              className="mt-8 w-full max-w-lg relative"
            >
              <div
                className={`w-full rounded-full bg-white border p-1.5 flex items-center gap-2 transition-all duration-200 shadow-sm ${
                  isFocused
                    ? 'border-text ring-2 ring-black/5 shadow-md'
                    : 'border-stone-300 hover:border-stone-400'
                }`}
              >
                {/* Search icon & input */}
                <div className="pl-4 flex items-center gap-2.5 flex-1 min-w-0">
                  <svg
                    className="w-4 h-4 text-stone-400 shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <circle cx="11" cy="11" r="8" />
                    <path d="M21 21l-4.35-4.35" />
                  </svg>
                  <input
                    id="search-input"
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
                    placeholder="Enter package (e.g. lodash, express)..."
                    className="w-full bg-transparent font-sans text-sm sm:text-base text-text placeholder:text-stone-400 outline-none font-normal"
                    spellCheck={false}
                    autoComplete="off"
                  />
                </div>

                {/* Ecosystem pill switch */}
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

                {/* Solid Black Capsule CTA Button (Matching Reference "Start Trial") */}
                <button
                  type="button"
                  onClick={() => handleAnalyze()}
                  className="bg-text hover:bg-neutral-800 text-white font-sans font-medium text-xs px-6 py-2.5 rounded-full cursor-pointer transition-all shrink-0 select-none shadow-sm"
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
                    className="absolute left-0 right-0 top-full mt-2 rounded-2xl bg-white border border-border shadow-xl p-2 z-50 overflow-hidden text-left"
                  >
                    <div className="px-3 py-1.5 border-b border-border flex items-center justify-between text-[11px] font-sans text-muted font-medium">
                      <span>Historical Attack Scenarios</span>
                      <span>Press enter to run</span>
                    </div>

                    <div className="flex flex-col gap-1 max-h-60 overflow-y-auto mt-1 p-1">
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
                                <span className="font-sans text-xs font-semibold text-text truncate">
                                  {scenario.package}@{scenario.version}
                                </span>
                                <span className="text-[10px] font-sans font-medium text-muted border border-border px-1.5 py-0.5 rounded uppercase">
                                  {scenario.ecosystem}
                                </span>
                                <span className="text-[11px] font-sans text-muted">
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
            </div>

            {/* Attack Replay Chips */}
            <div className="mt-5 flex flex-wrap items-center gap-2 select-none">
              <span className="text-xs text-muted font-sans mr-1">
                Replay Attack:
              </span>

              <button
                type="button"
                onClick={() => handleSelectScenario(ATTACK_SCENARIOS[0])}
                className="bg-danger/10 hover:bg-danger/20 border border-danger/30 text-danger font-sans text-xs px-3.5 py-1.5 rounded-full transition-all cursor-pointer flex items-center mr-1 font-medium"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-danger animate-ping inline-block mr-1.5" />
                <span>Quick Demo ↗</span>
              </button>

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
            </div>

            {/* Hand-Drawn Downward Arrow (Exact match to reference image below input) */}
            <div className="mt-8 pt-2 pl-6 sm:pl-10">
              <svg
                className="w-7 h-14 text-stone-800"
                viewBox="0 0 28 56"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                {/* Wobbly vertical hand-drawn arrow shaft */}
                <path d="M14 2 C13.5 18, 14.8 36, 14 50" />
                {/* Arrowhead wings */}
                <path d="M5 40 C8.5 44, 12 48, 14 51" />
                <path d="M23 40 C19.5 44, 16 48, 14 51" />
              </svg>
            </div>

          </div>

          {/* Right Column: Hand-Drawn Ink Sketch Artwork */}
          <div className="lg:col-span-5 flex justify-center lg:justify-end">
            <SketchHeroIllustration />
          </div>

        </div>

        {/* ======================================================== */}
        {/* STORY SECTION (Matching Bottom Half of Reference Image)   */}
        {/* ======================================================== */}
        <div id="story" className="mt-20 pt-16 border-t border-border/70 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">

          {/* Left Column: Sketch Character + Floating Handwritten Clouds + Clock */}
          <div className="lg:col-span-6 flex justify-center">
            <SketchStoryIllustration />
          </div>

          {/* Right Column: Bold Editorial Narrative */}
          <div className="lg:col-span-6 flex flex-col items-start text-left">
            <h2 className="font-serif font-normal text-3xl sm:text-4xl lg:text-5xl text-text leading-[1.12] tracking-tight">
              As an engineer, you have hundreds of packages you rely on every day, and not enough visibility into what happens when one goes rogue.
            </h2>

            <p className="mt-6 text-base text-muted font-sans leading-relaxed">
              Standard vulnerability scanners give you a raw list of 400 CVE alerts and no idea which one could actually cripple your infrastructure. They alert on package versions, but cannot map reachability, transitive blast paths, or downstream impact.
            </p>

            <p className="mt-4 text-base text-muted font-sans leading-relaxed">
              RippleGuard is a supply chain compromise simulator. Not an alert fatigue engine — a blast radius engine. You pick any package in the tree, inject an attack, and watch the infection cascade across the dependency graph in real time.
            </p>

            {/* Quick Action Button */}
            <div className="mt-8 flex items-center gap-4">
              <button
                type="button"
                onClick={() => {
                  const el = document.getElementById('search-input');
                  if (el) {
                    el.scrollIntoView({ behavior: 'smooth' });
                    el.focus();
                  }
                }}
                className="bg-text text-white font-sans font-medium text-xs px-6 py-3 rounded-full hover:bg-neutral-800 transition-all cursor-pointer shadow-xs"
              >
                Analyze a Package →
              </button>

              <button
                type="button"
                onClick={() => handleSelectScenario(ATTACK_SCENARIOS[0])}
                className="border border-border hover:border-text text-text font-sans font-medium text-xs px-5 py-3 rounded-full bg-white hover:bg-surface2 transition-all cursor-pointer"
              >
                Run Log4Shell Demo
              </button>
            </div>
          </div>

        </div>

        {/* ======================================================== */}
        {/* HOW IT WORKS SECTION — 3 CLEAN STEP CARDS                 */}
        {/* ======================================================== */}
        <div id="how-it-works" className="mt-24 pt-16 border-t border-border/70">
          <div className="text-left mb-8">
            <p className="font-sans text-[11px] font-semibold text-muted tracking-wider uppercase mb-2">
              SYSTEM ARCHITECTURE
            </p>
            <h3 className="font-serif font-normal text-3xl text-text tracking-tight">
              How RippleGuard simulates the explosion
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
            {/* Step 1 */}
            <div className="rounded-2xl border border-border/70 bg-white p-6 shadow-xs hover:border-stone-400 transition-all duration-200 flex flex-col">
              <span className="font-sans text-xs font-semibold text-muted border border-border/80 px-2.5 py-0.5 rounded-md mb-4 inline-block w-fit">
                01
              </span>
              <h4 className="font-serif font-semibold text-base text-text mb-2">
                Search Any Package
              </h4>
              <p className="font-sans text-xs text-muted leading-relaxed">
                Enter any npm or PyPI package. RippleGuard resolves its complete transitive dependency graph in real time via Google&apos;s deps.dev and queries OSV for known CVEs.
              </p>
            </div>

            {/* Step 2 */}
            <div className="rounded-2xl border border-border/70 bg-white p-6 shadow-xs hover:border-stone-400 transition-all duration-200 flex flex-col">
              <span className="font-sans text-xs font-semibold text-muted border border-border/80 px-2.5 py-0.5 rounded-md mb-4 inline-block w-fit">
                02
              </span>
              <h4 className="font-serif font-semibold text-base text-text mb-2">
                Select Compromise Entrypoint
              </h4>
              <p className="font-sans text-xs text-muted leading-relaxed">
                Click any node in the dependency graph — whether it is the direct top-level library or a shadow dependency 5 layers deep.
              </p>
            </div>

            {/* Step 3 */}
            <div className="rounded-2xl border border-border/70 bg-white p-6 shadow-xs hover:border-stone-400 transition-all duration-200 flex flex-col">
              <span className="font-sans text-xs font-semibold text-muted border border-border/80 px-2.5 py-0.5 rounded-md mb-4 inline-block w-fit">
                03
              </span>
              <h4 className="font-serif font-semibold text-base text-text mb-2">
                Simulate Cascading Blast
              </h4>
              <p className="font-sans text-xs text-muted leading-relaxed">
                Hit Inject Compromise. Watch the contagion spread node by node, calculate the Blast Radius Score, and review prioritized upgrade remedies.
              </p>
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* LIVE METRICS TICKER BAR                                  */}
        {/* ======================================================== */}
        <div className="mt-12 w-full bg-surface2/80 border border-border/80 rounded-2xl px-6 py-6 flex flex-wrap sm:flex-nowrap items-center justify-between gap-4">
          <div className="flex flex-col items-center sm:items-start gap-1 flex-1 min-w-[140px]">
            <span className="font-serif text-3xl font-normal text-text tracking-tight">3.5M+</span>
            <span className="font-sans text-xs text-muted">npm & PyPI indexed</span>
          </div>

          <div className="hidden sm:block w-px h-8 bg-border" />

          <div className="flex flex-col items-center sm:items-start gap-1 flex-1 min-w-[140px]">
            <span className="font-serif text-3xl font-normal text-text tracking-tight">82M/mo</span>
            <span className="font-sans text-xs text-muted">lodash monthly downloads</span>
          </div>

          <div className="hidden sm:block w-px h-8 bg-border" />

          <div className="flex flex-col items-center sm:items-start gap-1 flex-1 min-w-[140px]">
            <span className="font-serif text-3xl font-normal text-text tracking-tight">$4.88M</span>
            <span className="font-sans text-xs text-muted">avg breach cost (IBM 2024)</span>
          </div>

          <div className="hidden sm:block w-px h-8 bg-border" />

          <div className="flex flex-col items-center sm:items-start gap-1 flex-1 min-w-[140px]">
            <span className="font-serif text-3xl font-normal text-text tracking-tight">96%</span>
            <span className="font-sans text-xs text-muted">apps with open source</span>
          </div>
        </div>

      </div>

      {/* ======================================================== */}
      {/* EDITORIAL MINIMALIST FOOTER                              */}
      {/* ======================================================== */}
      <footer className="relative z-20 w-full py-6 px-8 sm:px-12 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted font-sans select-none bg-white">
        <div className="flex items-center gap-2.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span className="font-medium text-dim">Live OSV.dev & deps.dev API Connected</span>
        </div>

        <div className="flex items-center gap-4 text-xs text-muted font-normal">
          <span>Zero API Keys Required</span>
          <span>·</span>
          <span>Deterministic BFS Propagation</span>
          <span>·</span>
          <span>Open Source</span>
        </div>
      </footer>
    </div>
  );
}
