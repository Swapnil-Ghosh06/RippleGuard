export default function EcosystemToggle({ value, onChange }) {
  const base = 'font-mono text-xs px-3 py-1 rounded-sm border border-border'
  const active = 'bg-surface-raised text-text'
  const inactive = 'bg-transparent text-dim'

  return (
    <div className="flex gap-2">
      <button
        onClick={() => onChange('npm')}
        className={`${base} ${value === 'npm' ? active : inactive}`}
      >
        npm
      </button>
      <button
        onClick={() => onChange('pypi')}
        className={`${base} ${value === 'pypi' ? active : inactive}`}
      >
        PyPI
      </button>
    </div>
  )
}
