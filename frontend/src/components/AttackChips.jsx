const ATTACKS = [
  { label: 'Log4Shell',    query: 'log4j',         ecosystem: 'npm'  },
  { label: 'Event-Stream', query: 'event-stream',  ecosystem: 'npm'  },
  { label: 'XZ Utils',     query: 'xz-utils',      ecosystem: 'pypi' },
]

export default function AttackChips({ onSelect }) {
  return (
    <div className="flex gap-2 items-center">
      <span className="font-mono text-dim text-xs shrink-0">replay a real attack —</span>
      {ATTACKS.map(({ label, query, ecosystem }) => (
        <button
          key={label}
          onClick={() => onSelect({ query, ecosystem })}
          className="font-mono text-xs px-3 py-1 border border-border text-dim rounded-sm hover:text-text hover:border-accent transition-colors duration-150"
        >
          {label}
        </button>
      ))}
    </div>
  )
}
