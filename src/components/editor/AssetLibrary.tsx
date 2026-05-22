'use client'

import { useRef, useState, useCallback, useId } from 'react'
import { X, Upload, Film, Trash2, Link2, Info, Search, Check, RefreshCw } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  uploadClip, deleteClip,
  formatFileSize, formatDuration,
  ACCEPTED_EXTENSIONS, LARGE_FILE_WARNING_BYTES,
  type UploadProgress,
} from '@/lib/supabase/clips'
import type { Clip, ClipUploadStatus } from '@/types'

interface AssetLibraryProps {
  clips: Clip[]
  selectedNodeTitle: string | null
  canAttach: boolean
  nodeClipId?: string
  onAddClip: (clip: Clip) => void
  onRemoveClip: (id: string) => void
  onAttachToNode: (clipId: string) => void
  onClose: () => void
}

interface UploadItem {
  id: string
  name: string
  progress: number
  status: ClipUploadStatus
  error?: string
}

export function AssetLibrary({
  clips,
  selectedNodeTitle,
  canAttach,
  nodeClipId,
  onAddClip,
  onRemoveClip,
  onAttachToNode,
  onClose,
}: AssetLibraryProps) {
  const fileInputId = useId()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [uploads, setUploads] = useState<UploadItem[]>([])
  const [search, setSearch] = useState('')

  const filteredClips = search.trim()
    ? clips.filter(c => c.name.toLowerCase().includes(search.toLowerCase()))
    : clips

  const processFiles = useCallback(async (files: File[]) => {
    const newItems: UploadItem[] = files.map(f => ({
      id: crypto.randomUUID(),
      name: f.name,
      progress: 0,
      status: 'uploading' as ClipUploadStatus,
    }))
    setUploads(prev => [...prev, ...newItems])

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const itemId = newItems[i].id
      const update = (patch: Partial<UploadItem>) =>
        setUploads(prev => prev.map(u => u.id === itemId ? { ...u, ...patch } : u))

      try {
        const clip = await uploadClip(
          file,
          (p: UploadProgress) => update({ progress: Math.round((p.loaded / p.total) * 100) }),
          (status: ClipUploadStatus) => update({ status }),
        )
        update({ progress: 100, status: 'ready' })
        onAddClip(clip)
      } catch (err) {
        update({ status: 'failed', error: err instanceof Error ? err.message : 'Upload failed' })
      }
    }

    setTimeout(() => {
      setUploads(prev => prev.filter(u => u.status === 'failed'))
    }, 2000)
  }, [onAddClip])

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (files.length) processFiles(files)
    e.target.value = ''
  }, [processFiles])

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
    } catch (err) {
      console.error('Failed to delete clip:', err)
    }
  }, [onRemoveClip])

  const isUploading = uploads.some(u => u.status === 'uploading' || u.status === 'processing')

  return (
    <motion.aside
      initial={{ x: 340 }}
      animate={{ x: 0 }}
      exit={{ x: 340 }}
      transition={{ type: 'spring', stiffness: 380, damping: 38 }}
      className="fixed top-[52px] right-0 bottom-[34px] z-40 flex flex-col w-[340px] border-l overflow-hidden"
      style={{ background: 'var(--bg-0)', borderColor: 'var(--line-1)', boxShadow: '-8px 0 32px rgba(0,0,0,0.4)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-[44px] shrink-0 border-b" style={{ borderColor: 'var(--line-1)' }}>
        <div className="flex items-center gap-2">
          <Film size={13} style={{ color: 'var(--fg-2)' }} />
          <span className="text-xs font-mono text-ink-2 tracking-wider uppercase">Asset Library</span>
        </div>
        <button onClick={onClose} className="text-ink-3 hover:text-ink-1 transition-colors p-1">
          <X size={14} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-3">

          {/* Drop zone */}
          <div
            className="relative flex flex-col items-center justify-center gap-3 p-5 rounded-xl border-2 border-dashed cursor-pointer transition-all"
            style={{
              borderColor: isDragging ? 'oklch(82% 0.18 165 / 0.5)' : 'var(--line-2)',
              background: isDragging ? 'oklch(82% 0.18 165 / 0.04)' : 'var(--tint-1)',
              opacity: isUploading ? 0.6 : 1,
              pointerEvents: isUploading ? 'none' : undefined,
            }}
            onClick={() => !isUploading && fileInputRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
            onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragging(false) }}
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
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'var(--tint-2)', border: '1px solid var(--line-2)' }}>
              {isUploading
                ? <div className="w-3.5 h-3.5 rounded-full border-2 border-white/20 border-t-white/60 animate-spin" />
                : <Upload size={14} style={{ color: 'var(--fg-2)' }} />}
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

          {/* Upload status rows */}
          <AnimatePresence>
            {uploads.length > 0 && (
              <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-2">
                {uploads.map(u => (
                  <UploadStatusRow key={u.id} item={u} />
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Attach context banner */}
          {canAttach && selectedNodeTitle && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: 'oklch(82% 0.18 165 / 0.06)', border: '1px solid oklch(82% 0.18 165 / 0.2)' }}>
              <Link2 size={11} style={{ color: 'oklch(82% 0.18 165)', flexShrink: 0 }} />
              <p className="text-[11px] leading-snug" style={{ color: 'oklch(82% 0.18 165)' }}>
                {nodeClipId ? 'Replace clip on' : 'Attach to'}{' '}
                <span className="font-medium">&quot;{selectedNodeTitle}&quot;</span>
              </p>
            </div>
          )}
          {!canAttach && clips.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: 'var(--tint-1)', border: '1px solid var(--line-1)' }}>
              <Info size={11} style={{ color: 'var(--fg-3)', flexShrink: 0 }} />
              <p className="text-[11px]" style={{ color: 'var(--fg-3)' }}>Select a node to attach clips</p>
            </div>
          )}

          {/* Search */}
          {clips.length > 3 && (
            <div className="relative">
              <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--fg-4)' }} />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Filter clips…"
                className="w-full pl-7 pr-3 py-2 rounded-lg text-[12px] outline-none transition-colors"
                style={{ background: 'var(--tint-1)', border: '1px solid var(--line-2)', color: 'var(--fg-1)' }}
              />
            </div>
          )}

          {/* Clip list */}
          {clips.length === 0 && uploads.length === 0 ? (
            <div className="py-8 text-center">
              <Film size={24} className="mx-auto mb-3 opacity-20" style={{ color: 'var(--fg-2)' }} />
              <p className="text-[11px] font-mono text-ink-4">No clips yet</p>
            </div>
          ) : filteredClips.length === 0 ? (
            <div className="py-6 text-center">
              <p className="text-[11px] font-mono" style={{ color: 'var(--fg-4)' }}>No clips match &ldquo;{search}&rdquo;</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredClips.map(clip => (
                <ClipCard
                  key={clip.id}
                  clip={clip}
                  canAttach={canAttach}
                  nodeClipId={nodeClipId}
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

// ── UploadStatusRow ───────────────────────────────────────────────────────────

function UploadStatusRow({ item }: { item: UploadItem }) {
  const STATUS_LABEL: Record<ClipUploadStatus, string> = {
    uploading:  'Uploading…',
    processing: 'Generating thumbnail…',
    ready:      'Ready',
    failed:     'Failed',
  }
  const STATUS_COLOR: Record<ClipUploadStatus, string> = {
    uploading:  'var(--fg-3)',
    processing: 'oklch(78% 0.18 285)',
    ready:      'oklch(82% 0.18 165)',
    failed:     'oklch(70% 0.18 25)',
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-mono truncate" style={{ color: 'var(--fg-2)', maxWidth: 190 }}>
          {item.name.length > 28 ? item.name.slice(0, 25) + '…' : item.name}
        </span>
        <span className="text-[10px] font-mono shrink-0" style={{ color: STATUS_COLOR[item.status] }}>
          {item.status === 'uploading' ? `${item.progress}%` : STATUS_LABEL[item.status]}
        </span>
      </div>

      {item.status === 'uploading' && (
        <div className="h-0.5 rounded-full overflow-hidden" style={{ background: 'var(--tint-3)' }}>
          <div
            className="h-full rounded-full transition-all duration-100"
            style={{ width: `${item.progress}%`, background: 'oklch(82% 0.18 165 / 0.7)' }}
          />
        </div>
      )}
      {item.status === 'processing' && (
        <div className="h-0.5 rounded-full overflow-hidden" style={{ background: 'var(--tint-3)' }}>
          <motion.div
            className="h-full rounded-full"
            style={{ background: 'oklch(78% 0.18 285 / 0.7)' }}
            animate={{ width: ['30%', '85%', '30%'] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>
      )}
      {item.error && (
        <p className="text-[10px] px-2 py-1 rounded-lg" style={{ background: 'oklch(70% 0.18 25 / 0.08)', color: 'oklch(70% 0.18 25)' }}>
          {item.error}
        </p>
      )}
    </div>
  )
}

// ── ClipCard ──────────────────────────────────────────────────────────────────

function ClipCard({
  clip, canAttach, nodeClipId, onAttach, onRemove,
}: {
  clip: Clip
  canAttach: boolean
  nodeClipId?: string
  onAttach: () => void
  onRemove: () => void
}) {
  const isAttached = nodeClipId === clip.id
  const wouldReplace = canAttach && !!nodeClipId && nodeClipId !== clip.id
  const ext = clip.name.split('.').pop()?.toUpperCase() ?? 'VIDEO'
  const truncatedName = clip.name.length > 32 ? clip.name.slice(0, 29) + '…' : clip.name

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: 'var(--tint-1)', border: `1px solid ${isAttached ? 'oklch(82% 0.18 165 / 0.4)' : 'var(--line-1)'}` }}>
      {/* Thumbnail / video preview */}
      <div className="relative h-28 overflow-hidden" style={{ background: 'var(--bg-1)' }}>
        {clip.thumbnailUrl ? (
          <img src={clip.thumbnailUrl} alt="" className="w-full h-full object-cover opacity-90" />
        ) : (
          <video
            className="w-full h-full object-cover opacity-90"
            src={clip.url}
            muted playsInline preload="metadata"
            onLoadedMetadata={e => { (e.target as HTMLVideoElement).currentTime = 1 }}
            crossOrigin="anonymous"
          />
        )}

        <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded font-mono text-[10px]" style={{ background: 'rgba(0,0,0,0.7)', color: 'var(--fg-1)' }}>
          {formatDuration(clip.duration)}
        </div>
        <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded font-mono text-[9px] tracking-wider" style={{ background: 'rgba(0,0,0,0.6)', color: 'var(--fg-2)', border: '1px solid var(--line-2)' }}>
          {ext}
        </div>

        {isAttached && (
          <div className="absolute top-2 right-2 flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-mono" style={{ background: 'oklch(82% 0.18 165)', color: '#052916' }}>
            <Check size={8} />
            Attached
          </div>
        )}
      </div>

      {/* Metadata */}
      <div className="px-3 py-2.5">
        <p className="text-[12px] font-medium leading-snug mb-1" style={{ color: 'var(--fg-1)' }} title={clip.name}>
          {truncatedName}
        </p>
        <p className="text-[10px] font-mono" style={{ color: 'var(--fg-3)' }}>
          {formatFileSize(clip.size)} · {formatDuration(clip.duration)}
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 px-3 pb-3">
        {canAttach && !isAttached && (
          <button
            onClick={onAttach}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-mono transition-all hover:brightness-110"
            style={{
              background: wouldReplace ? 'oklch(78% 0.18 285 / 0.1)' : 'oklch(82% 0.18 165 / 0.1)',
              border: `1px solid ${wouldReplace ? 'oklch(78% 0.18 285 / 0.3)' : 'oklch(82% 0.18 165 / 0.25)'}`,
              color: wouldReplace ? 'oklch(78% 0.18 285)' : 'oklch(82% 0.18 165)',
            }}
          >
            {wouldReplace ? <><RefreshCw size={10} /> Replace</> : <><Link2 size={10} /> Attach</>}
          </button>
        )}
        {canAttach && isAttached && (
          <div
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-mono"
            style={{ background: 'oklch(82% 0.18 165 / 0.06)', border: '1px solid oklch(82% 0.18 165 / 0.2)', color: 'oklch(82% 0.18 165)' }}
          >
            <Check size={10} />
            Attached
          </div>
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
