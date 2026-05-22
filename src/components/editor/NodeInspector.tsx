'use client'

import { useState, useRef, useCallback } from 'react'
import { X, Plus, Trash2, ChevronDown, Film, AlertTriangle, ImageIcon, Copy, Play, Pause, RotateCcw, RefreshCw } from 'lucide-react'
import type { ScenarioNode, ScenarioChoice, NodeType, Clip } from '@/types'
import { formatDuration } from '@/lib/supabase/clips'

async function compressImage(file: File, maxWidth = 1280, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = e => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const scale = Math.min(1, maxWidth / img.width)
        canvas.width = Math.round(img.width * scale)
        canvas.height = Math.round(img.height * scale)
        const ctx = canvas.getContext('2d')
        if (!ctx) { reject(new Error('canvas unavailable')); return }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', quality))
      }
      img.onerror = reject
      img.src = e.target?.result as string
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

const NODE_TYPES: NodeType[] = ['start', 'scene', 'feedback', 'ending']

const TYPE_COLOR: Record<NodeType, string> = {
  start:    'oklch(82% 0.18 165)',
  scene:    'var(--fg-2)',
  feedback: 'oklch(78% 0.18 285)',
  ending:   'oklch(80% 0.16 60)',
}

const TYPE_DESC: Record<NodeType, string> = {
  start:    'The first scene players see when they open the scenario.',
  scene:    'A video scene in the story. Choices at the end advance the narrative.',
  feedback: 'An explanatory scene shown after the player picks a choice.',
  ending:   'A final outcome. The player\'s journey ends here.',
}

interface NodeInspectorProps {
  node: ScenarioNode
  allNodes: ScenarioNode[]
  clips: Clip[]
  onUpdateNode: (nodeId: string, updates: Partial<ScenarioNode>) => void
  onAddChoice: (nodeId: string) => void
  onUpdateChoice: (nodeId: string, choiceId: string, updates: Partial<ScenarioChoice>) => void
  onDeleteChoice: (nodeId: string, choiceId: string) => void
  onDeleteNode: (nodeId: string) => void
  onDuplicateNode?: () => void
  onOpenLibrary: () => void
  onClose: () => void
}

export function NodeInspector({
  node,
  allNodes,
  clips,
  onUpdateNode,
  onAddChoice,
  onUpdateChoice,
  onDeleteChoice,
  onDeleteNode,
  onDuplicateNode,
  onOpenLibrary,
  onClose,
}: NodeInspectorProps) {
  const [confirmDelete, setConfirmDelete] = useState(false)

  const otherNodes = allNodes.filter(n => n.id !== node.id)
  const isEnding = node.type === 'ending'
  const hasChoiceWarning = !isEnding && node.choices.length === 0
  const currentClip = clips.find(c => c.id === node.clip?.id)

  const handleDelete = () => {
    if (!confirmDelete) { setConfirmDelete(true); return }
    onDeleteNode(node.id)
    setConfirmDelete(false)
  }

  return (
    <aside
      className="flex flex-col w-[320px] shrink-0 border-l overflow-hidden"
      style={{ borderColor: 'var(--line-1)', background: 'var(--bg-0)' }}
    >
      {/* ── Colored type accent line ──────────────────────────────────────── */}
      <div style={{ height: 2, background: TYPE_COLOR[node.type], opacity: 0.7 }} />

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between px-4 h-[44px] border-b shrink-0"
        style={{ borderColor: 'var(--line-1)' }}
      >
        <div className="flex items-center gap-2">
          <span
            className="px-2 py-0.5 rounded-md text-[9px] font-mono tracking-[0.14em] uppercase font-medium"
            style={{
              background: `${TYPE_COLOR[node.type]}18`,
              border: `1px solid ${TYPE_COLOR[node.type]}35`,
              color: TYPE_COLOR[node.type],
            }}
          >
            {node.type}
          </span>
          <span className="text-xs font-mono text-ink-3 truncate max-w-[140px]">
            {node.title || 'Untitled'}
          </span>
        </div>
        <div className="flex items-center gap-0.5">
          {onDuplicateNode && (
            <button
              onClick={onDuplicateNode}
              title="Duplicate scene (⌘D)"
              className="text-ink-4 hover:text-ink-1 transition-colors p-1.5 rounded-lg hover:bg-[var(--tint-3)]"
            >
              <Copy size={13} />
            </button>
          )}
          <button
            onClick={onClose}
            className="text-ink-3 hover:text-ink-1 transition-colors p-1.5 rounded-lg hover:bg-[var(--tint-3)]"
          >
            <X size={13} />
          </button>
        </div>
      </div>

      {/* ── Scrollable body ─────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">

        {/* No-choices warning */}
        {hasChoiceWarning && (
          <div
            className="mx-4 mt-4 flex items-start gap-2 px-3 py-2.5 rounded-xl text-xs"
            style={{
              background: 'oklch(80% 0.16 60 / 0.08)',
              border: '1px solid oklch(80% 0.16 60 / 0.25)',
              color: 'oklch(80% 0.16 60)',
            }}
          >
            <AlertTriangle size={12} className="mt-0.5 shrink-0" />
            <span>This scene has no choices. Players will get stuck here and can&apos;t continue.</span>
          </div>
        )}

        <div className="px-4 py-4 space-y-5">

          {/* ── Section: Identity ─────────────────────────────────────────── */}
          <div className="space-y-3.5">
            <SectionHeader>Identity</SectionHeader>

            <Field label="Title">
              <input
                className="inspector-input"
                value={node.title}
                onChange={e => onUpdateNode(node.id, { title: e.target.value })}
                placeholder="e.g. The Emergency Meeting"
              />
            </Field>

            <Field label="Type">
              <div className="relative">
                <select
                  className="inspector-input appearance-none pr-8"
                  value={node.type}
                  onChange={e => onUpdateNode(node.id, { type: e.target.value as NodeType })}
                  style={{ color: TYPE_COLOR[node.type] }}
                >
                  {NODE_TYPES.map(t => (
                    <option key={t} value={t}>
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={12}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
                  style={{ color: 'var(--fg-3)' }}
                />
              </div>
              <p className="text-[10px] leading-relaxed mt-1.5 px-0.5" style={{ color: 'var(--fg-4)' }}>
                {TYPE_DESC[node.type]}
              </p>
            </Field>

            <Field label="Description">
              <textarea
                className="inspector-input resize-none"
                rows={3}
                value={node.description ?? ''}
                onChange={e => onUpdateNode(node.id, { description: e.target.value })}
                placeholder="What happens in this scene — shown on the placeholder card while you work."
              />
            </Field>
          </div>

          {/* ── Divider ─────────────────────────────────────────────────────── */}
          <div style={{ height: 1, background: 'var(--tint-2)' }} />

          {/* ── Section: Media ────────────────────────────────────────────── */}
          <div className="space-y-3.5">
            <SectionHeader>Media</SectionHeader>

            {/* Video Clip */}
            <Field label="Video Clip">
              <p className="text-[10px] mb-2 leading-relaxed" style={{ color: 'var(--fg-4)' }}>
                The video that plays when players reach this scene.
              </p>
              {clips.length === 0 ? (
                <div
                  className="px-3 py-3 rounded-xl text-[11px] leading-relaxed border border-dashed"
                  style={{ borderColor: 'var(--line-1)', color: 'var(--fg-3)' }}
                >
                  No clips uploaded yet.{' '}
                  <button
                    onClick={onOpenLibrary}
                    className="underline underline-offset-2 transition-opacity hover:opacity-80"
                    style={{ color: 'var(--fg-2)' }}
                  >
                    Open Asset Library →
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {/* Preview + replace/remove when clip is attached */}
                  {node.clip ? (
                    <>
                      <ClipPreviewPlayer url={node.clip.url} name={currentClip?.name} thumbnailUrl={currentClip?.thumbnailUrl} />
                      <div className="flex gap-1.5">
                        <button
                          onClick={onOpenLibrary}
                          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-mono transition-all hover:brightness-110"
                          style={{ background: 'oklch(78% 0.18 285 / 0.08)', border: '1px solid oklch(78% 0.18 285 / 0.25)', color: 'oklch(78% 0.18 285)' }}
                        >
                          <RefreshCw size={10} />
                          Replace clip
                        </button>
                        <button
                          onClick={() => onUpdateNode(node.id, { clip: undefined, clipId: undefined })}
                          className="flex items-center justify-center w-8 h-8 rounded-lg transition-colors hover:text-red-400"
                          style={{ background: 'var(--tint-2)', border: '1px solid var(--line-2)', color: 'var(--fg-3)' }}
                          title="Remove clip"
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="relative">
                        <div className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--fg-3)' }}>
                          <Film size={12} />
                        </div>
                        <select
                          className="inspector-input pl-7 appearance-none pr-8"
                          value=""
                          onChange={e => {
                            const clip = clips.find(c => c.id === e.target.value)
                            if (clip) {
                              onUpdateNode(node.id, { clip: { id: clip.id, url: clip.url, duration: clip.duration }, clipId: undefined })
                            }
                          }}
                        >
                          <option value="">— Pick a clip —</option>
                          {clips.map(c => (
                            <option key={c.id} value={c.id}>
                              {c.name.length > 26 ? c.name.slice(0, 23) + '…' : c.name} · {formatDuration(c.duration)}
                            </option>
                          ))}
                        </select>
                        <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--fg-3)' }} />
                      </div>
                      <button
                        onClick={onOpenLibrary}
                        className="text-[10px] font-mono transition-opacity hover:opacity-80"
                        style={{ color: 'var(--fg-4)' }}
                      >
                        Upload clips in Asset Library →
                      </button>
                    </>
                  )}
                </div>
              )}
            </Field>

            {/* Choice Screen Thumbnail */}
            {!isEnding && (
              <Field label="Choice Screen Thumbnail">
                <p className="text-[10px] mb-2 leading-relaxed" style={{ color: 'var(--fg-4)' }}>
                  Image shown behind the choices. Defaults to the last frame of the video.
                </p>
                <ThumbnailField
                  thumbnailUrl={node.thumbnailUrl}
                  onUpload={url => onUpdateNode(node.id, { thumbnailUrl: url })}
                  onClear={() => onUpdateNode(node.id, { thumbnailUrl: undefined })}
                />
              </Field>
            )}
          </div>

          {/* ── Divider ─────────────────────────────────────────────────────── */}
          {!isEnding && <div style={{ height: 1, background: 'var(--tint-2)' }} />}

          {/* ── Section: Choices ──────────────────────────────────────────── */}
          {!isEnding && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <SectionHeader>Choices</SectionHeader>
                <button
                  onClick={() => onAddChoice(node.id)}
                  className="flex items-center gap-1 text-[11px] font-mono transition-colors hover:opacity-80"
                  style={{ color: 'oklch(82% 0.18 165)' }}
                >
                  <Plus size={11} />
                  Add choice
                </button>
              </div>

              <p className="text-[10px] mb-3 leading-relaxed" style={{ color: 'var(--fg-4)' }}>
                Choices appear as buttons after the video. Players tap one to advance.
              </p>

              {node.choices.length === 0 ? (
                <div
                  className="text-center py-5 rounded-xl border border-dashed"
                  style={{ borderColor: 'var(--line-1)' }}
                >
                  <p className="text-[11px] text-ink-4 mb-2">No choices yet</p>
                  <button
                    onClick={() => onAddChoice(node.id)}
                    className="text-[11px] font-mono transition-opacity hover:opacity-80"
                    style={{ color: 'oklch(82% 0.18 165)' }}
                  >
                    + Add first choice
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {node.choices.map((choice, i) => (
                    <ChoiceEditor
                      key={choice.id}
                      index={i}
                      choice={choice}
                      otherNodes={otherNodes}
                      nodeId={node.id}
                      onUpdate={(updates) => onUpdateChoice(node.id, choice.id, updates)}
                      onDelete={() => onDeleteChoice(node.id, choice.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Ending note ─────────────────────────────────────────────────── */}
          {isEnding && (
            <div
              className="px-3 py-3.5 rounded-xl text-[11px] leading-relaxed"
              style={{ background: 'var(--tint-1)', border: '1px solid var(--line-1)', color: 'var(--fg-3)' }}
            >
              <p className="font-medium mb-1" style={{ color: 'var(--fg-2)' }}>Ending scenes don&apos;t have choices.</p>
              <p>The player sees a summary screen after this scene plays. Add multiple endings to give players different outcomes based on their path.</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Delete ──────────────────────────────────────────────────────────── */}
      <div className="shrink-0 px-4 py-3 border-t" style={{ borderColor: 'var(--line-1)' }}>
        {confirmDelete ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-ink-2 flex-1">Delete this scene?</span>
            <button
              onClick={handleDelete}
              className="text-xs px-2.5 py-1.5 rounded-lg transition-colors"
              style={{ background: 'oklch(70% 0.18 25 / 0.15)', color: 'oklch(70% 0.18 25)' }}
            >
              Confirm
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="text-xs px-2.5 py-1.5 rounded-lg text-ink-3 hover:text-ink-1 transition-colors"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={handleDelete}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs transition-all hover:opacity-80"
            style={{ color: 'var(--fg-3)', border: '1px solid var(--line-1)' }}
          >
            <Trash2 size={12} />
            Delete scene
          </button>
        )}
      </div>
    </aside>
  )
}

// ── ThumbnailField ────────────────────────────────────────────────────────────

interface ThumbnailFieldProps {
  thumbnailUrl?: string
  onUpload: (url: string) => void
  onClear: () => void
}

function ThumbnailField({ thumbnailUrl, onUpload, onClear }: ThumbnailFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) { setError('Please select an image file.'); return }
    setError(null)
    setProcessing(true)
    try {
      onUpload(await compressImage(file))
    } catch {
      setError('Could not process image.')
    } finally {
      setProcessing(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  if (thumbnailUrl) {
    return (
      <div className="space-y-2">
        <div className="relative rounded-xl overflow-hidden" style={{ aspectRatio: '16/9' }}>
          <img src={thumbnailUrl} alt="Choice screen thumbnail" className="w-full h-full object-cover" />
          <div
            className="absolute inset-0 flex items-end justify-start p-2"
            style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 60%)' }}
          >
            <span className="text-[9px] font-mono tracking-wider uppercase" style={{ color: 'rgba(255,255,255,0.5)' }}>
              Custom thumbnail
            </span>
          </div>
        </div>
        <div className="flex gap-1.5">
          <button
            onClick={() => inputRef.current?.click()}
            className="flex-1 text-[10px] font-mono py-1.5 rounded-lg transition-opacity hover:opacity-80"
            style={{ background: 'var(--tint-2)', border: '1px solid var(--line-2)', color: 'var(--fg-2)' }}
          >
            Replace
          </button>
          <button
            onClick={onClear}
            className="text-[10px] font-mono px-3 py-1.5 rounded-lg transition-opacity hover:opacity-80"
            style={{ background: 'var(--tint-2)', border: '1px solid var(--line-2)', color: 'var(--fg-3)' }}
          >
            Remove
          </button>
        </div>
        <input ref={inputRef} type="file" accept="image/*" className="hidden"
          onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
      </div>
    )
  }

  return (
    <div>
      <div
        className="flex flex-col items-center gap-2 px-3 py-4 rounded-xl border border-dashed transition-colors cursor-pointer hover:border-[var(--line-4)]"
        style={{ borderColor: 'var(--line-2)', color: 'var(--fg-3)' }}
        onDrop={handleDrop}
        onDragOver={e => e.preventDefault()}
        onClick={() => inputRef.current?.click()}
      >
        <ImageIcon size={15} style={{ color: 'var(--fg-4)' }} />
        <div className="text-center">
          <p className="text-[11px]" style={{ color: 'var(--fg-3)' }}>
            {processing ? 'Processing…' : 'Upload custom image'}
          </p>
          <p className="text-[10px] mt-0.5" style={{ color: 'var(--fg-4)' }}>
            Click or drag · JPG, PNG, WebP
          </p>
        </div>
      </div>
      {error && <p className="text-[10px] font-mono mt-1.5" style={{ color: 'oklch(70% 0.18 25)' }}>{error}</p>}
      <input ref={inputRef} type="file" accept="image/*" className="hidden"
        onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
    </div>
  )
}

// ── ChoiceEditor ──────────────────────────────────────────────────────────────

interface ChoiceEditorProps {
  index: number
  choice: ScenarioChoice
  otherNodes: ScenarioNode[]
  nodeId: string
  onUpdate: (updates: Partial<ScenarioChoice>) => void
  onDelete: () => void
}

function ChoiceEditor({ index, choice, otherNodes, onUpdate, onDelete }: ChoiceEditorProps) {
  const [showFeedback, setShowFeedback] = useState(!!choice.feedback)
  const letter = String.fromCharCode(65 + index)

  const targetNode = otherNodes.find(n => n.id === choice.targetNodeId)
  const hasNoTarget = !choice.targetNodeId

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        background: 'var(--tint-1)',
        border: hasNoTarget
          ? '1px solid oklch(80% 0.16 60 / 0.3)'
          : '1px solid var(--line-1)',
      }}
    >
      {/* Choice header */}
      <div className="flex items-center gap-2 px-3 pt-2.5 pb-0">
        <span
          className="shrink-0 w-5 h-5 flex items-center justify-center rounded font-mono text-[10px] font-medium"
          style={{ background: 'var(--tint-3)', color: 'var(--fg-2)', border: '1px solid var(--line-2)' }}
        >
          {letter}
        </span>
        <input
          className="flex-1 bg-transparent text-[12px] text-ink-1 placeholder-ink-4 outline-none py-1"
          value={choice.label}
          onChange={e => onUpdate({ label: e.target.value })}
          placeholder="Choice label…"
        />
        <button
          onClick={onDelete}
          className="shrink-0 text-ink-4 hover:text-neon-danger transition-colors p-1"
          title="Remove choice"
        >
          <Trash2 size={11} />
        </button>
      </div>

      <div className="px-3 pb-2.5 pt-2 space-y-2">
        {/* Destination */}
        <div className="relative">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono" style={{ color: 'var(--fg-4)' }}>
            →
          </span>
          <select
            className="w-full pl-6 pr-6 py-1.5 rounded-lg text-[11px] font-mono appearance-none outline-none transition-colors"
            style={{
              background: 'var(--tint-2)',
              border: hasNoTarget ? '1px solid oklch(80% 0.16 60 / 0.4)' : '1px solid var(--line-2)',
              color: targetNode ? 'var(--fg-1)' : hasNoTarget ? 'oklch(80% 0.16 60)' : 'var(--fg-3)',
            }}
            value={choice.targetNodeId}
            onChange={e => onUpdate({ targetNodeId: e.target.value })}
          >
            <option value="">— pick destination —</option>
            {otherNodes.map(n => (
              <option key={n.id} value={n.id}>{n.title} ({n.type})</option>
            ))}
          </select>
          <ChevronDown
            size={10}
            className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: 'var(--fg-3)' }}
          />
        </div>

        {/* Target node type indicator */}
        {targetNode && (
          <div className="flex items-center gap-1.5">
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: TYPE_COLOR[targetNode.type] }}
            />
            <span className="text-[9px] font-mono uppercase tracking-wider" style={{ color: TYPE_COLOR[targetNode.type] }}>
              {targetNode.type}
            </span>
            {targetNode.type === 'ending' && (
              <span className="text-[9px] font-mono" style={{ color: 'var(--fg-4)' }}>· ends here</span>
            )}
          </div>
        )}

        {/* Feedback toggle */}
        <button
          onClick={() => setShowFeedback(v => !v)}
          className="text-[10px] font-mono transition-colors flex items-center gap-1"
          style={{ color: showFeedback ? 'oklch(78% 0.18 285)' : 'var(--fg-4)' }}
        >
          {showFeedback ? '− hide feedback' : '+ add feedback'}
        </button>

        {/* Feedback textarea */}
        {showFeedback && (
          <div>
            <textarea
              className="w-full bg-transparent text-[11px] text-ink-2 placeholder-ink-4 outline-none resize-none rounded-lg px-2.5 py-2 leading-relaxed"
              rows={2}
              style={{
                background: 'var(--tint-1)',
                border: '1px solid var(--line-1)',
              }}
              value={choice.feedback ?? ''}
              onChange={e => onUpdate({ feedback: e.target.value || undefined })}
              placeholder="Brief message shown to player after this choice…"
            />
            <p className="text-[9px] font-mono mt-1" style={{ color: 'var(--fg-4)' }}>
              Shown as an overlay before advancing to the next scene.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

// ── ClipPreviewPlayer ─────────────────────────────────────────────────────────

interface ClipPreviewPlayerProps {
  url: string
  name?: string
  thumbnailUrl?: string
}

function ClipPreviewPlayer({ url, name, thumbnailUrl }: ClipPreviewPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)

  const toggle = useCallback(() => {
    const v = videoRef.current
    if (!v) return
    if (v.paused) { v.play(); setPlaying(true) }
    else { v.pause(); setPlaying(false) }
  }, [])

  const restart = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    const v = videoRef.current
    if (!v) return
    v.currentTime = 0
    v.play()
    setPlaying(true)
  }, [])

  const handleTimeUpdate = useCallback(() => {
    const v = videoRef.current
    if (!v || !v.duration) return
    setCurrentTime(v.currentTime)
    setProgress(v.currentTime / v.duration)
  }, [])

  const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = videoRef.current
    if (!v) return
    const t = Number(e.target.value) / 1000 * v.duration
    v.currentTime = t
    setProgress(Number(e.target.value) / 1000)
  }, [])

  const fmt = (s: number) => {
    if (!s || !isFinite(s)) return '0:00'
    const m = Math.floor(s / 60)
    return `${m}:${String(Math.floor(s % 60)).padStart(2, '0')}`
  }

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: '#000', border: '1px solid var(--line-2)' }}>
      {/* Video */}
      <div className="relative" style={{ aspectRatio: '16/9' }} onClick={toggle}>
        <video
          ref={videoRef}
          src={url}
          poster={thumbnailUrl}
          className="w-full h-full object-contain"
          preload="metadata"
          playsInline
          onLoadedMetadata={e => setDuration((e.target as HTMLVideoElement).duration)}
          onTimeUpdate={handleTimeUpdate}
          onEnded={() => setPlaying(false)}
        />
        {/* Play/pause overlay */}
        <div
          className="absolute inset-0 flex items-center justify-center transition-opacity"
          style={{ opacity: playing ? 0 : 1, background: 'rgba(0,0,0,0.35)' }}
        >
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(4px)' }}
          >
            <Play size={16} style={{ color: '#fff', marginLeft: 2 }} />
          </div>
        </div>
      </div>
      {/* Controls */}
      <div className="px-2.5 py-2" style={{ background: 'rgba(0,0,0,0.6)' }}>
        <input
          type="range"
          min={0}
          max={1000}
          value={Math.round(progress * 1000)}
          onChange={handleSeek}
          className="w-full h-0.5 rounded-full appearance-none cursor-pointer mb-2"
          style={{ accentColor: 'oklch(82% 0.18 165)' }}
        />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <button onClick={toggle} className="text-white/70 hover:text-white transition-colors">
              {playing ? <Pause size={11} /> : <Play size={11} />}
            </button>
            <button onClick={restart} className="text-white/40 hover:text-white/70 transition-colors">
              <RotateCcw size={10} />
            </button>
          </div>
          <span className="text-[9px] font-mono" style={{ color: 'rgba(255,255,255,0.4)' }}>
            {fmt(currentTime)} / {fmt(duration)}
          </span>
        </div>
        {name && (
          <p className="text-[9px] font-mono mt-1.5 truncate" style={{ color: 'rgba(255,255,255,0.25)' }}>
            {name}
          </p>
        )}
      </div>
    </div>
  )
}

// ── Shared form primitives ────────────────────────────────────────────────────

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[9px] font-mono text-ink-4 tracking-[0.16em] uppercase mb-0.5">
      {children}
    </p>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[9px] font-mono text-ink-4 tracking-[0.14em] uppercase mb-1.5">
        {label}
      </p>
      {children}
    </div>
  )
}
