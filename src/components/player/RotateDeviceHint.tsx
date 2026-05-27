'use client'

import { useEffect } from 'react'
import { motion } from 'framer-motion'

interface RotateDeviceHintProps {
  onDismiss: () => void
}

export function RotateDeviceHint({ onDismiss }: RotateDeviceHintProps) {
  // Auto-dismiss when device is rotated to landscape
  useEffect(() => {
    const mq = window.matchMedia('(orientation: landscape)')
    if (mq.matches) { onDismiss(); return }
    const handler = () => { if (mq.matches) onDismiss() }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [onDismiss])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-10"
      style={{ background: '#08090d' }}
    >
      {/* Subtle glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: 'radial-gradient(500px 400px at 50% 40%, oklch(78% 0.18 285 / 0.07) 0%, transparent 65%)',
        }}
      />

      {/* Animated phone icon */}
      <motion.div
        animate={{ rotate: [0, 0, 90, 90, 0] }}
        transition={{
          duration: 2.8,
          repeat: Infinity,
          repeatDelay: 0.4,
          ease: 'easeInOut',
          times: [0, 0.15, 0.45, 0.7, 1],
        }}
        style={{ transformOrigin: 'center center' }}
      >
        <PhoneIcon />
      </motion.div>

      {/* Text */}
      <div className="relative text-center space-y-2.5 px-8">
        <p className="text-base font-semibold" style={{ color: '#f5f6fa', letterSpacing: '-0.01em' }}>
          Rotate your device
        </p>
        <p className="text-sm leading-relaxed" style={{ color: '#5c6273' }}>
          This video plays best in landscape
        </p>
      </div>

      {/* Continue anyway */}
      <button
        onClick={onDismiss}
        className="relative px-6 py-2.5 rounded-xl text-sm font-medium border transition-all active:scale-95"
        style={{
          borderColor: 'rgba(255,255,255,0.12)',
          color: 'rgba(255,255,255,0.45)',
          background: 'rgba(255,255,255,0.04)',
        }}
        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.07)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
      >
        Continue in portrait
      </button>
    </motion.div>
  )
}

function PhoneIcon() {
  return (
    <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
      {/* Phone body */}
      <rect
        x="16" y="6"
        width="24" height="44"
        rx="5"
        stroke="rgba(255,255,255,0.65)"
        strokeWidth="2"
      />
      {/* Speaker slot */}
      <rect
        x="23" y="10.5"
        width="10" height="2"
        rx="1"
        fill="rgba(255,255,255,0.35)"
      />
      {/* Home indicator */}
      <rect
        x="23.5" y="43"
        width="9" height="2"
        rx="1"
        fill="rgba(255,255,255,0.35)"
      />
      {/* Screen area suggestion */}
      <rect
        x="18.5" y="15"
        width="19" height="26"
        rx="2"
        fill="rgba(255,255,255,0.06)"
        stroke="rgba(255,255,255,0.12)"
        strokeWidth="0.75"
      />
      {/* Rotation arrows hint — small curved arrow */}
      <path
        d="M 8 28 A 20 20 0 0 1 28 8"
        stroke="rgba(255,255,255,0.2)"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M 28 8 L 24 5 M 28 8 L 32 5"
        stroke="rgba(255,255,255,0.2)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}
