'use client'

interface Option<T extends string> {
  value: T
  label: string
}

interface Props<T extends string> {
  value: T
  onChange: (v: T) => void
  options: Option<T>[]
}

export function SegmentedControl<T extends string>({ value, onChange, options }: Props<T>) {
  return (
    <div
      className="flex rounded-lg p-0.5 gap-0.5"
      style={{ background: 'var(--tint-1)' }}
    >
      {options.map(opt => {
        const active = opt.value === value
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className="px-3 py-1.5 rounded-md text-xs font-mono transition-all"
            style={
              active
                ? {
                    background: 'oklch(82% 0.18 165 / 0.12)',
                    color: 'oklch(82% 0.18 165)',
                    border: '1px solid oklch(82% 0.18 165 / 0.4)',
                  }
                : {
                    color: 'var(--fg-3)',
                    border: '1px solid transparent',
                  }
            }
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
