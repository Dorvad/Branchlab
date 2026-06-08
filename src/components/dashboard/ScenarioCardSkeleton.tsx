export function ScenarioCardSkeleton() {
  return (
    <div
      className="rounded-2xl border overflow-hidden flex flex-col animate-pulse"
      style={{
        background: 'var(--tint-1)',
        borderColor: 'var(--line-1)',
      }}
    >
      {/* Thumbnail placeholder */}
      <div
        className="h-40 relative"
        style={{ background: 'var(--tint-2)', borderBottom: '1px solid var(--line-1)' }}
      >
        {/* Status pill skeleton */}
        <div
          className="absolute top-3 left-3 h-5 w-20 rounded-full"
          style={{ background: 'var(--tint-3)' }}
        />
      </div>

      {/* Content */}
      <div className="p-5 flex flex-col gap-4 flex-1">
        {/* Title */}
        <div className="space-y-2">
          <div className="h-4 w-3/4 rounded-md" style={{ background: 'var(--tint-3)' }} />
          <div className="h-3 w-full rounded-md" style={{ background: 'var(--tint-2)' }} />
          <div className="h-3 w-2/3 rounded-md" style={{ background: 'var(--tint-2)' }} />
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-4">
          <div className="h-3 w-16 rounded-md" style={{ background: 'var(--tint-2)' }} />
          <div className="h-3 w-12 rounded-md" style={{ background: 'var(--tint-2)' }} />
          <div className="h-3 w-14 rounded-md ml-auto" style={{ background: 'var(--tint-2)' }} />
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 pt-1 mt-auto border-t" style={{ borderColor: 'var(--line-1)' }}>
          <div className="flex-1 h-8 rounded-xl" style={{ background: 'var(--tint-2)' }} />
          <div className="h-8 w-20 rounded-xl" style={{ background: 'var(--tint-2)' }} />
        </div>
      </div>
    </div>
  )
}
