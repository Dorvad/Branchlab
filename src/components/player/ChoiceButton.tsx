'use client'

import { motion } from 'framer-motion'
import type { ScenarioChoice } from '@/types'

interface ChoiceButtonProps {
  choice: ScenarioChoice
  index: number
  onSelect: (choiceId: string) => void
  disabled?: boolean
}

export function ChoiceButton({ choice, index, onSelect, disabled }: ChoiceButtonProps) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ scale: 1.02, y: -1 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => !disabled && onSelect(choice.id)}
      disabled={disabled}
      className="w-full text-left px-5 py-4 rounded-2xl border text-sm font-medium transition-colors disabled:opacity-50"
      style={{
        background: 'rgba(255,255,255,0.04)',
        borderColor: 'rgba(255,255,255,0.12)',
        color: '#f5f6fa',
      }}
      onMouseEnter={e => {
        if (!disabled) {
          const el = e.currentTarget
          el.style.background = 'rgba(94,245,168,0.07)'
          el.style.borderColor = 'oklch(82% 0.18 165 / 0.4)'
          el.style.color = '#fff'
        }
      }}
      onMouseLeave={e => {
        const el = e.currentTarget
        el.style.background = 'rgba(255,255,255,0.04)'
        el.style.borderColor = 'rgba(255,255,255,0.12)'
        el.style.color = '#f5f6fa'
      }}
    >
      <span className="font-mono text-[10px] tracking-widest uppercase mr-3" style={{ color: '#5c6273' }}>
        {String.fromCharCode(65 + index)}
      </span>
      {choice.label}
    </motion.button>
  )
}
