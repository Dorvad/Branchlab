'use client'

import { useRef, useState, useCallback, useId, useMemo } from 'react'
import { X, Upload, Film, Trash2, Link2, Info, Search, Check, RefreshCw, Youtube, Folder, Pencil, FolderPlus, ChevronDown, ChevronRight, Globe, Image } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  formatFileSize, formatDuration,
  ACCEPTED_EXTENSIONS, LARGE_FILE_WARNING_BYTES,
  type UploadProgress,
} from '@/lib/supabase/clips'
import { uploadClip, deleteClip } from '@/lib/persistence/clips'
import type { Clip, ClipUploadStatus, YouTubeAsset, PexelsAsset } from '@/types'
import { PexelsPanel } from './PexelsPanel'

// ── Folder localStorage helpers ────────────────────────────────────────────────

const FOLDER_KEY = 'branchlab:asset-folders'

function loadFolders(): Record<string, string> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(FOLDER_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch { return {} }
}

function persistFolders(map: Record<string, string>): void {
  if (typeof window === 'undefined') return
  try { localStorage.setItem(FOLDER_KEY, JSON.stringify(map)) } catch {}
}

// ── Types ──────────────────────────────────────────────────────────────────────

type LibraryTab = 'my-library' | 'stock'

interface AssetLibraryProps {
  scenarioId: string
  clips: Clip[]
  youtubeAssets: YouTubeAsset[]
  pexelsAssets: PexelsAsset[]
  selectedNodeTitle: string | null
  canAttach: boolean
  nodeClipId?: string
  nodeYoutubeAssetId?: string
  nodePexelsAssetId?: string
  onAddClip: (clip: Clip) => void
  onRemoveClip: (id: string) => void
  onAttachToNode: (clipId: string) => void
  onAddYouTubeAsset: (asset: YouTubeAsset) => void
  onRemoveYouTubeAsset: (id: string) => void
  onAttachYouTubeToNode: (assetId: string) => void
  onRenameClip: (id: string, name: string) => void
  onRenameYouTubeAsset: (id: string, title: string) => void
  onOpenAddYoutube: () => void
  onAddPexelsAsset: (asset: PexelsAsset) => void
  onRemovePexelsAsset: (id: string) => void
  onRenamePexelsAsset: (id: string, title: string) => void
  onAttachPexelsVideoToNode: (asset: PexelsAsset) => void
  onAttachPexelsPhotoToNode: (asset: PexelsAsset) => void
  onClose: () => void
}

interface UploadItem {
  id: string
  name: string
  progress: number
  status: ClipUploadStatus
  error?: string
  savedBytes?: number
}

// ── Main component ─────────────────────────────────────────────────────────────

export function AssetLibrary({
  scenarioId,
  clips,
  youtubeAssets,
  pexelsAssets,
  selectedNodeTitle,
  canAttach,
  nodeClipId,
  nodeYoutubeAssetId,
  nodePexelsAssetId,
  onAddClip,
  onRemoveClip,
  onAttachToNode,
  onAddYouTubeAsset: _onAddYouTubeAsset,
  onRemoveYouTubeAsset,
  onAttachYouTubeToNode,
  onRenameClip,
  onRenameYouTubeAsset,
  onOpenAddYoutube,
  onAddPexelsAsset,
  onRemovePexelsAsset,
  onRenamePexelsAsset,
  onAttachPexelsVideoToNode,
  onAttachPexelsPhotoToNode,
  onClose,
}: AssetLibraryProps) {
  const fileInputId = useId()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [activeTab, setActiveTab] = useState<LibraryTab>('my-library')
  const [isDragging, setIsDragging] = useState(false)
  const [uploads, setUploads] = useState<UploadItem[]>([])
  const [search, setSearch] = useState('')
  const [folders, setFolders] = useState<Record<string, string>>(loadFolders)
  const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(new Set())

  void LARGE_FILE_WARNING_BYTES

  const q = search.toLowerCase().trim()
  const filteredClips = q ? clips.filter(c => c.name.toLowerCase().includes(q)) : clips
  const filteredYoutube = q
    ? youtubeAssets.filter(a =>
        a.youtubeVideoId.toLowerCase().includes(q) ||
        (a.title ?? '').toLowerCase().includes(q)
      )
    : youtubeAssets
  const filteredPexels = q
    ? pexelsAssets.filter(a =>
        a.title.toLowerCase().includes(q) ||
        a.photographer.toLowerCase().includes(q)
      )
    : pexelsAssets

  const totalAssets = clips.length + youtubeAssets.length + pexelsAssets.length

  const folderNames = useMemo(() => [...new Set(Object.values(folders))].sort(), [folders])

  const clipsByFolder = useMemo(() => {
    const groups: Record<string, Clip[]> = {}
    const ungrouped: Clip[] = []
    filteredClips.forEach(c => {
      const f = folders[c.id]
      if (f) { (groups[f] ??= []).push(c) }
      else { ungrouped.push(c) }
    })
    return { groups, ungrouped }
  }, [filteredClips, folders])

  const youtubeByFolder = useMemo(() => {
    const groups: Record<string, YouTubeAsset[]> = {}
    const ungrouped: YouTubeAsset[] = []
    filteredYoutube.forEach(a => {
      const f = folders[a.id]
      if (f) { (groups[f] ??= []).push(a) }
      else { ungrouped.push(a) }
    })
    return { groups, ungrouped }
  }, [filteredYoutube, folders])

  const moveToFolder = useCallback((assetId: string, folderName: string | null) => {
    setFolders(prev => {
      const next = { ...prev }
      if (folderName) next[assetId] = folderName
      else delete next[assetId]
      persistFolders(next)
      return next
    })
  }, [])

  const toggleFolderCollapse = useCallback((name: string) => {
    setCollapsedFolders(prev => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }, [])

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
          scenarioId,
          file,
          (p: UploadProgress) => update({ progress: Math.round((p.loaded / p.total) * 100) }),
          (status: ClipUploadStatus) => update({ status }),
          (originalBytes, compressedBytes) => update({ savedBytes: originalBytes - compressedBytes }),
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

  const handleRemoveClip = useCallback(async (clip: Clip) => {
    try {
      await deleteClip(clip.id, clip.storagePath)
      onRemoveClip(clip.id)
      setFolders(prev => {
        const next = { ...prev }
        delete next[clip.id]
        persistFolders(next)
        return next
      })
    } catch (err) {
      console.error('Failed to delete clip:', err)
    }
  }, [onRemoveClip])

  const handleRemoveYoutube = useCallback((asset: YouTubeAsset) => {
    onRemoveYouTubeAsset(asset.id)
    setFolders(prev => {
      const next = { ...prev }
      delete next[asset.id]
      persistFolders(next)
      return next
    })
  }, [onRemoveYouTubeAsset])

  const isUploading = uploads.some(u => u.status === 'compressing' || u.status === 'uploading' || u.status === 'processing')

  const folderHasAssets = (name: string) =>
    (clipsByFolder.groups[name]?.length ?? 0) + (youtubeByFolder.groups[name]?.length ?? 0) > 0

  const visibleFolders = folderNames.filter(folderHasAssets)
  const hasUngrouped = clipsByFolder.ungrouped.length > 0 || youtubeByFolder.ungrouped.length > 0

  // Saved Pexels IDs set for Stock tab (to show checkmarks on already-saved items)
  const savedPexelsIds = useMemo(() => new Set(pexelsAssets.map(a => a.pexelsId)), [pexelsAssets])

  return (
    <motion.aside
      initial={{ width: 0 }}
      animate={{ width: 340 }}
      exit={{ width: 0 }}
      transition={{ type: 'spring', stiffness: 400, damping: 40 }}
      className="flex flex-col shrink-0 border-l overflow-hidden"
      style={{ background: 'var(--bg-0)', borderColor: 'var(--line-1)' }}
    >
      <div className="flex flex-col w-[340px] h-full">

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

        {/* Tab bar */}
        <div className="flex shrink-0 border-b" style={{ borderColor: 'var(--line-1)' }}>
          {([
            { id: 'my-library' as LibraryTab, label: 'My Library', icon: <Film size={10} /> },
            { id: 'stock' as LibraryTab, label: 'Stock', icon: <Globe size={10} /> },
          ] as const).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-mono relative transition-colors"
              style={{ color: activeTab === tab.id ? 'var(--fg-0)' : 'var(--fg-3)' }}
            >
              {tab.icon}
              {tab.label}
              {activeTab === tab.id && (
                <div
                  className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t-full"
                  style={{ background: 'oklch(82% 0.18 165)' }}
                />
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === 'stock' ? (
          <div className="flex-1 overflow-hidden">
            <PexelsPanel
              savedPexelsIds={savedPexelsIds}
              onSaveAsset={onAddPexelsAsset}
            />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            <div className="p-3 space-y-3">

              {/* Drop zone */}
              <div
                className="relative flex flex-col items-center justify-center gap-2.5 p-4 rounded-xl border-2 border-dashed cursor-pointer transition-all"
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
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'var(--tint-2)', border: '1px solid var(--line-2)' }}>
                  {isUploading
                    ? <div className="w-3 h-3 rounded-full border-2 border-white/20 border-t-white/60 animate-spin" />
                    : <Upload size={13} style={{ color: 'var(--fg-2)' }} />}
                </div>
                <div className="text-center">
                  <p className="text-[11px] font-medium" style={{ color: 'var(--fg-1)' }}>
                    {uploads.some(u => u.status === 'compressing') ? 'Compressing…'
                      : isUploading ? 'Uploading…'
                      : 'Upload video'}
                  </p>
                  <p className="text-[10px] mt-0.5 font-mono" style={{ color: 'var(--fg-3)' }}>
                    MP4 · WebM · MOV
                  </p>
                </div>
              </div>

              {/* Add YouTube URL */}
              <button
                onClick={onOpenAddYoutube}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-[11px] font-mono transition-all hover:brightness-110"
                style={{
                  background: 'rgba(255,0,0,0.06)',
                  border: '1px solid rgba(255,0,0,0.2)',
                  color: '#ff5555',
                }}
              >
                <Youtube size={11} />
                Add YouTube URL
              </button>

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
                  <Link2 size={10} style={{ color: 'oklch(82% 0.18 165)', flexShrink: 0 }} />
                  <p className="text-[10px] leading-snug" style={{ color: 'oklch(82% 0.18 165)' }}>
                    {(nodeClipId || nodeYoutubeAssetId || nodePexelsAssetId) ? 'Replace clip on' : 'Attach to'}{' '}
                    <span className="font-medium">&quot;{selectedNodeTitle}&quot;</span>
                  </p>
                </div>
              )}
              {!canAttach && totalAssets > 0 && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: 'var(--tint-1)', border: '1px solid var(--line-1)' }}>
                  <Info size={10} style={{ color: 'var(--fg-3)', flexShrink: 0 }} />
                  <p className="text-[10px]" style={{ color: 'var(--fg-3)' }}>Select a node to attach clips</p>
                </div>
              )}

              {/* Search */}
              {totalAssets > 3 && (
                <div className="relative">
                  <Search size={10} className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--fg-4)' }} />
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Filter assets…"
                    className="w-full pl-7 pr-3 py-1.5 rounded-lg text-[11px] outline-none transition-colors"
                    style={{ background: 'var(--tint-1)', border: '1px solid var(--line-2)', color: 'var(--fg-1)' }}
                  />
                </div>
              )}

              {/* Empty state */}
              {totalAssets === 0 && uploads.length === 0 && (
                <div className="py-8 text-center">
                  <Film size={22} className="mx-auto mb-3 opacity-20" style={{ color: 'var(--fg-2)' }} />
                  <p className="text-[11px] font-mono text-ink-4">No assets yet</p>
                  <p className="text-[10px] mt-1 font-mono" style={{ color: 'var(--fg-4)' }}>
                    Upload files, add a YouTube link,<br />or browse the Stock tab
                  </p>
                </div>
              )}

              {/* No search results */}
              {q && filteredClips.length === 0 && filteredYoutube.length === 0 && filteredPexels.length === 0 && (
                <div className="py-6 text-center">
                  <p className="text-[11px] font-mono" style={{ color: 'var(--fg-4)' }}>No assets match &ldquo;{search}&rdquo;</p>
                </div>
              )}

              {/* ── Folder sections ──────────────────────────────────────── */}
              {visibleFolders.map(name => {
                const folderClips = clipsByFolder.groups[name] ?? []
                const folderYoutube = youtubeByFolder.groups[name] ?? []
                const isCollapsed = collapsedFolders.has(name)
                const count = folderClips.length + folderYoutube.length
                return (
                  <div key={name} className="space-y-1.5">
                    <button
                      onClick={() => toggleFolderCollapse(name)}
                      className="w-full flex items-center gap-1.5 py-1 px-1 rounded-lg transition-colors hover:bg-[var(--tint-2)]"
                    >
                      <Folder size={11} style={{ color: 'var(--fg-3)' }} />
                      <span className="flex-1 text-left text-[11px] font-mono text-ink-2 truncate">{name}</span>
                      <span className="text-[9px] font-mono text-ink-4 mr-1">{count}</span>
                      {isCollapsed
                        ? <ChevronRight size={10} style={{ color: 'var(--fg-4)' }} />
                        : <ChevronDown size={10} style={{ color: 'var(--fg-4)' }} />}
                    </button>
                    {!isCollapsed && (
                      <div className="space-y-1.5 pl-3 border-l" style={{ borderColor: 'var(--line-1)' }}>
                        {folderYoutube.map(asset => (
                          <YouTubeCard
                            key={asset.id}
                            asset={asset}
                            canAttach={canAttach}
                            nodeYoutubeAssetId={nodeYoutubeAssetId}
                            nodeClipId={nodeClipId}
                            folderName={name}
                            allFolderNames={folderNames}
                            onAttach={() => onAttachYouTubeToNode(asset.id)}
                            onRemove={() => handleRemoveYoutube(asset)}
                            onRename={title => onRenameYouTubeAsset(asset.id, title)}
                            onMoveToFolder={f => moveToFolder(asset.id, f)}
                          />
                        ))}
                        {folderClips.map(clip => (
                          <ClipCard
                            key={clip.id}
                            clip={clip}
                            canAttach={canAttach}
                            nodeClipId={nodeClipId}
                            folderName={name}
                            allFolderNames={folderNames}
                            onAttach={() => onAttachToNode(clip.id)}
                            onRemove={() => handleRemoveClip(clip)}
                            onRename={n => onRenameClip(clip.id, n)}
                            onMoveToFolder={f => moveToFolder(clip.id, f)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}

              {/* ── Ungrouped uploads & YouTube ──────────────────────────── */}
              {hasUngrouped && (
                <div className="space-y-1.5">
                  {visibleFolders.length > 0 && (
                    <div className="flex items-center gap-2 py-0.5">
                      <div className="h-px flex-1" style={{ background: 'var(--line-1)' }} />
                      <span className="text-[9px] font-mono text-ink-4 uppercase tracking-wider">Ungrouped</span>
                      <div className="h-px flex-1" style={{ background: 'var(--line-1)' }} />
                    </div>
                  )}
                  {youtubeByFolder.ungrouped.map(asset => (
                    <YouTubeCard
                      key={asset.id}
                      asset={asset}
                      canAttach={canAttach}
                      nodeYoutubeAssetId={nodeYoutubeAssetId}
                      nodeClipId={nodeClipId}
                      folderName={undefined}
                      allFolderNames={folderNames}
                      onAttach={() => onAttachYouTubeToNode(asset.id)}
                      onRemove={() => handleRemoveYoutube(asset)}
                      onRename={title => onRenameYouTubeAsset(asset.id, title)}
                      onMoveToFolder={f => moveToFolder(asset.id, f)}
                    />
                  ))}
                  {clipsByFolder.ungrouped.map(clip => (
                    <ClipCard
                      key={clip.id}
                      clip={clip}
                      canAttach={canAttach}
                      nodeClipId={nodeClipId}
                      folderName={undefined}
                      allFolderNames={folderNames}
                      onAttach={() => onAttachToNode(clip.id)}
                      onRemove={() => handleRemoveClip(clip)}
                      onRename={n => onRenameClip(clip.id, n)}
                      onMoveToFolder={f => moveToFolder(clip.id, f)}
                    />
                  ))}
                </div>
              )}

              {/* ── Pexels Downloads section ──────────────────────────────── */}
              {filteredPexels.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 py-0.5">
                    <div className="h-px flex-1" style={{ background: 'var(--line-1)' }} />
                    <span className="text-[9px] font-mono text-ink-4 uppercase tracking-wider">
                      Pexels Downloads ({filteredPexels.length})
                    </span>
                    <div className="h-px flex-1" style={{ background: 'var(--line-1)' }} />
                  </div>
                  {filteredPexels.map(asset => (
                    <PexelsAssetCard
                      key={asset.id}
                      asset={asset}
                      canAttach={canAttach}
                      nodeClipId={nodeClipId}
                      nodePexelsAssetId={nodePexelsAssetId}
                      onAttachVideo={() => onAttachPexelsVideoToNode(asset)}
                      onAttachPhoto={() => onAttachPexelsPhotoToNode(asset)}
                      onRemove={() => onRemovePexelsAsset(asset.id)}
                      onRename={title => onRenamePexelsAsset(asset.id, title)}
                    />
                  ))}
                </div>
              )}

            </div>
          </div>
        )}
      </div>
    </motion.aside>
  )
}

// ── UploadStatusRow ───────────────────────────────────────────────────────────

function UploadStatusRow({ item }: { item: UploadItem }) {
  const STATUS_LABEL: Record<ClipUploadStatus, string> = {
    compressing: 'Compressing…',
    uploading:   'Uploading…',
    processing:  'Generating thumbnail…',
    ready:       'Ready',
    failed:      'Failed',
  }
  const STATUS_COLOR: Record<ClipUploadStatus, string> = {
    compressing: 'oklch(80% 0.16 60)',
    uploading:   'var(--fg-3)',
    processing:  'oklch(78% 0.18 285)',
    ready:       'oklch(82% 0.18 165)',
    failed:      'oklch(70% 0.18 25)',
  }

  const savedLabel = item.savedBytes && item.savedBytes > 0
    ? `Saved ${formatFileSize(item.savedBytes)}`
    : null

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-mono truncate" style={{ color: 'var(--fg-2)', maxWidth: 170 }}>
          {item.name.length > 26 ? item.name.slice(0, 23) + '…' : item.name}
        </span>
        <div className="flex items-center gap-1.5 shrink-0">
          {item.status === 'ready' && savedLabel && (
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-md" style={{ background: 'oklch(82% 0.18 165 / 0.12)', color: 'oklch(72% 0.18 165)' }}>
              {savedLabel}
            </span>
          )}
          <span className="text-[9px] font-mono" style={{ color: STATUS_COLOR[item.status] }}>
            {item.status === 'uploading' ? `${item.progress}%`
              : item.status === 'compressing' ? `${item.progress}%`
              : STATUS_LABEL[item.status]}
          </span>
        </div>
      </div>
      {item.status === 'compressing' && (
        <div className="h-0.5 rounded-full overflow-hidden" style={{ background: 'var(--tint-3)' }}>
          <div className="h-full rounded-full transition-all duration-100" style={{ width: `${item.progress}%`, background: 'oklch(80% 0.16 60 / 0.7)' }} />
        </div>
      )}
      {item.status === 'uploading' && (
        <div className="h-0.5 rounded-full overflow-hidden" style={{ background: 'var(--tint-3)' }}>
          <div className="h-full rounded-full transition-all duration-100" style={{ width: `${item.progress}%`, background: 'oklch(82% 0.18 165 / 0.7)' }} />
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

// ── FolderPicker ──────────────────────────────────────────────────────────────

function FolderPicker({
  currentFolder,
  allFolderNames,
  onSelect,
  onClose,
}: {
  currentFolder?: string
  allFolderNames: string[]
  onSelect: (name: string | null) => void
  onClose: () => void
}) {
  const [newName, setNewName] = useState('')

  return (
    <div className="px-2 pb-2 pt-1 border-t space-y-1" style={{ borderColor: 'var(--line-1)' }}>
      {allFolderNames.length > 0 && allFolderNames.map(name => (
        <button
          key={name}
          onClick={() => { onSelect(name === currentFolder ? null : name); onClose() }}
          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-[11px] transition-colors hover:bg-[var(--tint-2)]"
          style={{ color: name === currentFolder ? 'oklch(82% 0.18 165)' : 'var(--fg-2)' }}
        >
          <Folder size={10} />
          <span className="flex-1 truncate">{name}</span>
          {name === currentFolder && <Check size={9} />}
        </button>
      ))}
      <div className="flex items-center gap-1.5 pt-0.5">
        <input
          autoFocus
          value={newName}
          onChange={e => setNewName(e.target.value)}
          placeholder="New folder…"
          className="flex-1 px-2 py-1.5 rounded-lg text-[11px] outline-none"
          style={{ background: 'var(--tint-2)', border: '1px solid var(--line-2)', color: 'var(--fg-1)' }}
          onKeyDown={e => {
            if (e.key === 'Enter' && newName.trim()) { onSelect(newName.trim()); onClose() }
            if (e.key === 'Escape') onClose()
          }}
        />
        {newName.trim() && (
          <button
            onClick={() => { onSelect(newName.trim()); onClose() }}
            className="px-2 py-1.5 rounded-lg text-[10px] font-mono"
            style={{ background: 'oklch(82% 0.18 165 / 0.1)', border: '1px solid oklch(82% 0.18 165 / 0.25)', color: 'oklch(82% 0.18 165)' }}
          >
            Create
          </button>
        )}
      </div>
      {currentFolder && (
        <button
          onClick={() => { onSelect(null); onClose() }}
          className="w-full flex items-center gap-2 px-2 py-1 rounded-lg text-left text-[10px] transition-colors hover:bg-[var(--tint-2)]"
          style={{ color: 'var(--fg-4)' }}
        >
          <X size={9} />
          Remove from folder
        </button>
      )}
    </div>
  )
}

// ── PexelsAssetCard ───────────────────────────────────────────────────────────

function PexelsAssetCard({
  asset, canAttach, nodeClipId, nodePexelsAssetId,
  onAttachVideo, onAttachPhoto, onRemove, onRename,
}: {
  asset: PexelsAsset
  canAttach: boolean
  nodeClipId?: string
  nodePexelsAssetId?: string
  onAttachVideo: () => void
  onAttachPhoto: () => void
  onRemove: () => void
  onRename: (title: string) => void
}) {
  const isAttachedVideo = asset.type === 'video' && nodePexelsAssetId === asset.id
  const wouldReplace = canAttach && (!!nodeClipId || !!nodePexelsAssetId) && !isAttachedVideo

  const [isRenaming, setIsRenaming] = useState(false)
  const [renameValue, setRenameValue] = useState(asset.title)

  const commitRename = () => {
    const trimmed = renameValue.trim()
    if (trimmed && trimmed !== asset.title) onRename(trimmed)
    else setRenameValue(asset.title)
    setIsRenaming(false)
  }

  const handleAttach = () => {
    if (asset.type === 'video') onAttachVideo()
    else onAttachPhoto()
  }

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        background: 'var(--tint-1)',
        border: `1px solid ${isAttachedVideo ? 'oklch(82% 0.18 165 / 0.4)' : 'var(--line-1)'}`,
      }}
    >
      {/* Thumbnail */}
      <div className="relative h-24 overflow-hidden" style={{ background: 'var(--bg-1)' }}>
        <img src={asset.thumbnailUrl} alt="" className="w-full h-full object-cover opacity-85" />
        <div
          className="absolute top-1.5 left-1.5 flex items-center gap-1 px-1.5 py-0.5 rounded font-mono text-[8px] tracking-wider uppercase"
          style={{
            background: 'rgba(0,0,0,0.72)',
            color: asset.type === 'video' ? 'oklch(82% 0.18 165)' : 'oklch(80% 0.12 240)',
            border: `1px solid ${asset.type === 'video' ? 'oklch(82% 0.18 165 / 0.3)' : 'oklch(80% 0.12 240 / 0.3)'}`,
          }}
        >
          {asset.type === 'video' ? <Film size={8} /> : <Image size={8} />}
          {asset.type}
        </div>
        {isAttachedVideo && (
          <div className="absolute top-1.5 right-1.5 flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-mono" style={{ background: 'oklch(82% 0.18 165)', color: '#052916' }}>
            <Check size={8} />Attached
          </div>
        )}
        {asset.duration != null && (
          <div className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded font-mono text-[9px]" style={{ background: 'rgba(0,0,0,0.7)', color: 'var(--fg-1)' }}>
            {formatDuration(asset.duration)}
          </div>
        )}
      </div>

      {/* Metadata */}
      <div className="px-2.5 pt-2 pb-1.5">
        {isRenaming ? (
          <input
            autoFocus
            value={renameValue}
            onChange={e => setRenameValue(e.target.value)}
            className="w-full px-2 py-1 rounded-lg text-[11px] font-medium outline-none mb-1"
            style={{ background: 'var(--tint-2)', border: '1px solid oklch(82% 0.18 165 / 0.4)', color: 'var(--fg-1)' }}
            onBlur={commitRename}
            onKeyDown={e => {
              if (e.key === 'Enter') commitRename()
              if (e.key === 'Escape') { setRenameValue(asset.title); setIsRenaming(false) }
            }}
          />
        ) : (
          <div className="flex items-start gap-1.5 mb-0.5 group">
            <p className="flex-1 text-[11px] font-medium leading-snug break-all" style={{ color: 'var(--fg-1)' }} title={asset.title}>
              {asset.title.length > 30 ? asset.title.slice(0, 27) + '…' : asset.title}
            </p>
            <button
              onClick={() => { setRenameValue(asset.title); setIsRenaming(true) }}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-[var(--tint-3)] shrink-0"
              style={{ color: 'var(--fg-3)' }}
              title="Rename"
            >
              <Pencil size={10} />
            </button>
          </div>
        )}
        <a
          href={asset.pexelsPageUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[9px] font-mono hover:underline"
          style={{ color: 'var(--fg-4)' }}
        >
          by {asset.photographer} · Pexels
        </a>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5 px-2.5 pb-2.5">
        {canAttach && !isAttachedVideo && (
          <button
            onClick={handleAttach}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[10px] font-mono transition-all hover:brightness-110"
            style={{
              background: wouldReplace ? 'oklch(78% 0.18 285 / 0.1)' : 'oklch(82% 0.18 165 / 0.1)',
              border: `1px solid ${wouldReplace ? 'oklch(78% 0.18 285 / 0.3)' : 'oklch(82% 0.18 165 / 0.25)'}`,
              color: wouldReplace ? 'oklch(78% 0.18 285)' : 'oklch(82% 0.18 165)',
            }}
          >
            {wouldReplace
              ? <><RefreshCw size={9} />Replace</>
              : asset.type === 'video'
              ? <><Link2 size={9} />Attach</>
              : <><Image size={9} />Set thumbnail</>}
          </button>
        )}
        {canAttach && isAttachedVideo && (
          <div
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[10px] font-mono"
            style={{ background: 'oklch(82% 0.18 165 / 0.06)', border: '1px solid oklch(82% 0.18 165 / 0.2)', color: 'oklch(82% 0.18 165)' }}
          >
            <Check size={9} />Attached
          </div>
        )}
        <button
          onClick={onRemove}
          className="flex items-center justify-center w-7 h-7 rounded-lg transition-colors hover:text-red-400"
          style={{ background: 'var(--tint-2)', border: '1px solid var(--line-1)', color: 'var(--fg-3)' }}
          title="Remove"
        >
          <Trash2 size={11} />
        </button>
      </div>
    </div>
  )
}

// ── YouTubeCard ───────────────────────────────────────────────────────────────

function YouTubeCard({
  asset, canAttach, nodeYoutubeAssetId, nodeClipId, folderName, allFolderNames,
  onAttach, onRemove, onRename, onMoveToFolder,
}: {
  asset: YouTubeAsset
  canAttach: boolean
  nodeYoutubeAssetId?: string
  nodeClipId?: string
  folderName?: string
  allFolderNames: string[]
  onAttach: () => void
  onRemove: () => void
  onRename: (title: string) => void
  onMoveToFolder: (name: string | null) => void
}) {
  const isAttached = nodeYoutubeAssetId === asset.id
  const wouldReplace = canAttach && (!!nodeClipId || (!!nodeYoutubeAssetId && !isAttached))
  const title = asset.title ?? `YouTube · ${asset.youtubeVideoId}`
  const thumbUrl = asset.thumbnailUrl ?? `https://img.youtube.com/vi/${asset.youtubeVideoId}/hqdefault.jpg`

  const [isRenaming, setIsRenaming] = useState(false)
  const [renameValue, setRenameValue] = useState(title)
  const [showFolder, setShowFolder] = useState(false)

  const commitRename = () => {
    const trimmed = renameValue.trim()
    if (trimmed && trimmed !== title) onRename(trimmed)
    else setRenameValue(title)
    setIsRenaming(false)
  }

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ background: 'var(--tint-1)', border: `1px solid ${isAttached ? 'oklch(82% 0.18 165 / 0.4)' : 'rgba(255,0,0,0.15)'}` }}
    >
      <div className="relative h-24 overflow-hidden" style={{ background: '#000' }}>
        <img src={thumbUrl} alt="" className="w-full h-full object-cover opacity-85" />
        <div
          className="absolute top-1.5 left-1.5 flex items-center gap-1 px-1.5 py-0.5 rounded font-mono text-[9px] tracking-wider"
          style={{ background: 'rgba(0,0,0,0.75)', color: '#ff5555', border: '1px solid rgba(255,0,0,0.3)' }}
        >
          <Youtube size={8} />YT
        </div>
        {isAttached && (
          <div className="absolute top-1.5 right-1.5 flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-mono" style={{ background: 'oklch(82% 0.18 165)', color: '#052916' }}>
            <Check size={8} />Attached
          </div>
        )}
      </div>

      <div className="px-2.5 pt-2 pb-1.5">
        {isRenaming ? (
          <input
            autoFocus
            value={renameValue}
            onChange={e => setRenameValue(e.target.value)}
            className="w-full px-2 py-1 rounded-lg text-[11px] font-medium outline-none mb-1"
            style={{ background: 'var(--tint-2)', border: '1px solid oklch(82% 0.18 165 / 0.4)', color: 'var(--fg-1)' }}
            onBlur={commitRename}
            onKeyDown={e => {
              if (e.key === 'Enter') commitRename()
              if (e.key === 'Escape') { setRenameValue(title); setIsRenaming(false) }
            }}
          />
        ) : (
          <div className="flex items-start gap-1.5 mb-0.5 group">
            <p className="flex-1 text-[11px] font-medium leading-snug" style={{ color: 'var(--fg-1)' }} title={title}>
              {title.length > 30 ? title.slice(0, 27) + '…' : title}
            </p>
            <button
              onClick={() => { setRenameValue(title); setIsRenaming(true) }}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-[var(--tint-3)]"
              style={{ color: 'var(--fg-3)' }}
              title="Rename"
            >
              <Pencil size={10} />
            </button>
          </div>
        )}
        <p className="text-[9px] font-mono" style={{ color: '#ff5555', opacity: 0.7 }}>
          Linked from YouTube
        </p>
      </div>

      <div className="flex items-center gap-1.5 px-2.5 pb-2.5">
        {canAttach && !isAttached && (
          <button
            onClick={onAttach}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[10px] font-mono transition-all hover:brightness-110"
            style={{
              background: wouldReplace ? 'oklch(78% 0.18 285 / 0.1)' : 'oklch(82% 0.18 165 / 0.1)',
              border: `1px solid ${wouldReplace ? 'oklch(78% 0.18 285 / 0.3)' : 'oklch(82% 0.18 165 / 0.25)'}`,
              color: wouldReplace ? 'oklch(78% 0.18 285)' : 'oklch(82% 0.18 165)',
            }}
          >
            {wouldReplace ? <><RefreshCw size={9} />Replace</> : <><Link2 size={9} />Attach</>}
          </button>
        )}
        {canAttach && isAttached && (
          <div
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[10px] font-mono"
            style={{ background: 'oklch(82% 0.18 165 / 0.06)', border: '1px solid oklch(82% 0.18 165 / 0.2)', color: 'oklch(82% 0.18 165)' }}
          >
            <Check size={9} />Attached
          </div>
        )}
        <button
          onClick={() => setShowFolder(v => !v)}
          className="flex items-center justify-center w-7 h-7 rounded-lg transition-colors"
          style={{
            background: folderName ? 'oklch(78% 0.18 285 / 0.08)' : 'var(--tint-2)',
            border: `1px solid ${folderName ? 'oklch(78% 0.18 285 / 0.25)' : 'var(--line-1)'}`,
            color: folderName ? 'oklch(78% 0.18 285)' : 'var(--fg-3)',
          }}
          title={folderName ? `In folder: ${folderName}` : 'Move to folder'}
        >
          <FolderPlus size={11} />
        </button>
        <button
          onClick={onRemove}
          className="flex items-center justify-center w-7 h-7 rounded-lg transition-colors hover:text-red-400"
          style={{ background: 'var(--tint-2)', border: '1px solid var(--line-1)', color: 'var(--fg-3)' }}
          title="Remove"
        >
          <Trash2 size={11} />
        </button>
      </div>

      {showFolder && (
        <FolderPicker
          currentFolder={folderName}
          allFolderNames={allFolderNames}
          onSelect={onMoveToFolder}
          onClose={() => setShowFolder(false)}
        />
      )}
    </div>
  )
}

// ── ClipCard ──────────────────────────────────────────────────────────────────

function ClipCard({
  clip, canAttach, nodeClipId, folderName, allFolderNames,
  onAttach, onRemove, onRename, onMoveToFolder,
}: {
  clip: Clip
  canAttach: boolean
  nodeClipId?: string
  folderName?: string
  allFolderNames: string[]
  onAttach: () => void
  onRemove: () => void
  onRename: (name: string) => void
  onMoveToFolder: (name: string | null) => void
}) {
  const isAttached = nodeClipId === clip.id
  const wouldReplace = canAttach && !!nodeClipId && nodeClipId !== clip.id
  const ext = clip.name.split('.').pop()?.toUpperCase() ?? 'VIDEO'

  const [isRenaming, setIsRenaming] = useState(false)
  const [renameValue, setRenameValue] = useState(clip.name)
  const [showFolder, setShowFolder] = useState(false)

  const commitRename = () => {
    const trimmed = renameValue.trim()
    if (trimmed && trimmed !== clip.name) onRename(trimmed)
    else setRenameValue(clip.name)
    setIsRenaming(false)
  }

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: 'var(--tint-1)', border: `1px solid ${isAttached ? 'oklch(82% 0.18 165 / 0.4)' : 'var(--line-1)'}` }}>
      <div className="relative h-24 overflow-hidden" style={{ background: 'var(--bg-1)' }}>
        {clip.thumbnailUrl ? (
          <img src={clip.thumbnailUrl} alt="" className="w-full h-full object-cover opacity-85" />
        ) : (
          <video
            className="w-full h-full object-cover opacity-85"
            src={clip.url}
            muted playsInline preload="metadata"
            onLoadedMetadata={e => { (e.target as HTMLVideoElement).currentTime = 1 }}
            crossOrigin="anonymous"
          />
        )}
        <div className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded font-mono text-[9px]" style={{ background: 'rgba(0,0,0,0.7)', color: 'var(--fg-1)' }}>
          {formatDuration(clip.duration)}
        </div>
        <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded font-mono text-[9px] tracking-wider" style={{ background: 'rgba(0,0,0,0.6)', color: 'var(--fg-2)', border: '1px solid var(--line-2)' }}>
          {ext}
        </div>
        {isAttached && (
          <div className="absolute top-1.5 right-1.5 flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-mono" style={{ background: 'oklch(82% 0.18 165)', color: '#052916' }}>
            <Check size={8} />Attached
          </div>
        )}
      </div>

      <div className="px-2.5 pt-2 pb-1.5">
        {isRenaming ? (
          <input
            autoFocus
            value={renameValue}
            onChange={e => setRenameValue(e.target.value)}
            className="w-full px-2 py-1 rounded-lg text-[11px] font-medium outline-none mb-1"
            style={{ background: 'var(--tint-2)', border: '1px solid oklch(82% 0.18 165 / 0.4)', color: 'var(--fg-1)' }}
            onBlur={commitRename}
            onKeyDown={e => {
              if (e.key === 'Enter') commitRename()
              if (e.key === 'Escape') { setRenameValue(clip.name); setIsRenaming(false) }
            }}
          />
        ) : (
          <div className="flex items-start gap-1.5 mb-0.5 group">
            <p className="flex-1 text-[11px] font-medium leading-snug break-all" style={{ color: 'var(--fg-1)' }} title={clip.name}>
              {clip.name.length > 30 ? clip.name.slice(0, 27) + '…' : clip.name}
            </p>
            <button
              onClick={() => { setRenameValue(clip.name); setIsRenaming(true) }}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-[var(--tint-3)] shrink-0"
              style={{ color: 'var(--fg-3)' }}
              title="Rename"
            >
              <Pencil size={10} />
            </button>
          </div>
        )}
        <p className="text-[9px] font-mono" style={{ color: 'var(--fg-3)' }}>
          {formatFileSize(clip.size)} · {formatDuration(clip.duration)}
        </p>
      </div>

      <div className="flex items-center gap-1.5 px-2.5 pb-2.5">
        {canAttach && !isAttached && (
          <button
            onClick={onAttach}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[10px] font-mono transition-all hover:brightness-110"
            style={{
              background: wouldReplace ? 'oklch(78% 0.18 285 / 0.1)' : 'oklch(82% 0.18 165 / 0.1)',
              border: `1px solid ${wouldReplace ? 'oklch(78% 0.18 285 / 0.3)' : 'oklch(82% 0.18 165 / 0.25)'}`,
              color: wouldReplace ? 'oklch(78% 0.18 285)' : 'oklch(82% 0.18 165)',
            }}
          >
            {wouldReplace ? <><RefreshCw size={9} />Replace</> : <><Link2 size={9} />Attach</>}
          </button>
        )}
        {canAttach && isAttached && (
          <div
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[10px] font-mono"
            style={{ background: 'oklch(82% 0.18 165 / 0.06)', border: '1px solid oklch(82% 0.18 165 / 0.2)', color: 'oklch(82% 0.18 165)' }}
          >
            <Check size={9} />Attached
          </div>
        )}
        <button
          onClick={() => setShowFolder(v => !v)}
          className="flex items-center justify-center w-7 h-7 rounded-lg transition-colors"
          style={{
            background: folderName ? 'oklch(78% 0.18 285 / 0.08)' : 'var(--tint-2)',
            border: `1px solid ${folderName ? 'oklch(78% 0.18 285 / 0.25)' : 'var(--line-1)'}`,
            color: folderName ? 'oklch(78% 0.18 285)' : 'var(--fg-3)',
          }}
          title={folderName ? `In folder: ${folderName}` : 'Move to folder'}
        >
          <FolderPlus size={11} />
        </button>
        <button
          onClick={onRemove}
          className="flex items-center justify-center w-7 h-7 rounded-lg transition-colors hover:text-red-400"
          style={{ background: 'var(--tint-2)', border: '1px solid var(--line-1)', color: 'var(--fg-3)' }}
          title="Remove clip"
        >
          <Trash2 size={11} />
        </button>
      </div>

      {showFolder && (
        <FolderPicker
          currentFolder={folderName}
          allFolderNames={allFolderNames}
          onSelect={onMoveToFolder}
          onClose={() => setShowFolder(false)}
        />
      )}
    </div>
  )
}
