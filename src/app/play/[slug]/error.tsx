'use client'

export default function PlayError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-center p-8 bg-black text-white">
      <h1 className="text-2xl font-semibold mb-3">Unable to load scenario</h1>
      <p className="text-white/60 mb-6 max-w-sm">
        Something went wrong loading this scenario. Please try again.
      </p>
      <button
        onClick={reset}
        className="px-5 py-2 rounded-lg bg-white text-black font-medium hover:bg-white/90 transition-colors"
      >
        Try again
      </button>
    </div>
  )
}
