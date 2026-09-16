import { useState, useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { useGraphStore } from '../store/graphStore';
import { useAnalyze } from '../hooks/useAnalyze';

gsap.registerPlugin(useGSAP);

const FAMOUS_ATTACKS = [
  { label: 'Log4Shell',    package: 'log4js',        ecosystem: 'npm'  },
  { label: 'Event-Stream', package: 'event-stream',  ecosystem: 'npm'  },
  { label: 'XZ Utils',     package: 'xz',            ecosystem: 'pypi' },
  { label: 'Colors.js',    package: 'colors',        ecosystem: 'npm'  },
];

export default function SearchPanel() {
  const [pkg, setPkg]       = useState('');
  const [eco, setEco]       = useState('npm');
  const [focused, setFocused] = useState(false);
  const { setBlastData, error, setError } = useGraphStore();
  const { analyze } = useAnalyze();
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

  const handleAnalyze = async (overridePkg, overrideEco) => {
    const p = overridePkg ?? pkg;
    const e = overrideEco ?? eco;
    if (!p.trim()) return;
    setBlastData(null);
    await analyze({ packageName: p.trim(), ecosystem: e, depth: 3 });
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

      {/* Error display */}
      {error && (
        <div className="w-full max-w-md mb-3 px-3 py-2 border border-danger/40 bg-danger/10 rounded-sm text-center">
          <p className="font-mono text-danger text-xs leading-relaxed">{error}</p>
        </div>
      )}

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
