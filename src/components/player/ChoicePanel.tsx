'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { ScenarioChoice } from '@/types'

interface ChoicePanelProps {
  choices: ScenarioChoice[]
  onSelect: (choice: ScenarioChoice) => void
}

export function ChoicePanel({ choices, onSelect }: ChoicePanelProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const handleSelect = (choice: ScenarioChoice) => {
    if (selectedId) return
    setSelectedId(choice.id)
    // Brief pause so the selection flash is visible before parent transitions away
    setTimeout(() => onSelect(choice), 180)
  }

  return (
    <motion.div
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', damping: 32, stiffness: 320 }}
      className="relative shrink-0 z-20"
      style={{
        background: 'linear-gradient(to bottom, rgba(8,9,13,0) 0%, rgba(8,9,13,0.96) 14%, #08090d 100%)',
      }}
    >
      <div className="px-5 pt-6 pb-8 max-w-[600px] mx-auto w-full">
        {/* Header */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-[11px] font-mono text-ink-3 tracking-[0.18em] uppercase mb-4"
        >
          What do you do?
        </motion.p>

        {/* Choices — scrollable when content exceeds viewport height */}
        <div className="relative">
          {/* Top-fade hint when list is scrollable */}
          <div
            className="absolute top-0 left-0 right-0 h-6 pointer-events-none z-10"
            style={{ background: 'linear-gradient(to bottom, #08090d, transparent)' }}
          />
          <div
            className="space-y-2.5 overflow-y-auto overscroll-contain"
            style={{ maxHeight: 'calc(55vh - 80px)' }}
          >
          {choices.map((choice, i) => {
            const isSelected = selectedId === choice.id
            const isDimmed = selectedId !== null && !isSelected

            return (
              <motion.button
                key={choice.id}
                initial={{ opacity: 0, x: -12 }}
                animate={{
                  opacity: isDimmed ? 0.3 : 1,
                  x: 0,
                  scale: isSelected ? 0.99 : 1,
                }}
                transition={{
                  opacity: { delay: isDimmed ? 0 : i * 0.06 + 0.08, duration: isDimmed ? 0.2 : 0.35 },
                  x: { delay: i * 0.06 + 0.08, duration: 0.35, ease: [0.16, 1, 0.3, 1] },
                }}
                whileHover={!selectedId ? { x: 3 } : undefined}
                onClick={() => handleSelect(choice)}
                disabled={!!selectedId}
                className="w-full text-left flex items-start gap-4 px-5 py-4 rounded-2xl border transition-colors"
                style={{
                  background: isSelected
                    ? 'oklch(82% 0.18 165 / 0.10)'
                    : 'rgba(255,255,255,0.04)',
                  borderColor: isSelected
                    ? 'oklch(82% 0.18 165 / 0.45)'
                    : 'rgba(255,255,255,0.10)',
                  boxShadow: isSelected ? 'var(--glow-mint)' : undefined,
                }}
              >
                {/* Key */}
                <span
                  className="shrink-0 font-mono text-[11px] tracking-widest uppercase mt-0.5 w-5 text-center"
                  style={{ color: isSelected ? 'var(--neon-mint)' : '#5c6273' }}
                >
                  {String.fromCharCode(65 + i)}
                </span>

                {/* Label */}
                <span
                  className="text-sm leading-snug"
                  style={{ color: isSelected ? '#ffffff' : '#c9cdda' }}
                >
                  {choice.label}
                </span>

                {/* Selected indicator */}
                <AnimatePresence>
                  {isSelected && (
                    <motion.span
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="shrink-0 ml-auto mt-0.5"
                      style={{ color: 'var(--neon-mint)' }}
                    >
                      ✓
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
            )
          })}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
