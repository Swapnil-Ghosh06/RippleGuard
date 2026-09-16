import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

const STEPS = [
  { ms: 0,    text: 'Resolving dependency graph…'          },
  { ms: 900,  text: 'Fetching vulnerability data from OSV…' },
  { ms: 1900, text: 'Calculating blast radius…'            },
  { ms: 2600, text: 'Mapping propagation paths…'           },
  { ms: 3100, text: 'Rendering graph…'                     },
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
    <div className="relative w-full h-full flex flex-col items-center justify-center overflow-hidden gap-8">

      {/* Scan line */}
      <div className="scanline" />

      {/* Wordmark faded */}
      <p
        className="text-2xl font-black text-dim tracking-tight"
        style={{ fontFamily: 'Montserrat, sans-serif' }}
      >
        Ripple<span className="text-accent" style={{ opacity: 0.6 }}>Guard</span>
      </p>

      {/* Step sequence */}
      <div className="flex flex-col items-center gap-3 min-h-[120px] justify-center">
        <AnimatePresence mode="popLayout">
          {STEPS.slice(0, currentStep + 1).map((step, i) => (
            <motion.p
              key={step.text}
              initial={{ opacity: 0, y: 8 }}
              animate={{
                opacity: i === currentStep ? 1 : 0.25,
                y: 0,
              }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              className={`font-mono text-xs text-center ${
                i === currentStep ? 'text-text' : 'text-muted'
              }`}
            >
              {i < currentStep ? '✓ ' : '› '}{step.text}
            </motion.p>
          ))}
        </AnimatePresence>
      </div>

      {/* Progress bar */}
      <div className="w-48 h-px bg-border overflow-hidden rounded-full">
        <motion.div
          className="h-full bg-accent"
          initial={{ width: '0%' }}
          animate={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}
          transition={{ duration: 0.4, ease: 'easeInOut' }}
        />
      </div>
    </div>
  );
}
