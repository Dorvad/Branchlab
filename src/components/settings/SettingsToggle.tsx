'use client'

interface Props {
  checked: boolean
  onChange: (v: boolean) => void
  label?: string
}

export function SettingsToggle({ checked, onChange, label }: Props) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      onKeyDown={e => { if (e.key === ' ') { e.preventDefault(); onChange(!checked) } }}
      className="relative inline-flex items-center h-5 w-9 rounded-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
      style={{
        background: checked ? 'oklch(82% 0.18 165)' : 'var(--tint-2)',
        outlineColor: 'oklch(82% 0.18 165)',
      }}
    >
      <span
        className="inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform"
        style={{ transform: checked ? 'translateX(18px)' : 'translateX(2px)' }}
      />
    </button>
  )
}
