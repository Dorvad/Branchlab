'use client'

import { useEffect } from 'react'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function GlobalError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error('[BranchLab]', error)
  }, [error])

  return (
    <html>
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0d0e12',
          color: '#e8eaf2',
          gap: 32,
          padding: '0 24px',
          textAlign: 'center',
          fontFamily: 'ui-sans-serif, system-ui, sans-serif',
        }}
      >
        {/* Wordmark */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
            <circle cx="7"  cy="14" r="6" fill="oklch(82% 0.18 165)" />
            <circle cx="21" cy="7"  r="5" fill="oklch(72% 0.22 290)" opacity="0.9" />
            <circle cx="21" cy="21" r="5" fill="oklch(78% 0.19 55)"  opacity="0.9" />
            <line x1="12.5" y1="12" x2="16.5" y2="8.5"  stroke="#3a4055" strokeWidth="1.5" />
            <line x1="12.5" y1="16" x2="16.5" y2="19.5" stroke="#3a4055" strokeWidth="1.5" />
          </svg>
          <span style={{ fontWeight: 700, fontSize: 18, letterSpacing: '-0.02em' }}>
            BranchLab
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <p style={{ fontSize: 18, color: '#c8cad8', margin: 0, fontWeight: 500 }}>
            Something went wrong
          </p>
          <p style={{ fontSize: 14, color: '#7a7e94', margin: 0, maxWidth: 360 }}>
            An unexpected error occurred. Your work is auto-saved — try refreshing the page.
          </p>
          {error.digest && (
            <code
              style={{
                fontSize: 11,
                color: '#4a5066',
                background: '#1a1c24',
                padding: '4px 10px',
                borderRadius: 4,
                letterSpacing: '0.05em',
              }}
            >
              {error.digest}
            </code>
          )}
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={reset}
            style={{
              padding: '10px 20px',
              borderRadius: 8,
              background: 'oklch(82% 0.18 165)',
              color: '#000',
              fontWeight: 600,
              fontSize: 14,
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
          <a
            href="/dashboard"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '10px 20px',
              borderRadius: 8,
              background: '#1e2130',
              color: '#c8cad8',
              fontWeight: 600,
              fontSize: 14,
              textDecoration: 'none',
              border: '1px solid #2e3248',
            }}
          >
            Go to dashboard
          </a>
        </div>
      </body>
    </html>
  )
}
