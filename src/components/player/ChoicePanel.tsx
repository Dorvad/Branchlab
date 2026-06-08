'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { ScenarioChoice } from '@/types'

interface ChoicePanelProps {
  choices: ScenarioChoice[]
  onSelect: (choice: ScenarioChoice) => void
}

export function ChoicePanel({ choices, onSelect }: ChoicePanelProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [focusedIdx, setFocusedIdx] = useState(-1)

  const handleSelect = (choice: ScenarioChoice) => {
    if (selectedId) return
    setSelectedId(choice.id)
    setTimeout(() => onSelect(choice), 180)
  }

  // Keyboard navigation: arrows / number keys to focus, Enter/Space to select
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (selectedId) return
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        e.preventDefault()
        setFocusedIdx(i => (i + 1) % choices.length)
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault()
        setFocusedIdx(i => (i - 1 + choices.length) % choices.length)
      } else if ((e.key === 'Enter' || e.key === ' ') && focusedIdx >= 0) {
        e.preventDefault()
        handleSelect(choices[focusedIdx])
      } else {
        const num = parseInt(e.key)
        if (num >= 1 && num <= choices.length) {
          e.preventDefault()
          setFocusedIdx(num - 1)
          handleSelect(choices[num - 1])
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [choices, selectedId, focusedIdx])

  // 2–4 choices → 2-column grid   |   1 or 5+ → stacked scrollable list
  const useGrid = choices.length >= 2 && choices.length <= 4

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="absolute bottom-0 left-0 right-0 z-20"
    >
      {/* Gradient scrim for readability over video */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.55) 55%, transparent 100%)',
        }}
      />

      <div className="relative px-4 pt-10 pb-5 max-w-[640px] mx-auto w-full">
        {/* Header label */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-[10px] font-mono tracking-[0.18em] uppercase mb-2.5"
          style={{ color: 'rgba(255,255,255,0.4)' }}
        >
          What do you do?
        </motion.p>

        {useGrid ? (
          /* ── 2-column grid for 2–4 choices ────────────────────────── */
          <div className="grid grid-cols-2 gap-2">
            {choices.map((choice, i) => {
              const isSelected = selectedId === choice.id
              const isDimmed = selectedId !== null && !isSelected
              const isFocused = focusedIdx === i && !selectedId
              return (
                <motion.button
                  key={choice.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{
                    opacity: isDimmed ? 0.3 : 1,
                    scale: isSelected ? 0.98 : 1,
                  }}
                  transition={{
                    opacity: { delay: isDimmed ? 0 : i * 0.06 + 0.05, duration: isDimmed ? 0.15 : 0.3 },
                    scale: { duration: 0.15 },
                  }}
                  onClick={() => handleSelect(choice)}
                  disabled={!!selectedId}
                  className="flex flex-col items-start px-3.5 py-3 rounded-2xl text-left"
                  style={{
                    background: isSelected
                      ? 'oklch(82% 0.18 165 / 0.18)'
                      : 'rgba(255,255,255,0.07)',
                    border: `1px solid ${isSelected ? 'oklch(82% 0.18 165 / 0.55)' : isFocused ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.14)'}`,
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                    boxShadow: isSelected
                      ? '0 2px 20px rgba(0,0,0,0.5), var(--glow-mint)'
                      : isFocused
                      ? '0 2px 20px rgba(0,0,0,0.5), 0 0 0 2px rgba(255,255,255,0.3)'
                      : '0 2px 12px rgba(0,0,0,0.35)',
                    minHeight: 68,
                    outline: 'none',
                  }}
                >
                  <span
                    className="font-mono text-[9px] tracking-widest uppercase mb-1.5"
                    style={{ color: isSelected ? 'oklch(82% 0.18 165)' : 'rgba(255,255,255,0.35)' }}
                  >
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span
                    className="text-[13px] leading-snug font-medium"
                    style={{ color: isSelected ? '#ffffff' : 'rgba(255,255,255,0.9)' }}
                  >
                    {choice.label}
                  </span>
                  <AnimatePresence>
                    {isSelected && (
                      <motion.span
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="mt-1.5 text-xs"
                        style={{ color: 'oklch(82% 0.18 165)' }}
                      >
                        ✓
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.button>
              )
            })}
          </div>
        ) : (
          /* ── Stacked scrollable list for 1 or 5+ choices ──────────── */
          <div
            className="space-y-2 overflow-y-auto overscroll-contain"
            style={{ maxHeight: 'calc(45vh - 80px)' }}
          >
            {choices.map((choice, i) => {
              const isSelected = selectedId === choice.id
              const isDimmed = selectedId !== null && !isSelected
              const isFocused = focusedIdx === i && !selectedId
              return (
                <motion.button
                  key={choice.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{
                    opacity: isDimmed ? 0.3 : 1,
                    x: 0,
                    scale: isSelected ? 0.99 : 1,
                  }}
                  transition={{
                    opacity: { delay: isDimmed ? 0 : i * 0.055 + 0.08, duration: isDimmed ? 0.2 : 0.3 },
                    x: { delay: i * 0.055 + 0.08, duration: 0.3, ease: [0.16, 1, 0.3, 1] },
                  }}
                  whileHover={!selectedId ? { x: 2 } : undefined}
                  onClick={() => handleSelect(choice)}
                  disabled={!!selectedId}
                  className="w-full text-left flex items-center gap-3.5 px-4 py-3 rounded-2xl"
                  style={{
                    background: isSelected
                      ? 'oklch(82% 0.18 165 / 0.18)'
                      : 'rgba(255,255,255,0.07)',
                    border: `1px solid ${isSelected ? 'oklch(82% 0.18 165 / 0.55)' : isFocused ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.14)'}`,
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                    boxShadow: isSelected
                      ? '0 2px 20px rgba(0,0,0,0.5), var(--glow-mint)'
                      : isFocused
                      ? '0 2px 20px rgba(0,0,0,0.5), 0 0 0 2px rgba(255,255,255,0.3)'
                      : '0 2px 12px rgba(0,0,0,0.35)',
                    outline: 'none',
                  }}
                >
                  <span
                    className="shrink-0 font-mono text-[10px] tracking-widest uppercase w-4 text-center"
                    style={{ color: isSelected ? 'oklch(82% 0.18 165)' : 'rgba(255,255,255,0.35)' }}
                  >
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span
                    className="text-sm leading-snug flex-1"
                    style={{ color: isSelected ? '#ffffff' : 'rgba(255,255,255,0.9)' }}
                  >
                    {choice.label}
                  </span>
                  <AnimatePresence>
                    {isSelected && (
                      <motion.span
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="shrink-0 text-sm"
                        style={{ color: 'oklch(82% 0.18 165)' }}
                      >
                        ✓
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.button>
              )
            })}
          </div>
        )}
      </div>
    </motion.div>
  )
}
