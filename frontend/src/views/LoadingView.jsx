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
    <div className="relative w-full h-[calc(100vh-56px)] min-h-[calc(100vh-56px)] flex flex-col items-center justify-center overflow-hidden bg-white">
      {/* Editorial Minimalist Loader Card */}
      <div className="max-w-md w-full flex flex-col items-center text-center gap-6 px-6">
        {/* Serene Monoline Spinner */}
        <div className="w-14 h-14 rounded-full border border-border flex items-center justify-center relative">
          <div className="absolute inset-0 rounded-full border-2 border-neutral-300 border-t-black animate-spin" />
        </div>

        {/* Brand Text */}
        <div>
          <h2 className="font-serif text-2xl font-normal text-text tracking-tight">
            Ripple<span className="italic text-muted">guard</span>
          </h2>
          <p className="text-xs text-muted font-sans tracking-wide mt-1">
            Analyzing dependency topology…
          </p>
        </div>

        {/* Step Sequence Checklist */}
        <div className="flex flex-col items-start gap-2.5 min-h-[140px] w-full px-4">
          <AnimatePresence mode="popLayout">
            {STEPS.slice(0, currentStep + 1).map((step, i) => {
              const isActive = i === currentStep;
              const isDone = i < currentStep;

              return (
                <motion.div
                  key={step.text}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{
                    opacity: isActive ? 1 : isDone ? 0.6 : 0.25,
                    y: 0,
                  }}
                  transition={{ duration: 0.2 }}
                  className={`flex items-center gap-2.5 text-xs text-left font-sans ${
                    isActive ? 'text-text font-medium' : 'text-muted'
                  }`}
                >
                  <span className={`w-4 text-center font-medium ${isDone ? 'text-emerald-600' : isActive ? 'text-text' : 'text-muted'}`}>
                    {isDone ? '✓' : '—'}
                  </span>
                  <span>{step.text}</span>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Hairline Progress Bar */}
        <div className="w-48 h-1 bg-neutral-100 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-black rounded-full"
            initial={{ width: '0%' }}
            animate={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}
            transition={{ duration: 0.35, ease: 'easeInOut' }}
          />
        </div>

        {/* Subtle Footer Tag */}
        <p className="text-[11px] text-muted font-sans">
          Supply Chain Compromise Simulator
        </p>
      </div>
    </div>
  );
}
