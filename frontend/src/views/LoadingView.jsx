import { AnimatePresence, motion } from 'framer-motion'
import useLoadingSteps from '../hooks/useLoadingSteps'
import { useGraphStore } from '../store/graphStore'

function StepDot({ index, activeIndex }) {
  let colorClass = 'bg-muted'
  if (index < activeIndex)  colorClass = 'bg-safe'
  if (index === activeIndex) colorClass = 'bg-accent'
  return <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${colorClass}`} />
}

function StepText({ text, index, activeIndex }) {
  if (index < activeIndex) {
    return <span className="font-mono text-xs text-dim">{text}</span>
  }
  if (index > activeIndex) {
    return <span className="font-mono text-xs text-muted">{text}</span>
  }
  // Active step — Framer Motion fade+slide in
  return (
    <AnimatePresence mode="wait">
      <motion.span
        key={activeIndex}
        className="font-mono text-xs text-text"
        initial={{ opacity: 0, x: -6 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
      >
        {text}
      </motion.span>
    </AnimatePresence>
  )
}

function LoadingState() {
  const { steps, activeIndex } = useLoadingSteps()

  return (
    <div className="max-w-sm w-full flex flex-col gap-3">
      <p className="font-sans text-text text-sm font-medium mb-2">Analyzing…</p>
      {steps.map((step, index) => (
        <div key={step.ms} className="flex items-center gap-3">
          <StepDot index={index} activeIndex={activeIndex} />
          <StepText text={step.text} index={index} activeIndex={activeIndex} />
        </div>
      ))}
    </div>
  )
}

function ErrorState({ error }) {
  const { setError, setView } = useGraphStore()

  function handleRetry() {
    setError(null)
    setView('idle')
  }

  return (
    <div className="max-w-sm w-full flex flex-col gap-4">
      <p className="font-mono text-danger text-sm">{error}</p>
      <button
        onClick={handleRetry}
        className="font-sans text-sm font-medium border border-border text-text px-4 py-2 rounded-sm hover:bg-surface transition-colors duration-150 w-fit"
      >
        Try again
      </button>
    </div>
  )
}

export default function LoadingView() {
  const error = useGraphStore((s) => s.error)

  return (
    <div className="flex flex-col items-center justify-center h-full bg-void">
      {error ? <ErrorState error={error} /> : <LoadingState />}
    </div>
  )
}
