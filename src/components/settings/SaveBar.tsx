'use client'
import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, Loader2, AlertCircle } from 'lucide-react'
import type { SaveState } from '@/lib/settings/types'

interface Props {
  saveState: SaveState
  onSave: () => void
  onReset: () => void
}

export function SaveBar({ saveState, onSave, onReset }: Props) {
  const visible = saveState !== 'idle'

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 64, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 64, opacity: 0 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-3 border-t"
          style={{
            background: 'var(--bg-glass)',
            backdropFilter: 'blur(16px)',
            borderColor: 'var(--line-2)',
          }}
        >
          <div className="flex items-center gap-2 text-xs font-mono">
            {saveState === 'dirty' && (
              <span style={{ color: 'var(--fg-3)' }}>Unsaved changes</span>
            )}
            {saveState === 'saving' && (
              <>
                <Loader2 size={12} className="animate-spin" style={{ color: 'oklch(82% 0.18 165)' }} />
                <span style={{ color: 'var(--fg-3)' }}>Saving…</span>
              </>
            )}
            {saveState === 'saved' && (
              <>
                <Check size={12} style={{ color: 'oklch(82% 0.18 165)' }} />
                <span style={{ color: 'oklch(82% 0.18 165)' }}>Saved</span>
              </>
            )}
            {saveState === 'error' && (
              <>
                <AlertCircle size={12} style={{ color: 'oklch(65% 0.22 30)' }} />
                <span style={{ color: 'oklch(65% 0.22 30)' }}>Failed to save</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            {(saveState === 'dirty' || saveState === 'error') && (
              <button
                type="button"
                onClick={onReset}
                className="px-3 py-1.5 rounded-lg text-xs font-mono transition-colors"
                style={{ color: 'var(--fg-3)', border: '1px solid var(--line-2)' }}
              >
                Reset
              </button>
            )}
            {(saveState === 'dirty' || saveState === 'error') && (
              <button
                type="button"
                onClick={onSave}
                className="px-3 py-1.5 rounded-lg text-xs font-mono transition-colors"
                style={{
                  background: 'oklch(82% 0.18 165 / 0.12)',
                  color: 'oklch(82% 0.18 165)',
                  border: '1px solid oklch(82% 0.18 165 / 0.4)',
                }}
              >
                Save
              </button>
            )}
            {saveState === 'saving' && (
              <button
                type="button"
                disabled
                className="px-3 py-1.5 rounded-lg text-xs font-mono opacity-40 cursor-not-allowed"
                style={{
                  background: 'oklch(82% 0.18 165 / 0.12)',
                  color: 'oklch(82% 0.18 165)',
                  border: '1px solid oklch(82% 0.18 165 / 0.4)',
                }}
              >
                Save
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
