import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

const STEPS = [
  { ms: 0,    text: 'Resolving nested dependency topology…'     },
  { ms: 700,  text: 'Fetching CVE & GHSA vulnerability feeds…' },
  { ms: 1500, text: 'Computing cascading blast vectors…'       },
  { ms: 2200, text: 'Mapping contagion propagation paths…'      },
  { ms: 2700, text: 'Finalizing interactive security graph…'   },
];

export default function LoadingView() {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const timers = STEPS.slice(1).map((step, i) =>
      setTimeout(() => setCurrentStep(i + 1), step.ms)
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="relative w-full h-[calc(100vh-56px)] flex flex-col items-center justify-center overflow-hidden gap-7 cyber-grid bg-void">
      {/* Scan line */}
      <div className="scanline" />

      {/* Cyber Radar Loader Indicator */}
      <div className="relative flex items-center justify-center mb-2">
        <div className="w-16 h-16 rounded-full border border-border flex items-center justify-center bg-surface2/80 backdrop-blur-md shadow-2xl">
          <div className="w-8 h-8 rounded-full border-2 border-accent border-t-transparent animate-spin" />
        </div>
        <div className="absolute w-24 h-24 rounded-full border border-accent/20 animate-ping pointer-events-none" />
      </div>

      {/* Brand & Subtitle */}
      <div className="text-center">
        <h2
          className="text-xl font-black text-text tracking-wider uppercase"
          style={{ fontFamily: 'Montserrat, sans-serif' }}
        >
          Ripple<span className="text-accent">Guard</span>
        </h2>
        <p className="font-mono text-xs text-muted mt-1">
          ANALYZING DEPENDENCY TREE & BLAST VECTORS
        </p>
      </div>

      {/* Step sequence */}
      <div className="flex flex-col items-center gap-2.5 min-h-[140px] justify-center w-full max-w-sm px-4">
        <AnimatePresence mode="popLayout">
          {STEPS.slice(0, currentStep + 1).map((step, i) => {
            const isActive = i === currentStep;
            const isDone = i < currentStep;

            return (
              <motion.div
                key={step.text}
                initial={{ opacity: 0, y: 10 }}
                animate={{
                  opacity: isActive ? 1 : isDone ? 0.45 : 0.2,
                  y: 0,
                }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                className={`flex items-center gap-2 font-mono text-xs ${
                  isActive ? 'text-text font-semibold' : 'text-muted'
                }`}
              >
                <span className={`w-4 text-center ${isDone ? 'text-safe font-bold' : isActive ? 'text-accent' : 'text-muted'}`}>
                  {isDone ? '✓' : '›'}
                </span>
                <span>{step.text}</span>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Progress bar */}
      <div className="w-64 h-1 bg-surface3 overflow-hidden rounded-full border border-border">
        <motion.div
          className="h-full bg-gradient-to-r from-accent to-blue-400 rounded-full shadow-[0_0_8px_rgba(56,189,248,0.5)]"
          initial={{ width: '0%' }}
          animate={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}
          transition={{ duration: 0.35, ease: 'easeInOut' }}
        />
      </div>
    </div>
  );
}
