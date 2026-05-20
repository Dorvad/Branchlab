'use client'

import { useRef, useState, useCallback, useId } from 'react'
import { X, Upload, Film, Trash2, AlertTriangle, Link2, Info } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  createClipFromFile, addClip as storeAddClip, removeClip as storeRemoveClip,
  formatFileSize, formatDuration, ACCEPTED_EXTENSIONS,
} from '@/lib/clip-store'
import type { VideoClip } from '@/types'

interface AssetLibraryProps {
  clips: VideoClip[]
  selectedNodeTitle: string | null   // name of currently selected node, or null
  canAttach: boolean                  // true if a node is selected
  onAddClip: (clip: VideoClip) => void
  onRemoveClip: (id: string) => void
  onAttachToNode: (clipId: string) => void
  onClose: () => void
}

export function AssetLibrary({
  clips,
  selectedNodeTitle,
  canAttach,
  onAddClip,
  onRemoveClip,
  onAttachToNode,
  onClose,
}: AssetLibraryProps) {
  const fileInputId = useId()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [errors, setErrors] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  const processFiles = useCallback(async (files: File[]) => {
    setLoading(true)
    setErrors([])
    const newErrors: string[] = []

    for (const file of files) {
      try {
        const clip = await createClipFromFile(file)
        storeAddClip(clip)
        onAddClip(clip)
      } catch (err) {
        newErrors.push(`${file.name}: ${err instanceof Error ? err.message : 'Unknown error'}`)
      }
    }

    if (newErrors.length) setErrors(newErrors)
    setLoading(false)
  }, [onAddClip])

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (files.length) processFiles(files)
    e.target.value = ''
  }, [processFiles])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragging(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const files = Array.from(e.dataTransfer.files).filter(f =>
      ['video/mp4', 'video/webm', 'video/quicktime'].includes(f.type)
    )
    if (files.length) processFiles(files)
  }, [processFiles])

  const handleRemove = useCallback((id: string) => {
    storeRemoveClip(id)
    onRemoveClip(id)
  }, [onRemoveClip])

  return (
    <motion.aside
      initial={{ x: 340 }}
      animate={{ x: 0 }}
      exit={{ x: 340 }}
      transition={{ type: 'spring', stiffness: 380, damping: 38 }}
      className="fixed top-[52px] right-0 bottom-[34px] z-40 flex flex-col w-[340px] border-l overflow-hidden"
      style={{
        background: '#09090e',
        borderColor: 'rgba(255,255,255,0.07)',
        boxShadow: '-8px 0 32px rgba(0,0,0,0.4)',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 h-[44px] shrink-0 border-b"
        style={{ borderColor: 'rgba(255,255,255,0.07)' }}
      >
        <div className="flex items-center gap-2">
          <Film size={13} style={{ color: '#8a90a4' }} />
          <span className="text-xs font-mono text-ink-2 tracking-wider uppercase">
            Asset Library
          </span>
          <span
            className="px-1.5 py-0.5 rounded text-[9px] font-mono tracking-wider uppercase"
            style={{ background: 'oklch(80% 0.16 60 / 0.12)', color: 'oklch(80% 0.16 60)', border: '1px solid oklch(80% 0.16 60 / 0.25)' }}
          >
            Session
          </span>
        </div>
        <button onClick={onClose} className="text-ink-3 hover:text-ink-1 transition-colors p-1">
          <X size={14} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-4">

          {/* Session warning */}
          <div
            className="flex items-start gap-2.5 px-3.5 py-3 rounded-xl"
            style={{ background: 'oklch(80% 0.16 60 / 0.06)', border: '1px solid oklch(80% 0.16 60 / 0.2)' }}
          >
            <AlertTriangle size={12} className="mt-0.5 shrink-0" style={{ color: 'oklch(80% 0.16 60)' }} />
            <p className="text-[11px] leading-relaxed" style={{ color: '#8a90a4' }}>
              Local videos live only in this browser tab. They are not saved and will disappear on page refresh.
            </p>
          </div>

          {/* Drop zone */}
          <div
            className="relative flex flex-col items-center justify-center gap-3 p-6 rounded-xl border-2 border-dashed cursor-pointer transition-all"
            style={{
              borderColor: isDragging ? 'oklch(82% 0.18 165 / 0.5)' : 'rgba(255,255,255,0.1)',
              background: isDragging ? 'oklch(82% 0.18 165 / 0.04)' : 'rgba(255,255,255,0.02)',
            }}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <input
              id={fileInputId}
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_EXTENSIONS}
              multiple
              className="sr-only"
              onChange={handleFileInput}
            />
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              {loading ? (
                <div className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white/60 animate-spin" />
              ) : (
                <Upload size={16} style={{ color: '#8a90a4' }} />
              )}
            </div>
            <div className="text-center">
              <p className="text-[12px] font-medium" style={{ color: '#c9cdda' }}>
                {loading ? 'Processing…' : 'Add videos'}
              </p>
              <p className="text-[10px] mt-0.5 font-mono" style={{ color: '#5c6273' }}>
                MP4 · WebM · MOV · max 500 MB
              </p>
            </div>
          </div>

          {/* Errors */}
          <AnimatePresence>
            {errors.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-1.5"
              >
                {errors.map((err, i) => (
                  <div
                    key={i}
                    className="px-3 py-2 rounded-lg text-[11px] leading-relaxed"
                    style={{ background: 'oklch(70% 0.18 25 / 0.08)', border: '1px solid oklch(70% 0.18 25 / 0.25)', color: 'oklch(70% 0.18 25)' }}
                  >
                    {err}
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Attach context */}
          {canAttach && selectedNodeTitle && (
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-xl"
              style={{ background: 'oklch(82% 0.18 165 / 0.06)', border: '1px solid oklch(82% 0.18 165 / 0.2)' }}
            >
              <Link2 size={11} style={{ color: 'oklch(82% 0.18 165)', flexShrink: 0 }} />
              <p className="text-[11px] leading-snug" style={{ color: 'oklch(82% 0.18 165)' }}>
                Attaches to <span className="font-medium">&quot;{selectedNodeTitle}&quot;</span>
              </p>
            </div>
          )}

          {!canAttach && clips.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <Info size={11} style={{ color: '#5c6273', flexShrink: 0 }} />
              <p className="text-[11px]" style={{ color: '#5c6273' }}>
                Select a node to attach clips
              </p>
            </div>
          )}

          {/* Clip list */}
          {clips.length === 0 ? (
            <div
              className="py-8 text-center"
            >
              <Film size={24} className="mx-auto mb-3 opacity-20" style={{ color: '#8a90a4' }} />
              <p className="text-[11px] font-mono text-ink-4">No clips yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {clips.map(clip => (
                <ClipCard
                  key={clip.id}
                  clip={clip}
                  canAttach={canAttach}
                  onAttach={() => onAttachToNode(clip.id)}
                  onRemove={() => handleRemove(clip.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.aside>
  )
}

// ── ClipCard ──────────────────────────────────────────────────────────────────

interface ClipCardProps {
  clip: VideoClip
  canAttach: boolean
  onAttach: () => void
  onRemove: () => void
}

function ClipCard({ clip, canAttach, onAttach, onRemove }: ClipCardProps) {
  const ext = clip.name.split('.').pop()?.toUpperCase() ?? 'VIDEO'
  const truncatedName = clip.name.length > 32 ? clip.name.slice(0, 29) + '…' : clip.name

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
    >
      {/* Video thumbnail */}
      <div className="relative h-28 overflow-hidden" style={{ background: '#0c0d12' }}>
        <video
          className="w-full h-full object-cover opacity-90"
          src={clip.objectUrl}
          muted
          playsInline
          preload="metadata"
          onLoadedMetadata={e => { (e.target as HTMLVideoElement).currentTime = 1 }}
        />
        {/* Duration badge */}
        <div
          className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded font-mono text-[10px]"
          style={{ background: 'rgba(0,0,0,0.7)', color: '#c9cdda' }}
        >
          {formatDuration(clip.duration)}
        </div>
        {/* Format badge */}
        <div
          className="absolute top-2 left-2 px-1.5 py-0.5 rounded font-mono text-[9px] tracking-wider"
          style={{ background: 'rgba(0,0,0,0.6)', color: '#8a90a4', border: '1px solid rgba(255,255,255,0.1)' }}
        >
          {ext}
        </div>
      </div>

      {/* Metadata */}
      <div className="px-3 py-2.5">
        <p className="text-[12px] font-medium leading-snug mb-1" style={{ color: '#c9cdda' }} title={clip.name}>
          {truncatedName}
        </p>
        <p className="text-[10px] font-mono" style={{ color: '#5c6273' }}>
          {formatFileSize(clip.size)}
        </p>
      </div>

      {/* Actions */}
      <div
        className="flex items-center gap-2 px-3 pb-3"
      >
        {canAttach && (
          <button
            onClick={onAttach}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-mono transition-all hover:brightness-110"
            style={{
              background: 'oklch(82% 0.18 165 / 0.1)',
              border: '1px solid oklch(82% 0.18 165 / 0.25)',
              color: 'oklch(82% 0.18 165)',
            }}
          >
            <Link2 size={10} />
            Attach
          </button>
        )}
        <button
          onClick={onRemove}
          className="flex items-center justify-center w-7 h-7 rounded-lg transition-colors hover:text-red-400"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: '#5c6273' }}
          title="Remove clip"
        >
          <Trash2 size={11} />
        </button>
      </div>
    </div>
  )
}
