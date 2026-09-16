import { useState, useRef } from 'react'
import { useGraphStore } from '../store/graphStore'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import CommandInput from '../components/CommandInput'
import EcosystemToggle from '../components/EcosystemToggle'
import AttackChips from '../components/AttackChips'
import { useAnalyze } from '../hooks/useAnalyze'

export default function SearchView() {
  const [query, setQuery]         = useState('')
  const [ecosystem, setEcosystem] = useState('npm')
  const { analyze }               = useAnalyze()
  const error                     = useGraphStore((s) => s.error)

  // Refs for GSAP entrance
  const rgWordmark  = useRef(null)
  const rgTagline   = useRef(null)
  const rgInput     = useRef(null)
  const rgEcosystem = useRef(null)
  const rgChips     = useRef(null)

  // GSAP entrance — runs once on mount
  useGSAP(() => {
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })

    tl.from(rgWordmark.current,         { y: -24, opacity: 0, duration: 0.55 })
      .from(rgTagline.current,          { y:   8, opacity: 0, duration: 0.40 }, '-=0.15')
      .from(rgInput.current,            { y:  16, opacity: 0, duration: 0.40 }, '-=0.10')
      .from(rgEcosystem.current,        { y:   8, opacity: 0, duration: 0.30 }, '-=0.10')
      .from(rgChips.current.children,   { y:   6, opacity: 0, duration: 0.25, stagger: 0.07 }, '-=0.05')
  }, [])

  function handleAnalyze() {
    analyze({ packageName: query, ecosystem })
  }

  return (
    <div className="flex flex-col items-center justify-center h-full bg-void">

      {/* 1 — Wordmark */}
      <h1
        ref={rgWordmark}
        className="font-sans font-bold text-5xl tracking-tight text-text"
      >
        RippleGuard
      </h1>

      {/* 2 — Tagline */}
      <p
        ref={rgTagline}
        className="font-sans text-dim text-base mt-3"
      >
        See the compromise before it becomes a catastrophe.
      </p>

      {/* 3 — Command input */}
      <div ref={rgInput} className="mt-10 w-full max-w-xl">
        <CommandInput
          value={query}
          onChange={setQuery}
          onSubmit={handleAnalyze}
          placeholder="package name…"
        />
        {error && (
          <p className="font-mono text-danger text-xs text-center mt-3 max-w-xs mx-auto">
            {error}
          </p>
        )}
      </div>

      {/* 4 — Ecosystem toggle */}
      <div ref={rgEcosystem} className="mt-4 w-full max-w-xl">
        <EcosystemToggle
          value={ecosystem}
          onChange={setEcosystem}
        />
      </div>

      {/* 5 — Attack chips */}
      <div ref={rgChips} className="mt-5 w-full max-w-xl">
        <AttackChips
          onSelect={({ query: q, ecosystem: eco }) => {
            setQuery(q)
            setEcosystem(eco)
            analyze({ packageName: q, ecosystem: eco })
          }}
        />
      </div>

    </div>
  )
}
