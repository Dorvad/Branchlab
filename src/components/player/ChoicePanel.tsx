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
    setTimeout(() => onSelect(choice), 180)
  }

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

      <div className="relative px-5 pt-14 pb-6 max-w-[640px] mx-auto w-full">
        {/* Header label */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-[10px] font-mono tracking-[0.18em] uppercase mb-3"
          style={{ color: 'rgba(255,255,255,0.4)' }}
        >
          What do you do?
        </motion.p>

        {/* Scrollable choices list */}
        <div
          className="space-y-2 overflow-y-auto overscroll-contain"
          style={{ maxHeight: 'calc(45vh - 80px)' }}
        >
          {choices.map((choice, i) => {
            const isSelected = selectedId === choice.id
            const isDimmed = selectedId !== null && !isSelected

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
                className="w-full text-left flex items-center gap-3.5 px-4 py-3 rounded-2xl transition-colors"
                style={{
                  background: isSelected
                    ? 'oklch(82% 0.18 165 / 0.18)'
                    : 'rgba(255,255,255,0.07)',
                  border: `1px solid ${isSelected ? 'oklch(82% 0.18 165 / 0.55)' : 'rgba(255,255,255,0.14)'}`,
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  boxShadow: isSelected
                    ? '0 2px 20px rgba(0,0,0,0.5), var(--glow-mint)'
                    : '0 2px 12px rgba(0,0,0,0.35)',
                }}
              >
                {/* Letter key */}
                <span
                  className="shrink-0 font-mono text-[10px] tracking-widest uppercase w-4 text-center"
                  style={{ color: isSelected ? 'oklch(82% 0.18 165)' : 'rgba(255,255,255,0.35)' }}
                >
                  {String.fromCharCode(65 + i)}
                </span>

                {/* Label */}
                <span
                  className="text-sm leading-snug flex-1"
                  style={{ color: isSelected ? '#ffffff' : 'rgba(255,255,255,0.9)' }}
                >
                  {choice.label}
                </span>

                {/* Check mark on selection */}
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
      </div>
    </motion.div>
  )
}
