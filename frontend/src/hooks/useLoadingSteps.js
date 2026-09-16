import { useState, useEffect } from 'react'

const STEPS = [
  { ms: 0,    text: 'Resolving dependency graph…'        },
  { ms: 1400, text: 'Fetching vulnerability data (OSV)…' },
  { ms: 3000, text: 'Calculating blast radius…'          },
  { ms: 4600, text: 'Mapping propagation paths…'         },
  { ms: 6000, text: 'Preparing graph…'                   },
]

export default function useLoadingSteps() {
  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    const timers = STEPS.map(({ ms }, index) =>
      setTimeout(() => setActiveIndex(index), ms)
    )
    return () => timers.forEach(clearTimeout)
  }, [])

  return { steps: STEPS, activeIndex }
}
