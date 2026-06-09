'use client'

import Link from 'next/link'

export default function NotFound() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-0)',
        color: 'var(--fg-0)',
        gap: 32,
        padding: '0 24px',
        textAlign: 'center',
      }}
    >
      {/* Wordmark */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
          <circle cx="7"  cy="14" r="6" fill="oklch(82% 0.18 165)" />
          <circle cx="21" cy="7"  r="5" fill="oklch(72% 0.22 290)" opacity="0.9" />
          <circle cx="21" cy="21" r="5" fill="oklch(78% 0.19 55)"  opacity="0.9" />
          <line x1="12.5" y1="12" x2="16.5" y2="8.5"  stroke="var(--line-2)" strokeWidth="1.5" />
          <line x1="12.5" y1="16" x2="16.5" y2="19.5" stroke="var(--line-2)" strokeWidth="1.5" />
        </svg>
        <span style={{ fontWeight: 700, fontSize: 18, letterSpacing: '-0.02em', color: 'var(--fg-0)' }}>
          BranchLab
        </span>
      </div>

      {/* 404 */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <span
          style={{
            fontSize: 80,
            fontWeight: 800,
            lineHeight: 1,
            letterSpacing: '-0.04em',
            color: 'var(--tint-2)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          404
        </span>
        <p style={{ fontSize: 18, color: 'var(--fg-1)', margin: 0, fontWeight: 500 }}>
          Page not found
        </p>
        <p style={{ fontSize: 14, color: 'var(--fg-3)', margin: 0, maxWidth: 320 }}>
          The page you're looking for doesn't exist or may have been moved.
        </p>
      </div>

      <Link
        href="/dashboard"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '10px 20px',
          borderRadius: 8,
          background: 'oklch(82% 0.18 165)',
          color: '#000',
          fontWeight: 600,
          fontSize: 14,
          textDecoration: 'none',
          transition: 'opacity 0.15s',
        }}
      >
        Back to dashboard
      </Link>
    </div>
  )
}
