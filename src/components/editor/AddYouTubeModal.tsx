'use client'

import { useState, useRef, useEffect } from 'react'
import { X, Youtube, Link, ArrowRight, ArrowLeft, Loader2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { extractYouTubeVideoId } from '@/lib/youtube'
import { saveYouTubeAsset } from '@/lib/supabase/youtube-assets'
import type { YouTubeAsset } from '@/types'

interface AddYouTubeModalProps {
  orgId?: string | null
  onSave: (asset: YouTubeAsset) => void
  onClose: () => void
}

type Step = 'input' | 'preview'

export function AddYouTubeModal({ orgId, onSave, onClose }: AddYouTubeModalProps) {
  const [step, setStep] = useState<Step>('input')
  const [url, setUrl] = useState('')
  const [videoId, setVideoId] = useState<string | null>(null)
  const [urlError, setUrlError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleUrlChange = (value: string) => {
    setUrl(value)
    setUrlError(null)
    setVideoId(null)
  }

  const handleNext = () => {
    const id = extractYouTubeVideoId(url)
    if (!id) {
      setUrlError("This doesn't look like a valid YouTube video URL.")
      return
    }
    setVideoId(id)
    setStep('preview')
  }

  const handleAdd = async () => {
    if (!videoId) return
    setSaving(true)
    try {
      const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
      const asset = await saveYouTubeAsset(
        {
          youtubeVideoId: videoId,
          originalUrl: url.trim(),
          title: undefined,   // no API key for MVP; users can rename in library
          thumbnailUrl,
          duration: null,
        },
        orgId,
      )
      onSave(asset)
    } catch (err) {
      console.error('Failed to save YouTube asset:', err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 10 }}
        transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md rounded-2xl overflow-hidden flex flex-col"
        style={{
          background: 'var(--bg-1)',
          border: '1px solid var(--line-2)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.55)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 h-[52px] shrink-0 border-b"
          style={{ borderColor: 'var(--line-1)' }}
        >
          <div className="flex items-center gap-2.5">
            <Youtube size={15} style={{ color: '#ff0000' }} />
            <span className="text-sm font-medium" style={{ color: 'var(--fg-0)' }}>
              Add YouTube video
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg transition-colors hover:bg-[var(--tint-3)]"
            style={{ color: 'var(--fg-3)' }}
          >
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <AnimatePresence mode="wait">
          {step === 'input' ? (
            <motion.div
              key="input"
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.15 }}
              className="px-5 pt-5 pb-6 space-y-4"
            >
              <p className="text-[12px] leading-relaxed" style={{ color: 'var(--fg-3)' }}>
                Paste a YouTube video URL to link it as an asset in your scenario. BranchLab stores only the video ID — the video stays on YouTube.
              </p>

              <div className="space-y-1.5">
                <label className="text-[10px] font-mono tracking-widest uppercase" style={{ color: 'var(--fg-4)' }}>
                  YouTube URL
                </label>
                <div className="relative flex items-center">
                  <div className="absolute left-3 pointer-events-none" style={{ color: 'var(--fg-4)' }}>
                    <Link size={12} />
                  </div>
                  <input
                    ref={inputRef}
                    value={url}
                    onChange={e => handleUrlChange(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleNext() }}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="w-full pl-8 pr-3 py-2.5 rounded-xl text-sm font-mono outline-none transition-colors"
                    style={{
                      background: 'var(--tint-1)',
                      border: `1px solid ${urlError ? 'oklch(70% 0.18 25 / 0.5)' : 'var(--line-2)'}`,
                      color: 'var(--fg-0)',
                    }}
                    spellCheck={false}
                    autoComplete="off"
                  />
                </div>
                {urlError && (
                  <p className="text-[11px] font-mono" style={{ color: 'oklch(70% 0.18 25)' }}>
                    {urlError}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between pt-1">
                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-mono transition-all hover:bg-[var(--tint-3)]"
                  style={{ border: '1px solid var(--line-2)', color: 'var(--fg-3)' }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleNext}
                  disabled={!url.trim()}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-mono font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{
                    background: 'oklch(82% 0.18 165)',
                    color: '#052916',
                  }}
                >
                  Add video
                  <ArrowRight size={12} />
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="preview"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 12 }}
              transition={{ duration: 0.15 }}
              className="px-5 pt-5 pb-6 space-y-4"
            >
              {/* Thumbnail card */}
              <div
                className="rounded-xl overflow-hidden border"
                style={{ border: '1px solid var(--line-2)' }}
              >
                {videoId && (
                  <div className="relative bg-black" style={{ aspectRatio: '16/9' }}>
                    <img
                      src={`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`}
                      alt="YouTube video thumbnail"
                      className="w-full h-full object-cover"
                    />
                    {/* YT overlay badge */}
                    <div className="absolute top-2 left-2">
                      <span
                        className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-mono font-medium"
                        style={{ background: 'rgba(0,0,0,0.7)', color: 'white' }}
                      >
                        <Youtube size={10} style={{ color: '#ff0000' }} />
                        YouTube
                      </span>
                    </div>
                  </div>
                )}
                <div
                  className="px-3 py-2.5"
                  style={{ background: 'var(--tint-1)' }}
                >
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--fg-1)' }}>
                    YouTube video: {videoId}
                  </p>
                  <p className="text-[10px] font-mono mt-0.5 truncate" style={{ color: 'var(--fg-4)' }}>
                    Linked from YouTube · {url}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <button
                  onClick={() => { setStep('input'); setUrlError(null) }}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-mono transition-all hover:bg-[var(--tint-3)]"
                  style={{ border: '1px solid var(--line-2)', color: 'var(--fg-3)' }}
                >
                  <ArrowLeft size={12} />
                  Back
                </button>
                <button
                  onClick={handleAdd}
                  disabled={saving}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-mono font-medium transition-all disabled:opacity-60"
                  style={{
                    background: 'oklch(82% 0.18 165)',
                    color: '#052916',
                  }}
                >
                  {saving ? <Loader2 size={12} className="animate-spin" /> : <Youtube size={12} />}
                  Add to assets
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
