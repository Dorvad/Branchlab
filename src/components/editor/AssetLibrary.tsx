'use client'

import { useRef, useState, useCallback, useId } from 'react'
import { X, Upload, Film, Trash2, Link2, Info } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  uploadClip, deleteClip,
  formatFileSize, formatDuration, ACCEPTED_EXTENSIONS,
  type UploadProgress,
} from '@/lib/supabase/clips'
import type { Clip } from '@/types'

interface AssetLibraryProps {
  clips: Clip[]
  selectedNodeTitle: string | null
  canAttach: boolean
  onAddClip: (clip: Clip) => void
  onRemoveClip: (id: string) => void
  onAttachToNode: (clipId: string) => void
  onClose: () => void
}

interface UploadItem {
  name: string
  progress: number // 0–100
  error?: string
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
  const [uploads, setUploads] = useState<UploadItem[]>([])

  const processFiles = useCallback(async (files: File[]) => {
    const items: UploadItem[] = files.map(f => ({ name: f.name, progress: 0 }))
    setUploads(items)

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      try {
        const clip = await uploadClip(file, (p: UploadProgress) => {
          const pct = Math.round((p.loaded / p.total) * 100)
          setUploads(prev => prev.map((u, idx) => idx === i ? { ...u, progress: pct } : u))
        })
        setUploads(prev => prev.map((u, idx) => idx === i ? { ...u, progress: 100 } : u))
        onAddClip(clip)
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Upload failed'
        setUploads(prev => prev.map((u, idx) => idx === i ? { ...u, error: msg } : u))
      }
    }

    // Clear completed uploads after a brief delay
    setTimeout(() => {
      setUploads(prev => prev.filter(u => u.error))
    }, 1500)
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
    if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const files = Array.from(e.dataTransfer.files).filter(f =>
      ['video/mp4', 'video/webm', 'video/quicktime'].includes(f.type)
    )
    if (files.length) processFiles(files)
  }, [processFiles])

  const handleRemove = useCallback(async (clip: Clip) => {
    try {
      await deleteClip(clip.id, clip.storagePath)
      onRemoveClip(clip.id)
    } catch {
      // silently ignore — the clip row will be gone from the list on next load
      onRemoveClip(clip.id)
    }
  }, [onRemoveClip])

  const isUploading = uploads.some(u => !u.error && u.progress < 100)

  return (
    <motion.aside
      initial={{ x: 340 }}
      animate={{ x: 0 }}
      exit={{ x: 340 }}
      transition={{ type: 'spring', stiffness: 380, damping: 38 }}
      className="fixed top-[52px] right-0 bottom-[34px] z-40 flex flex-col w-[340px] border-l overflow-hidden"
      style={{
        background: 'var(--bg-0)',
        borderColor: 'var(--line-1)',
        boxShadow: '-8px 0 32px rgba(0,0,0,0.4)',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 h-[44px] shrink-0 border-b"
        style={{ borderColor: 'var(--line-1)' }}
      >
        <div className="flex items-center gap-2">
          <Film size={13} style={{ color: 'var(--fg-2)' }} />
          <span className="text-xs font-mono text-ink-2 tracking-wider uppercase">
            Asset Library
          </span>
        </div>
        <button onClick={onClose} className="text-ink-3 hover:text-ink-1 transition-colors p-1">
          <X size={14} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-4">

          {/* Drop zone */}
          <div
            className="relative flex flex-col items-center justify-center gap-3 p-6 rounded-xl border-2 border-dashed cursor-pointer transition-all"
            style={{
              borderColor: isDragging ? 'oklch(82% 0.18 165 / 0.5)' : 'var(--line-2)',
              background: isDragging ? 'oklch(82% 0.18 165 / 0.04)' : 'var(--tint-1)',
              pointerEvents: isUploading ? 'none' : undefined,
              opacity: isUploading ? 0.6 : 1,
            }}
            onClick={() => !isUploading && fileInputRef.current?.click()}
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
              style={{ background: 'var(--tint-2)', border: '1px solid var(--line-2)' }}
            >
              {isUploading ? (
                <div className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white/60 animate-spin" />
              ) : (
                <Upload size={16} style={{ color: 'var(--fg-2)' }} />
              )}
            </div>
            <div className="text-center">
              <p className="text-[12px] font-medium" style={{ color: 'var(--fg-1)' }}>
                {isUploading ? 'Uploading…' : 'Add videos'}
              </p>
              <p className="text-[10px] mt-0.5 font-mono" style={{ color: 'var(--fg-3)' }}>
                MP4 · WebM · MOV · max 500 MB
              </p>
            </div>
          </div>

          {/* Upload progress */}
          <AnimatePresence>
            {uploads.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-2"
              >
                {uploads.map((u, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono text-ink-3 truncate max-w-[220px]">
                        {u.name.length > 28 ? u.name.slice(0, 25) + '…' : u.name}
                      </span>
                      {u.error ? (
                        <span className="text-[10px]" style={{ color: 'oklch(70% 0.18 25)' }}>failed</span>
                      ) : (
                        <span className="text-[10px] font-mono text-ink-4">{u.progress}%</span>
                      )}
                    </div>
                    {!u.error && (
                      <div className="h-0.5 rounded-full overflow-hidden" style={{ background: 'var(--tint-3)' }}>
                        <div
                          className="h-full rounded-full transition-all duration-100"
                          style={{
                            width: `${u.progress}%`,
                            background: u.progress === 100 ? 'oklch(82% 0.18 165)' : 'oklch(82% 0.18 165 / 0.6)',
                          }}
                        />
                      </div>
                    )}
                    {u.error && (
                      <p className="text-[10px] leading-relaxed px-2 py-1 rounded-lg"
                        style={{ background: 'oklch(70% 0.18 25 / 0.08)', color: 'oklch(70% 0.18 25)' }}>
                        {u.error}
                      </p>
                    )}
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
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: 'var(--tint-1)', border: '1px solid var(--line-1)' }}>
              <Info size={11} style={{ color: 'var(--fg-3)', flexShrink: 0 }} />
              <p className="text-[11px]" style={{ color: 'var(--fg-3)' }}>Select a node to attach clips</p>
            </div>
          )}

          {/* Clip list */}
          {clips.length === 0 && uploads.length === 0 ? (
            <div className="py-8 text-center">
              <Film size={24} className="mx-auto mb-3 opacity-20" style={{ color: 'var(--fg-2)' }} />
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
                  onRemove={() => handleRemove(clip)}
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
  clip: Clip
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
      style={{ background: 'var(--tint-1)', border: '1px solid var(--line-1)' }}
    >
      {/* Video thumbnail */}
      <div className="relative h-28 overflow-hidden" style={{ background: 'var(--bg-1)' }}>
        <video
          className="w-full h-full object-cover opacity-90"
          src={clip.url}
          muted
          playsInline
          preload="metadata"
          onLoadedMetadata={e => { (e.target as HTMLVideoElement).currentTime = 1 }}
          crossOrigin="anonymous"
        />
        <div
          className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded font-mono text-[10px]"
          style={{ background: 'rgba(0,0,0,0.7)', color: 'var(--fg-1)' }}
        >
          {formatDuration(clip.duration)}
        </div>
        <div
          className="absolute top-2 left-2 px-1.5 py-0.5 rounded font-mono text-[9px] tracking-wider"
          style={{ background: 'rgba(0,0,0,0.6)', color: 'var(--fg-2)', border: '1px solid var(--line-2)' }}
        >
          {ext}
        </div>
      </div>

      {/* Metadata */}
      <div className="px-3 py-2.5">
        <p className="text-[12px] font-medium leading-snug mb-1" style={{ color: 'var(--fg-1)' }} title={clip.name}>
          {truncatedName}
        </p>
        <p className="text-[10px] font-mono" style={{ color: 'var(--fg-3)' }}>
          {formatFileSize(clip.size)}
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 px-3 pb-3">
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
          style={{ background: 'var(--tint-2)', border: '1px solid var(--line-1)', color: 'var(--fg-3)' }}
          title="Remove clip"
        >
          <Trash2 size={11} />
        </button>
      </div>
    </div>
  )
}
