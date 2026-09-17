import { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGraphStore } from '../store/graphStore';
import { useAnalyze } from '../hooks/useAnalyze';
import SketchHeroIllustration from './SketchHeroIllustration';
import SketchStoryIllustration from './SketchStoryIllustration';

// Comprehensive Package Catalog across npm and PyPI ecosystems
const PACKAGE_CATALOG = [
  // ==================== NPM PACKAGES ====================
  // 1. Famous Attack Replays (npm)
  {
    id: 'log4js-rce',
    package: 'log4js',
    version: '6.4.0',
    ecosystem: 'npm',
    cve: 'CVE-2021-44228',
    category: 'Attack Replay',
    label: 'Log4Shell RCE',
    downloads: '15M/mo',
    summary: 'Critical JNDI remote code execution substitute attack simulation in log4js.',
    tag: 'CRIT 10.0',
    tagClass: 'bg-red-50 text-red-800 border-red-200/80',
    pillClass: 'bg-red-50 text-red-900 border-red-200/70 hover:bg-red-100/70',
    isAttack: true,
  },
  {
    id: 'event-stream-wallet',
    package: 'event-stream',
    version: '3.3.6',
    ecosystem: 'npm',
    cve: 'GHSA-mh6f-8j2x-4483',
    category: 'Attack Replay',
    label: 'Wallet Theft Trojan',
    downloads: '2.1M/mo',
    summary: 'Flatmap-stream injected by rogue maintainer to steal Copay Bitcoin wallet keys.',
    tag: 'CRIT 9.8',
    tagClass: 'bg-rose-50 text-rose-800 border-rose-200/80',
    pillClass: 'bg-rose-50 text-rose-900 border-rose-200/70 hover:bg-rose-100/70',
    isAttack: true,
  },
  {
    id: 'colors-sabotage',
    package: 'colors',
    version: '1.4.1',
    ecosystem: 'npm',
    cve: 'GHSA-5rqg-jm4f-cqx7',
    category: 'Attack Replay',
    label: 'Maintainer Sabotage',
    downloads: '20M/mo',
    summary: 'Maintainer published infinite-loop code printing zalgo text in protest.',
    tag: 'HIGH 7.5',
    tagClass: 'bg-orange-50 text-orange-800 border-orange-200/80',
    pillClass: 'bg-orange-50 text-orange-900 border-orange-200/70 hover:bg-orange-100/70',
    isAttack: true,
  },
  {
    id: 'lodash-prototype',
    package: 'lodash',
    version: '4.17.20',
    ecosystem: 'npm',
    cve: 'CVE-2021-23337',
    category: 'Attack Replay',
    label: 'Prototype Pollution',
    downloads: '82M/mo',
    summary: 'Command injection via template engine in lodash. Cascades downstream.',
    tag: 'HIGH 7.2',
    tagClass: 'bg-amber-50 text-amber-800 border-amber-200/80',
    pillClass: 'bg-amber-50 text-amber-900 border-amber-200/70 hover:bg-amber-100/70',
    isAttack: true,
  },

  // 2. Large Frameworks & UI (npm)
  {
    id: 'npm-express',
    package: 'express',
    version: 'latest',
    ecosystem: 'npm',
    category: 'Web Framework',
    label: 'Fast Node.js Web API Framework',
    downloads: '35M/mo',
    summary: 'Fast, unopinionated, minimalist web framework and middleware pipeline for Node.js.',
    tag: 'POPULAR',
    tagClass: 'bg-stone-100 text-stone-700 border-stone-200',
  },
  {
    id: 'npm-react',
    package: 'react',
    version: 'latest',
    ecosystem: 'npm',
    category: 'Frontend UI',
    label: 'UI Component Tree Engine',
    downloads: '25M/mo',
    summary: 'The library for web and native user interfaces and virtual DOM diffing.',
    tag: 'POPULAR',
    tagClass: 'bg-stone-100 text-stone-700 border-stone-200',
  },
  {
    id: 'npm-vue',
    package: 'vue',
    version: 'latest',
    ecosystem: 'npm',
    category: 'Frontend UI',
    label: 'Progressive Web Framework',
    downloads: '5.2M/mo',
    summary: 'Approachable, performant, and versatile reactive single-page frontend framework.',
    tag: 'POPULAR',
    tagClass: 'bg-stone-100 text-stone-700 border-stone-200',
  },
  {
    id: 'npm-angular',
    package: 'angular',
    version: 'latest',
    ecosystem: 'npm',
    category: 'Enterprise UI',
    label: 'Enterprise Single-Page Platform',
    downloads: '3.8M/mo',
    summary: 'Enterprise web application platform and client-side dependency injection framework.',
    tag: 'FRAMEWORK',
    tagClass: 'bg-stone-100 text-stone-700 border-stone-200',
  },
  {
    id: 'npm-next',
    package: 'next',
    version: 'latest',
    ecosystem: 'npm',
    category: 'Full-Stack Framework',
    label: 'Hybrid SSR/SSG Web Framework',
    downloads: '8.4M/mo',
    summary: 'The React framework for the web with server-side rendering and static export.',
    tag: 'FULLSTACK',
    tagClass: 'bg-stone-100 text-stone-700 border-stone-200',
  },
  {
    id: 'npm-svelte',
    package: 'svelte',
    version: 'latest',
    ecosystem: 'npm',
    category: 'Frontend UI',
    label: 'Compiled Reactive UI Framework',
    downloads: '1.2M/mo',
    summary: 'Cybernetically enhanced web apps with compile-time reactivity.',
    tag: 'FRAMEWORK',
    tagClass: 'bg-stone-100 text-stone-700 border-stone-200',
  },

  // 3. Build Tooling & Linters (npm)
  {
    id: 'npm-webpack',
    package: 'webpack',
    version: 'latest',
    ecosystem: 'npm',
    category: 'Build Tooling',
    label: 'Module Bundler & Compiler',
    downloads: '30M/mo',
    summary: 'Packs JavaScript and asset trees for deployment in browsers.',
    tag: 'BUILD TOOL',
    tagClass: 'bg-stone-100 text-stone-700 border-stone-200',
  },
  {
    id: 'npm-vite',
    package: 'vite',
    version: 'latest',
    ecosystem: 'npm',
    category: 'Build Tooling',
    label: 'Next-Gen Frontend Tooling',
    downloads: '16M/mo',
    summary: 'Native ESM-powered dev server and rollup production bundler.',
    tag: 'BUILD TOOL',
    tagClass: 'bg-stone-100 text-stone-700 border-stone-200',
  },
  {
    id: 'npm-typescript',
    package: 'typescript',
    version: 'latest',
    ecosystem: 'npm',
    category: 'Compiler',
    label: 'Typed JavaScript Transpiler',
    downloads: '45M/mo',
    summary: 'Static type-checking compiler and language tools for JavaScript.',
    tag: 'COMPILER',
    tagClass: 'bg-stone-100 text-stone-700 border-stone-200',
  },
  {
    id: 'npm-eslint',
    package: 'eslint',
    version: 'latest',
    ecosystem: 'npm',
    category: 'Linter',
    label: 'Static Code Analysis & Linting',
    downloads: '38M/mo',
    summary: 'Find and fix problems in your JavaScript code and enforce style rules.',
    tag: 'LINTER',
    tagClass: 'bg-stone-100 text-stone-700 border-stone-200',
  },
  {
    id: 'npm-babel-core',
    package: 'babel-core',
    version: 'latest',
    ecosystem: 'npm',
    category: 'Compiler',
    label: 'Babel JavaScript Compiler',
    downloads: '12M/mo',
    summary: 'ECMAScript syntax transpilation and polyfill injection engine.',
    tag: 'COMPILER',
    tagClass: 'bg-stone-100 text-stone-700 border-stone-200',
  },

  // 4. Scoped Packages (npm)
  {
    id: 'npm-types-node',
    package: '@types/node',
    version: 'latest',
    ecosystem: 'npm',
    category: 'Type Stub',
    label: 'TypeScript Definitions for Node.js',
    downloads: '70M/mo',
    summary: 'Compile-time type declarations for the Node.js runtime API.',
    tag: 'SCOPED',
    tagClass: 'bg-stone-100 text-stone-700 border-stone-200',
  },
  {
    id: 'npm-types-react',
    package: '@types/react',
    version: 'latest',
    ecosystem: 'npm',
    category: 'Type Stub',
    label: 'TypeScript Definitions for React',
    downloads: '40M/mo',
    summary: 'Compile-time type declarations for React virtual DOM components.',
    tag: 'SCOPED',
    tagClass: 'bg-stone-100 text-stone-700 border-stone-200',
  },
  {
    id: 'npm-babel-scoped-core',
    package: '@babel/core',
    version: 'latest',
    ecosystem: 'npm',
    category: 'Compiler',
    label: 'Babel Core Compiler Suite',
    downloads: '55M/mo',
    summary: 'Core compiler architecture for modern JavaScript transformation.',
    tag: 'SCOPED',
    tagClass: 'bg-stone-100 text-stone-700 border-stone-200',
  },
  {
    id: 'npm-vue-cli',
    package: '@vue/cli',
    version: 'latest',
    ecosystem: 'npm',
    category: 'CLI Tooling',
    label: 'Vue.js CLI & Project Generator',
    downloads: '1.5M/mo',
    summary: 'Standard development suite for rapid Vue.js application scaffolding.',
    tag: 'SCOPED',
    tagClass: 'bg-stone-100 text-stone-700 border-stone-200',
  },
  {
    id: 'npm-angular-core',
    package: '@angular/core',
    version: 'latest',
    ecosystem: 'npm',
    category: 'Enterprise UI',
    label: 'Angular Core Framework Module',
    downloads: '4.2M/mo',
    summary: 'Core Angular dependency injection, signals, and lifecycle engine.',
    tag: 'SCOPED',
    tagClass: 'bg-stone-100 text-stone-700 border-stone-200',
  },

  // 5. Single-Purpose Utilities & HTTP Clients (npm)
  {
    id: 'npm-axios',
    package: 'axios',
    version: 'latest',
    ecosystem: 'npm',
    category: 'HTTP Client',
    label: 'Promise-based HTTP Client',
    downloads: '60M/mo',
    summary: 'Universal HTTP client for browser and Node.js with interceptors.',
    tag: 'NETWORKING',
    tagClass: 'bg-stone-100 text-stone-700 border-stone-200',
  },
  {
    id: 'npm-chalk',
    package: 'chalk',
    version: 'latest',
    ecosystem: 'npm',
    category: 'Utility',
    label: 'Terminal String Styling',
    downloads: '120M/mo',
    summary: 'Expressive, clean terminal string color and ANSI styling.',
    tag: 'UTIL',
    tagClass: 'bg-stone-100 text-stone-700 border-stone-200',
  },
  {
    id: 'npm-ms',
    package: 'ms',
    version: 'latest',
    ecosystem: 'npm',
    category: 'Utility',
    label: 'Millisecond Conversion Helper',
    downloads: '150M/mo',
    summary: 'Tiny utility to convert various time formats to milliseconds.',
    tag: 'UTIL',
    tagClass: 'bg-stone-100 text-stone-700 border-stone-200',
  },
  {
    id: 'npm-is-even',
    package: 'is-even',
    version: 'latest',
    ecosystem: 'npm',
    category: 'Utility',
    label: 'Is Even Number Checker',
    downloads: '250K/mo',
    summary: 'Return true if the given number is even, delegating to is-odd.',
    tag: 'UTIL',
    tagClass: 'bg-stone-100 text-stone-700 border-stone-200',
  },
  {
    id: 'npm-left-pad',
    package: 'left-pad',
    version: 'latest',
    ecosystem: 'npm',
    category: 'Utility',
    label: 'String Left Padding Utility',
    downloads: '2M/mo',
    summary: 'Infamous 11-line string padding library that broke the internet in 2016.',
    tag: 'UTIL',
    tagClass: 'bg-stone-100 text-stone-700 border-stone-200',
  },
  {
    id: 'npm-tiny-emitter',
    package: 'tiny-emitter',
    version: 'latest',
    ecosystem: 'npm',
    category: 'Utility',
    label: 'Minimal Event Emitter',
    downloads: '1.1M/mo',
    summary: 'A tiny (less than 1k) event emitter library with zero dependencies.',
    tag: 'UTIL',
    tagClass: 'bg-stone-100 text-stone-700 border-stone-200',
  },

  // ==================== PYPI PACKAGES ====================
  // 1. Famous Attack Replays (PyPI)
  {
    id: 'pypi-xz-backdoor',
    package: 'xz',
    version: '5.6.0',
    ecosystem: 'pypi',
    cve: 'CVE-2024-3094',
    category: 'Attack Replay',
    label: 'SSH Binary Backdoor',
    downloads: '50M/mo',
    summary: 'Multi-year targeted supply chain campaign injecting OpenSSH auth bypass.',
    tag: 'CRIT 10.0',
    tagClass: 'bg-rose-50 text-rose-800 border-rose-200/80',
    pillClass: 'bg-rose-50 text-rose-900 border-rose-200/70 hover:bg-rose-100/70',
    isAttack: true,
  },
  {
    id: 'pypi-urllib3-cve',
    package: 'urllib3',
    version: '1.26.4',
    ecosystem: 'pypi',
    cve: 'CVE-2021-33503',
    category: 'Attack Replay',
    label: 'Catastrophic ReDoS & CRLF',
    downloads: '180M/mo',
    summary: 'Catastrophic regex backtracking & CRLF injection in authority parsing.',
    tag: 'HIGH 7.5',
    tagClass: 'bg-orange-50 text-orange-800 border-orange-200/80',
    pillClass: 'bg-orange-50 text-orange-900 border-orange-200/70 hover:bg-orange-100/70',
    isAttack: true,
  },
  {
    id: 'pypi-django-cve',
    package: 'django',
    version: '3.2.4',
    ecosystem: 'pypi',
    cve: 'CVE-2021-35042',
    category: 'Attack Replay',
    label: 'SQL Injection in QuerySet',
    downloads: '38M/mo',
    summary: 'Unfiltered order_by query parameter injection allowing unauthorized SQL reads.',
    tag: 'HIGH 7.5',
    tagClass: 'bg-amber-50 text-amber-800 border-amber-200/80',
    pillClass: 'bg-amber-50 text-amber-900 border-amber-200/70 hover:bg-amber-100/70',
    isAttack: true,
  },

  // 2. Web Frameworks (PyPI)
  {
    id: 'pypi-django',
    package: 'django',
    version: 'latest',
    ecosystem: 'pypi',
    category: 'Web Framework',
    label: 'High-Level Python Web Framework',
    downloads: '38M/mo',
    summary: 'Monolithic Python web platform with ORM, migrations, and built-in admin portal.',
    tag: 'POPULAR',
    tagClass: 'bg-stone-100 text-stone-700 border-stone-200',
  },
  {
    id: 'pypi-flask',
    package: 'flask',
    version: 'latest',
    ecosystem: 'pypi',
    category: 'Web Framework',
    label: 'Lightweight WSGI Microframework',
    downloads: '45M/mo',
    summary: 'Lightweight WSGI web application framework and endpoint router.',
    tag: 'POPULAR',
    tagClass: 'bg-stone-100 text-stone-700 border-stone-200',
  },
  {
    id: 'pypi-fastapi',
    package: 'fastapi',
    version: 'latest',
    ecosystem: 'pypi',
    category: 'API Framework',
    label: 'Async High-Performance ASGI API',
    downloads: '32M/mo',
    summary: 'Modern, fast (high-performance) web framework for building APIs with Python 3.8+.',
    tag: 'POPULAR',
    tagClass: 'bg-stone-100 text-stone-700 border-stone-200',
  },
  {
    id: 'pypi-tornado',
    package: 'tornado',
    version: 'latest',
    ecosystem: 'pypi',
    category: 'Web Framework',
    label: 'Asynchronous Web & Socket Server',
    downloads: '14M/mo',
    summary: 'Python web framework and asynchronous networking library with non-blocking I/O.',
    tag: 'FRAMEWORK',
    tagClass: 'bg-stone-100 text-stone-700 border-stone-200',
  },
  {
    id: 'pypi-starlette',
    package: 'starlette',
    version: 'latest',
    ecosystem: 'pypi',
    category: 'API Framework',
    label: 'Lightweight ASGI Framework Toolkit',
    downloads: '28M/mo',
    summary: 'Lightweight ASGI framework/toolkit ideal for building async web services in Python.',
    tag: 'FRAMEWORK',
    tagClass: 'bg-stone-100 text-stone-700 border-stone-200',
  },

  // 3. Data & ORM (PyPI)
  {
    id: 'pypi-sqlalchemy',
    package: 'sqlalchemy',
    version: 'latest',
    ecosystem: 'pypi',
    category: 'Database / ORM',
    label: 'Enterprise Python SQL Toolkit & ORM',
    downloads: '65M/mo',
    summary: 'Database abstraction layer and Object Relational Mapper for transactional backends.',
    tag: 'DATABASE',
    tagClass: 'bg-stone-100 text-stone-700 border-stone-200',
  },
  {
    id: 'pypi-pydantic',
    package: 'pydantic',
    version: 'latest',
    ecosystem: 'pypi',
    category: 'Data Validation',
    label: 'Type-Safe Data Parsing & Schema',
    downloads: '95M/mo',
    summary: 'Data validation and settings management using Python type annotations.',
    tag: 'VALIDATION',
    tagClass: 'bg-stone-100 text-stone-700 border-stone-200',
  },

  // 4. Networking & HTTP Clients (PyPI)
  {
    id: 'pypi-requests',
    package: 'requests',
    version: 'latest',
    ecosystem: 'pypi',
    category: 'HTTP Client',
    label: 'Standard HTTP Library for Humans',
    downloads: '280M/mo',
    summary: 'Simple, elegant HTTP library for making outbound API requests and handling sessions.',
    tag: 'NETWORKING',
    tagClass: 'bg-stone-100 text-stone-700 border-stone-200',
  },
  {
    id: 'pypi-urllib3',
    package: 'urllib3',
    version: 'latest',
    ecosystem: 'pypi',
    category: 'HTTP Transport',
    label: 'Low-Level HTTP Connection Pool',
    downloads: '320M/mo',
    summary: 'Powerful HTTP client with thread-safe connection pooling, client-side SSL/TLS, and retries.',
    tag: 'NETWORKING',
    tagClass: 'bg-stone-100 text-stone-700 border-stone-200',
  },
  {
    id: 'pypi-httpx',
    package: 'httpx',
    version: 'latest',
    ecosystem: 'pypi',
    category: 'HTTP Client',
    label: 'Async Next-Generation HTTP Client',
    downloads: '42M/mo',
    summary: 'Fully featured HTTP client for Python 3 with sync and async APIs, HTTP/2 support.',
    tag: 'NETWORKING',
    tagClass: 'bg-stone-100 text-stone-700 border-stone-200',
  },

  // 5. Build, Packaging & Single-Purpose Utils (PyPI)
  {
    id: 'pypi-setuptools',
    package: 'setuptools',
    version: 'latest',
    ecosystem: 'pypi',
    category: 'Build Tooling',
    label: 'Python Packaging & Distribution',
    downloads: '210M/mo',
    summary: 'Easily download, build, install, upgrade, and uninstall Python packages.',
    tag: 'BUILD TOOL',
    tagClass: 'bg-stone-100 text-stone-700 border-stone-200',
  },
  {
    id: 'pypi-six',
    package: 'six',
    version: 'latest',
    ecosystem: 'pypi',
    category: 'Utility',
    label: 'Python 2 & 3 Compatibility Library',
    downloads: '140M/mo',
    summary: 'Python 2 and 3 compatibility utilities to smooth over code differences.',
    tag: 'UTIL',
    tagClass: 'bg-stone-100 text-stone-700 border-stone-200',
  },
  {
    id: 'pypi-attrs',
    package: 'attrs',
    version: 'latest',
    ecosystem: 'pypi',
    category: 'Utility',
    label: 'Classes Without Boilerplate',
    downloads: '85M/mo',
    summary: 'Attributes without boilerplate: declarative Python class authoring with validation.',
    tag: 'UTIL',
    tagClass: 'bg-stone-100 text-stone-700 border-stone-200',
  },
  {
    id: 'pypi-leftpad',
    package: 'leftpad',
    version: 'latest',
    ecosystem: 'pypi',
    category: 'Utility',
    label: 'Left-Pad String Formatter',
    downloads: '10K/mo',
    summary: 'Lightweight string left-padding implementation for Python applications.',
    tag: 'UTIL',
    tagClass: 'bg-stone-100 text-stone-700 border-stone-200',
  },
  {
    id: 'pypi-simple-math',
    package: 'simple-math',
    version: 'latest',
    ecosystem: 'pypi',
    category: 'Utility',
    label: 'Basic Math Helpers',
    downloads: '5K/mo',
    summary: 'Single-purpose arithmetic utility package with zero external dependencies.',
    tag: 'UTIL',
    tagClass: 'bg-stone-100 text-stone-700 border-stone-200',
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

  // Filter package suggestions by active ecosystem and search query
  const suggestions = useMemo(() => {
    const q = pkg.trim().toLowerCase();

    // Separate active eco vs other eco packages
    const activeEcoPackages = PACKAGE_CATALOG.filter(item => item.ecosystem === eco);
    const otherEcoPackages = PACKAGE_CATALOG.filter(item => item.ecosystem !== eco);

    if (!q) {
      // When empty: show all items in active ecosystem (attack replays first, then popular tools)
      return activeEcoPackages;
    }

    // Match in active ecosystem first
    const primaryMatches = activeEcoPackages.filter(item =>
      item.package.toLowerCase().includes(q) ||
      (item.label && item.label.toLowerCase().includes(q)) ||
      (item.category && item.category.toLowerCase().includes(q)) ||
      (item.cve && item.cve.toLowerCase().includes(q)) ||
      (item.summary && item.summary.toLowerCase().includes(q))
    );

    // If query matches packages from the other ecosystem, append them as cross-eco suggestions
    const crossMatches = otherEcoPackages.filter(item =>
      item.package.toLowerCase().includes(q) ||
      (item.label && item.label.toLowerCase().includes(q)) ||
      (item.cve && item.cve.toLowerCase().includes(q))
    );

    return [...primaryMatches, ...crossMatches];
  }, [pkg, eco]);

  // Attack replay scenarios for the chips below search bar
  const activeAttacks = useMemo(() => {
    const ecoAttacks = PACKAGE_CATALOG.filter(item => item.isAttack && item.ecosystem === eco);
    if (ecoAttacks.length > 0) return ecoAttacks;
    return PACKAGE_CATALOG.filter(item => item.isAttack);
  }, [eco]);

  const handleAnalyze = async (targetPkg, targetEco) => {
    const query = (targetPkg ?? pkg).trim();
    const ecosystem = targetEco ?? eco;
    if (!query) return;

    setShowDropdown(false);
    setBlastData(null);
    try {
      await analyze({ packageName: query, ecosystem, depth: 3 });
    } catch {
      // Handled in useAnalyze
    }
  };

  const handleSelectPackage = (item) => {
    setPkg(item.package);
    setEco(item.ecosystem);
    setShowDropdown(false);
    handleAnalyze(item.package, item.ecosystem);
  };

  const handleKeyDown = (e) => {
    if (!showDropdown || suggestions.length === 0) {
      if (e.key === 'Enter') handleAnalyze();
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (suggestions[selectedIndex]) {
        handleSelectPackage(suggestions[selectedIndex]);
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
                      setSelectedIndex(0);
                    }}
                    onFocus={() => {
                      setIsFocused(true);
                      setShowDropdown(true);
                    }}
                    onBlur={() => setIsFocused(false)}
                    onKeyDown={handleKeyDown}
                    placeholder={
                      eco === 'npm'
                        ? 'Enter npm package (e.g. express, lodash, react)...'
                        : 'Enter PyPI package (e.g. django, flask, fastapi)...'
                    }
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
                      onMouseDown={(evt) => {
                        evt.preventDefault();
                        setEco(e);
                        setShowDropdown(true);
                        setSelectedIndex(0);
                      }}
                      className={`px-3 py-1 rounded-full text-xs font-sans font-medium transition-all cursor-pointer ${
                        eco === e
                          ? 'bg-white text-text font-semibold shadow-xs'
                          : 'text-muted hover:text-text'
                      }`}
                    >
                      {e.toUpperCase()}
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
                {showDropdown && suggestions.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 4, scale: 0.98 }}
                    transition={{ duration: 0.15 }}
                    className="absolute left-0 right-0 top-full mt-2 rounded-2xl bg-white border border-border shadow-xl p-2 z-50 overflow-hidden text-left"
                  >
                    <div className="px-3 py-1.5 border-b border-border flex items-center justify-between text-[11px] font-sans text-muted font-medium">
                      <span>
                        {pkg.trim()
                          ? `Matching Packages (${eco.toUpperCase()})`
                          : `Curated ${eco.toUpperCase()} Packages & Attacks`}
                      </span>
                      <span>Press enter to select</span>
                    </div>

                    <div className="flex flex-col gap-1 max-h-72 overflow-y-auto mt-1 p-1">
                      {suggestions.map((item, i) => {
                        const isSelected = i === selectedIndex;
                        const isOtherEco = item.ecosystem !== eco;

                        return (
                          <div
                            key={item.id}
                            onMouseDown={(evt) => {
                              evt.preventDefault();
                              handleSelectPackage(item);
                            }}
                            onMouseEnter={() => setSelectedIndex(i)}
                            className={`rounded-xl p-2.5 flex items-center justify-between cursor-pointer transition-all ${
                              isSelected
                                ? 'bg-surface2 text-text'
                                : 'hover:bg-surface2/60 text-dim'
                            }`}
                          >
                            <div className="min-w-0 flex-1 pr-3">
                              <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                                <span className="font-sans text-xs font-semibold text-text truncate">
                                  {item.package}
                                  {item.version && item.version !== 'latest' ? `@${item.version}` : ''}
                                </span>

                                <span
                                  className={`text-[10px] font-sans font-semibold px-1.5 py-0.2 rounded uppercase border ${
                                    isOtherEco
                                      ? 'bg-amber-50 text-amber-800 border-amber-300'
                                      : 'bg-surface3 text-muted border-border'
                                  }`}
                                >
                                  {item.ecosystem}
                                </span>

                                {item.category && (
                                  <span className="text-[10px] font-sans text-muted bg-stone-100 px-1.5 py-0.2 rounded border border-stone-200">
                                    {item.category}
                                  </span>
                                )}

                                {item.cve && (
                                  <span className="text-[10px] font-mono text-danger font-medium">
                                    {item.cve}
                                  </span>
                                )}
                              </div>

                              <p className="text-xs text-muted truncate font-sans">
                                {item.summary || item.label}
                              </p>
                            </div>

                            <div className="shrink-0 flex items-center gap-2">
                              {item.tag && (
                                <span className={`font-sans text-[11px] px-2 py-0.5 rounded-full font-medium border ${item.tagClass || 'bg-surface3 text-muted border-border'}`}>
                                  {item.tag}
                                </span>
                              )}
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
                {eco.toUpperCase()} Attacks:
              </span>

              <button
                type="button"
                onClick={() => handleSelectPackage(activeAttacks[0])}
                className="bg-danger/10 hover:bg-danger/20 border border-danger/30 text-danger font-sans text-xs px-3.5 py-1.5 rounded-full transition-all cursor-pointer flex items-center mr-1 font-medium"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-danger animate-ping inline-block mr-1.5" />
                <span>Quick Demo ↗</span>
              </button>

              {activeAttacks.map(a => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => handleSelectPackage(a)}
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
                onClick={() => handleSelectPackage(PACKAGE_CATALOG[0])}
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
