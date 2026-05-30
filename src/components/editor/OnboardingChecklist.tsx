'use client'

import { useState, useEffect } from 'react'
import { Check, X, ChevronDown, ChevronUp, Rocket } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { dismissOnboarding } from '@/lib/onboarding'
import type { Scenario, ScenarioEdge } from '@/types'

interface ChecklistStep {
  id: string
  label: string
  hint: string
  done: boolean
}

interface Props {
  scenario: Scenario
  derivedEdges: ScenarioEdge[]
  hasPreviewed: boolean
  onDismiss: () => void
}

export function OnboardingChecklist({ scenario, derivedEdges, hasPreviewed, onDismiss }: Props) {
  const [expanded, setExpanded] = useState(true)

  const steps: ChecklistStep[] = [
    {
      id: 'video',
      label: 'Add your first video',
      hint: 'Open the Asset Library and attach a video to a scene node',
      done: scenario.nodes.some(n => !!(n.clip || n.youtubeAsset)),
    },
    {
      id: 'choice',
      label: 'Add a choice',
      hint: 'Select a scene and add a choice in the inspector panel',
      done: scenario.nodes.some(n => n.choices.length > 0),
    },
    {
      id: 'connect',
      label: 'Connect the choice to another scene',
      hint: 'Drag from a choice handle to connect it to another scene',
      done: derivedEdges.length > 0,
    },
    {
      id: 'ending',
      label: 'Add an ending',
      hint: 'Change a scene\'s type to "Ending" in the inspector',
      done: scenario.nodes.some(n => n.type === 'ending'),
    },
    {
      id: 'preview',
      label: 'Preview your scenario',
      hint: 'Click the Preview button in the top bar',
      done: hasPreviewed,
    },
    {
      id: 'publish',
      label: 'Publish',
      hint: 'Click the Publish button to make it publicly playable',
      done: scenario.status === 'published',
    },
  ]

  const doneCount = steps.filter(s => s.done).length
  const allDone = doneCount === steps.length
  const progress = doneCount / steps.length

  // Auto-dismiss 3 s after all steps are complete
  useEffect(() => {
    if (!allDone) return
    const t = setTimeout(() => {
      dismissOnboarding()
      onDismiss()
    }, 3000)
    return () => clearTimeout(t)
  }, [allDone, onDismiss])

  const handleDismiss = () => {
    dismissOnboarding()
    onDismiss()
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 12, scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 400, damping: 35 }}
      className="w-[230px] rounded-2xl overflow-hidden"
      style={{
        background: 'var(--bg-1)',
        border: '1px solid var(--line-2)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
      }}
    >
      {allDone ? (
        /* ── All done state ── */
        <div className="flex flex-col items-center gap-2 p-4 text-center">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{ background: 'oklch(82% 0.18 165 / 0.15)', border: '1px solid oklch(82% 0.18 165 / 0.3)' }}
          >
            <Rocket size={16} style={{ color: 'oklch(82% 0.18 165)' }} />
          </div>
          <p className="text-[12px] font-semibold" style={{ color: 'var(--fg-0)' }}>You&apos;re all set!</p>
          <p className="text-[10px] font-mono" style={{ color: 'var(--fg-4)' }}>Closing in a moment…</p>
        </div>
      ) : (
        <>
          {/* ── Header ── */}
          <button
            className="w-full flex items-center gap-2.5 px-3 py-2.5 transition-colors hover:bg-[var(--tint-2)]"
            onClick={() => setExpanded(v => !v)}
          >
            {/* Progress circle */}
            <div className="relative shrink-0 w-[22px] h-[22px]">
              <svg viewBox="0 0 22 22" className="w-full h-full -rotate-90">
                <circle
                  cx="11" cy="11" r="9"
                  fill="none" strokeWidth="2.5"
                  style={{ stroke: 'var(--line-2)' }}
                />
                <circle
                  cx="11" cy="11" r="9"
                  fill="none" strokeWidth="2.5"
                  strokeLinecap="round"
                  style={{
                    stroke: 'oklch(82% 0.18 165)',
                    strokeDasharray: `${progress * 56.55} 56.55`,
                    transition: 'stroke-dasharray 0.4s ease',
                  }}
                />
              </svg>
            </div>

            <div className="flex-1 text-left">
              <p className="text-[11px] font-medium leading-none" style={{ color: 'var(--fg-0)' }}>
                Getting started
              </p>
              <p className="text-[9px] font-mono mt-0.5" style={{ color: 'var(--fg-4)' }}>
                {doneCount} of {steps.length} complete
              </p>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {expanded
                ? <ChevronDown size={11} style={{ color: 'var(--fg-4)' }} />
                : <ChevronUp size={11} style={{ color: 'var(--fg-4)' }} />}
              <div
                role="button"
                onClick={e => { e.stopPropagation(); handleDismiss() }}
                className="p-0.5 rounded-md transition-colors hover:bg-[var(--tint-3)]"
                style={{ color: 'var(--fg-4)' }}
                title="Dismiss"
              >
                <X size={11} />
              </div>
            </div>
          </button>

          {/* ── Steps ── */}
          <AnimatePresence initial={false}>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="overflow-hidden"
              >
                <div
                  className="border-t"
                  style={{ borderColor: 'var(--line-1)' }}
                >
                  {steps.map((step, i) => (
                    <div key={step.id} className="flex items-start gap-2.5 px-3 py-2.5">
                      {/* Step indicator */}
                      <div
                        className="shrink-0 mt-0.5 w-[18px] h-[18px] rounded-full flex items-center justify-center transition-all duration-300"
                        style={
                          step.done
                            ? { background: 'oklch(82% 0.18 165)', border: '1.5px solid oklch(82% 0.18 165)' }
                            : { background: 'transparent', border: '1.5px solid var(--line-3)' }
                        }
                      >
                        {step.done
                          ? <Check size={9} style={{ color: '#052916' }} strokeWidth={3} />
                          : <span className="text-[8px] font-mono leading-none" style={{ color: 'var(--fg-4)' }}>{i + 1}</span>
                        }
                      </div>

                      {/* Text */}
                      <div className="min-w-0 flex-1">
                        <p
                          className="text-[11px] font-medium leading-snug transition-all duration-300"
                          style={{
                            color: step.done ? 'var(--fg-4)' : 'var(--fg-1)',
                            textDecoration: step.done ? 'line-through' : 'none',
                          }}
                        >
                          {step.label}
                        </p>
                        {!step.done && (
                          <p className="text-[9px] font-mono mt-0.5 leading-snug" style={{ color: 'var(--fg-4)' }}>
                            {step.hint}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </motion.div>
  )
}
