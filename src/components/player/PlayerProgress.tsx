'use client'

interface PlayerProgressProps {
  step: number   // 1-indexed, number of nodes visited so far
  max?: number   // cap on visible dots
}

export function PlayerProgress({ step, max = 8 }: PlayerProgressProps) {
  const dots = Math.max(step, 1)
  const visible = Math.min(dots, max)

  return (
    <div className="flex items-center gap-1.5" aria-label={`Step ${step}`}>
      {Array.from({ length: visible }).map((_, i) => {
        const isCurrent = i === visible - 1
        return (
          <span
            key={i}
            className="rounded-full transition-all duration-500"
            style={{
              width: isCurrent ? 18 : 6,
              height: 6,
              background: 'var(--neon-mint)',
              opacity: isCurrent ? 1 : 0.35,
              boxShadow: isCurrent ? 'var(--glow-mint)' : undefined,
            }}
          />
        )
      })}
    </div>
  )
}
