export default function CommandInput({ value, onChange, onSubmit, placeholder }) {
  function handleKeyDown(e) {
    if (e.key === 'Enter') onSubmit()
  }

  return (
    <div>
      <div className="flex items-center gap-3 w-full">
        {/* Prompt character */}
        <span className="font-mono text-accent text-lg shrink-0">{'>'}</span>

        {/* Text input */}
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="flex-1 bg-transparent border-none outline-none font-mono text-text text-base placeholder:text-muted"
        />

        {/* Analyze button */}
        <button
          onClick={onSubmit}
          className="font-sans text-sm font-medium bg-accent text-void px-5 py-2 rounded-sm shrink-0"
        >
          Analyze
        </button>
      </div>

      {/* Underline divider */}
      <div className="h-px bg-border mt-1 w-full" />
    </div>
  )
}
