interface Props {
  label: string
  hint?: string
  children: React.ReactNode
}

export function SettingRow({ label, hint, children }: Props) {
  return (
    <div
      className="flex items-start justify-between gap-4 py-3.5 border-b"
      style={{ borderColor: 'var(--line-1)' }}
    >
      <div className="min-w-0">
        <p className="text-sm font-medium" style={{ color: 'var(--fg-1)' }}>{label}</p>
        {hint && (
          <p className="text-[11px] font-mono mt-0.5 leading-snug" style={{ color: 'var(--fg-4)' }}>{hint}</p>
        )}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}
