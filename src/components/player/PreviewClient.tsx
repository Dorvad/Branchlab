'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Loader2, Smartphone, Monitor, ArrowLeft } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { ScenarioPlayer } from './ScenarioPlayer'
import { getScenario } from '@/lib/scenario-store'
import type { Scenario } from '@/types'

type DeviceMode = 'mobile' | 'desktop'

interface PreviewClientProps {
  scenarioId: string
  initialDevice?: DeviceMode
}

export function PreviewClient({ scenarioId, initialDevice = 'mobile' }: PreviewClientProps) {
  const [scenario, setScenario] = useState<Scenario | null>(null)
  const [loading, setLoading] = useState(true)
  const [device, setDevice] = useState<DeviceMode>(initialDevice)

  useEffect(() => {
    getScenario(scenarioId).then(s => {
      setScenario(s)
      setLoading(false)
    })
  }, [scenarioId])

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center" style={{ background: 'var(--bg-0)' }}>
        <Loader2 size={22} className="animate-spin" style={{ color: 'var(--fg-3)' }} />
      </div>
    )
  }

  if (!scenario) {
    return (
      <div
        className="flex h-screen items-center justify-center flex-col gap-4"
        style={{ background: 'var(--bg-0)' }}
      >
        <p className="text-sm font-mono" style={{ color: 'var(--fg-3)' }}>Scenario not found.</p>
        <Link
          href="/dashboard"
          className="text-xs font-mono underline underline-offset-4 transition-colors"
          style={{ color: 'var(--fg-3)' }}
        >
          Back to dashboard
        </Link>
      </div>
    )
  }

  return (
    <div
      className="fixed inset-0 flex flex-col overflow-hidden"
      style={{ background: 'var(--bg-canvas)' }}
    >
      {/* Dot-grid background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(var(--line-3) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />

      {/* ── Toolbar ── */}
      <div
        className="relative z-20 flex items-center justify-between px-5 h-[52px] shrink-0 border-b"
        style={{ borderColor: 'var(--line-1)', background: 'var(--bg-glass)', backdropFilter: 'blur(16px)' }}
      >
        {/* Left: back */}
        <Link
          href={`/editor/${scenarioId}`}
          className="flex items-center gap-1.5 text-xs font-mono transition-colors"
          style={{ color: 'var(--fg-3)' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--fg-1)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--fg-3)')}
        >
          <ArrowLeft size={13} />
          Back to editor
        </Link>

        {/* Center: device toggle */}
        <div
          className="flex items-center gap-1 p-1 rounded-xl"
          style={{ background: 'var(--tint-2)', border: '1px solid var(--line-2)' }}
        >
          {([
            { mode: 'mobile' as DeviceMode, icon: <Smartphone size={13} />, label: 'Mobile' },
            { mode: 'desktop' as DeviceMode, icon: <Monitor size={13} />, label: 'Desktop' },
          ] as const).map(({ mode, icon, label }) => (
            <button
              key={mode}
              onClick={() => setDevice(mode)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-all"
              style={device === mode ? {
                background: 'var(--bg-1)',
                color: 'var(--fg-0)',
                boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
              } : {
                color: 'var(--fg-3)',
              }}
            >
              {icon}
              {label}
            </button>
          ))}
        </div>

        {/* Right: scenario title */}
        <span className="text-xs font-mono truncate max-w-[160px]" style={{ color: 'var(--fg-4)' }}>
          {scenario.title}
        </span>
      </div>

      {/* ── Device frame ── */}
      <div className="relative flex-1 flex items-center justify-center overflow-auto py-8 px-6">
        <AnimatePresence mode="wait">
          {device === 'mobile' ? (
            <motion.div
              key="mobile"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="relative shrink-0"
              style={{
                width: 393,
                height: 852,
                borderRadius: 50,
                border: '8px solid var(--bg-3)',
                boxShadow: '0 0 0 1px var(--line-3), inset 0 0 0 1px var(--line-1), 0 40px 100px rgba(0,0,0,0.5)',
                overflow: 'hidden',
              }}
            >
              {/* Dynamic Island */}
              <div
                className="absolute z-10"
                style={{
                  top: 14, left: '50%', transform: 'translateX(-50%)',
                  width: 120, height: 34,
                  background: '#000',
                  borderRadius: 17,
                }}
              />
              {/* Home indicator */}
              <div
                className="absolute z-10"
                style={{
                  bottom: 10, left: '50%', transform: 'translateX(-50%)',
                  width: 130, height: 5,
                  background: 'rgba(255,255,255,0.25)',
                  borderRadius: 3,
                }}
              />
              {/* Side buttons */}
              <div
                className="absolute"
                style={{ top: 100, left: -10, width: 4, height: 36, background: 'var(--bg-3)', borderRadius: '2px 0 0 2px' }}
              />
              <div
                className="absolute"
                style={{ top: 150, left: -10, width: 4, height: 56, background: 'var(--bg-3)', borderRadius: '2px 0 0 2px' }}
              />
              <div
                className="absolute"
                style={{ top: 220, left: -10, width: 4, height: 56, background: 'var(--bg-3)', borderRadius: '2px 0 0 2px' }}
              />
              <div
                className="absolute"
                style={{ top: 150, right: -10, width: 4, height: 80, background: 'var(--bg-3)', borderRadius: '0 2px 2px 0' }}
              />
              {/* Player */}
              <div className="absolute inset-0">
                <ScenarioPlayer
                  scenario={scenario}
                  mode="preview"
                  backHref={`/editor/${scenarioId}`}
                  contained
                />
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="desktop"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="relative w-full"
              style={{
                maxWidth: 1200,
                borderRadius: '12px 12px 0 0',
                border: '1px solid var(--line-2)',
                boxShadow: '0 24px 80px rgba(0,0,0,0.4)',
                overflow: 'hidden',
                height: 'calc(100vh - 52px - 64px)',
                minHeight: 480,
              }}
            >
              {/* Browser chrome */}
              <div
                className="flex items-center gap-3 px-4 h-10 shrink-0"
                style={{ background: 'var(--bg-2)', borderBottom: '1px solid var(--line-1)' }}
              >
                {/* Traffic lights */}
                <div className="flex items-center gap-1.5">
                  <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#ff5f57' }} />
                  <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#ffbd2e' }} />
                  <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#28c940' }} />
                </div>
                {/* Spacer */}
                <div className="w-16" />
                {/* URL bar */}
                <div
                  className="flex-1 flex items-center gap-1.5 px-3 h-6 rounded-md"
                  style={{ background: 'var(--tint-2)', border: '1px solid var(--line-2)', maxWidth: 480 }}
                >
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ color: 'var(--fg-4)' }}>
                    <path d="M5 1a4 4 0 1 0 0 8A4 4 0 0 0 5 1zM1 5h8M5 1c-1.1 1.4-1.7 2.6-1.7 4S3.9 7.6 5 9M5 1c1.1 1.4 1.7 2.6 1.7 4S6.1 7.6 5 9" stroke="currentColor" strokeWidth="0.8" />
                  </svg>
                  <span className="text-[11px] font-mono truncate" style={{ color: 'var(--fg-3)' }}>
                    branchlab.com/play/preview
                  </span>
                </div>
              </div>
              {/* Player */}
              <div className="relative" style={{ height: 'calc(100% - 40px)' }}>
                <ScenarioPlayer
                  scenario={scenario}
                  mode="preview"
                  backHref={`/editor/${scenarioId}`}
                  contained
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
