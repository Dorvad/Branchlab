'use client'

import { useState, useRef } from 'react'
import { X, Plus, Trash2, ChevronDown, Film, AlertTriangle, ImageIcon } from 'lucide-react'
import type { ScenarioNode, ScenarioChoice, NodeType, VideoClip } from '@/types'
import { formatDuration } from '@/lib/clip-store'

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
  scene:    '#8a90a4',
  feedback: 'oklch(78% 0.18 285)',
  ending:   'oklch(80% 0.16 60)',
}

interface NodeInspectorProps {
  node: ScenarioNode
  allNodes: ScenarioNode[]
  clips: VideoClip[]
  onUpdateNode: (nodeId: string, updates: Partial<ScenarioNode>) => void
  onAddChoice: (nodeId: string) => void
  onUpdateChoice: (nodeId: string, choiceId: string, updates: Partial<ScenarioChoice>) => void
  onDeleteChoice: (nodeId: string, choiceId: string) => void
  onDeleteNode: (nodeId: string) => void
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
  onOpenLibrary,
  onClose,
}: NodeInspectorProps) {
  const [confirmDelete, setConfirmDelete] = useState(false)

  // Other nodes (valid destinations for choices)
  const otherNodes = allNodes.filter(n => n.id !== node.id)
  const isEnding = node.type === 'ending'
  const hasWarning = !isEnding && node.choices.length === 0

  const handleDelete = () => {
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }
    onDeleteNode(node.id)
    setConfirmDelete(false)
  }

  return (
    <aside
      className="flex flex-col w-[320px] shrink-0 border-l overflow-hidden"
      style={{ borderColor: 'rgba(255,255,255,0.07)', background: '#09090e' }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 h-[44px] border-b shrink-0"
        style={{ borderColor: 'rgba(255,255,255,0.07)' }}
      >
        <div className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full"
            style={{ background: TYPE_COLOR[node.type] }}
          />
          <span className="text-xs font-mono text-ink-2 tracking-wider uppercase">
            Node Inspector
          </span>
        </div>
        <button
          onClick={onClose}
          className="text-ink-3 hover:text-ink-1 transition-colors p-1"
        >
          <X size={14} />
        </button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto">

        {/* Warning banner */}
        {hasWarning && (
          <div
            className="mx-4 mt-4 flex items-start gap-2 px-3 py-2.5 rounded-xl text-xs"
            style={{
              background: 'oklch(80% 0.16 60 / 0.08)',
              border: '1px solid oklch(80% 0.16 60 / 0.25)',
              color: 'oklch(80% 0.16 60)',
            }}
          >
            <AlertTriangle size={13} className="mt-0.5 shrink-0" />
            <span>This node has no choices. Players will get stuck here.</span>
          </div>
        )}

        <div className="px-4 py-4 space-y-5">

          {/* ── Title ──────────────────────────────────────────────────────── */}
          <Field label="Title">
            <input
              className="inspector-input"
              value={node.title}
              onChange={e => onUpdateNode(node.id, { title: e.target.value })}
              placeholder="Scene title"
            />
          </Field>

          {/* ── Node type ──────────────────────────────────────────────────── */}
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
                style={{ color: '#5c6273' }}
              />
            </div>
          </Field>

          {/* ── Description / prompt ───────────────────────────────────────── */}
          <Field label="Description / Prompt">
            <textarea
              className="inspector-input resize-none"
              rows={3}
              value={node.description ?? ''}
              onChange={e => onUpdateNode(node.id, { description: e.target.value })}
              placeholder="What happens in this scene…"
            />
          </Field>

          {/* ── Video clip ─────────────────────────────────────────────────── */}
          <Field label="Video Clip">
            {clips.length === 0 ? (
              <div
                className="px-3 py-2.5 rounded-xl text-[11px] leading-relaxed border border-dashed"
                style={{ borderColor: 'rgba(255,255,255,0.08)', color: '#5c6273' }}
              >
                No clips in library.{' '}
                <button
                  onClick={onOpenLibrary}
                  className="underline underline-offset-2 transition-colors hover:opacity-80"
                  style={{ color: '#8a90a4' }}
                >
                  Open Asset Library →
                </button>
              </div>
            ) : (
              <div className="space-y-1.5">
                <div className="relative">
                  <div className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#5c6273' }}>
                    <Film size={12} />
                  </div>
                  <select
                    className="inspector-input pl-7 appearance-none pr-8"
                    value={node.clipId ?? ''}
                    onChange={e => onUpdateNode(node.id, { clipId: e.target.value || undefined })}
                  >
                    <option value="">— No clip —</option>
                    {clips.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name.length > 28 ? c.name.slice(0, 25) + '…' : c.name} · {formatDuration(c.duration)}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={12}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
                    style={{ color: '#5c6273' }}
                  />
                </div>
                <button
                  onClick={onOpenLibrary}
                  className="text-[10px] font-mono transition-opacity hover:opacity-80"
                  style={{ color: '#3a3f4e' }}
                >
                  Manage clips →
                </button>
              </div>
            )}
          </Field>

          {/* ── Choice screen thumbnail ────────────────────────────────────── */}
          {!isEnding && (
            <Field label="Choice Screen">
              <ThumbnailField
                thumbnailUrl={node.thumbnailUrl}
                onUpload={url => onUpdateNode(node.id, { thumbnailUrl: url })}
                onClear={() => onUpdateNode(node.id, { thumbnailUrl: undefined })}
              />
            </Field>
          )}

          {/* ── Choices ────────────────────────────────────────────────────── */}
          {!isEnding && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <FieldLabel>Choices</FieldLabel>
                <button
                  onClick={() => onAddChoice(node.id)}
                  className="flex items-center gap-1 text-[11px] font-mono transition-colors hover:opacity-80"
                  style={{ color: 'oklch(82% 0.18 165)' }}
                >
                  <Plus size={11} />
                  Add
                </button>
              </div>

              {node.choices.length === 0 ? (
                <div
                  className="text-center py-4 rounded-xl text-[11px] text-ink-4 border border-dashed"
                  style={{ borderColor: 'rgba(255,255,255,0.08)' }}
                >
                  No choices yet
                </div>
              ) : (
                <div className="space-y-3">
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

          {/* ── Ending notes ───────────────────────────────────────────────── */}
          {isEnding && (
            <div
              className="px-3 py-3 rounded-xl text-[11px] text-ink-3"
              style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              Ending nodes don't have choices. The player sees the ending screen after this scene.
            </div>
          )}
        </div>
      </div>

      {/* Delete node */}
      <div className="shrink-0 px-4 py-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        {confirmDelete ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-ink-2 flex-1">Delete this node?</span>
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
            style={{ color: '#5c6273', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            <Trash2 size={12} />
            Delete node
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
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file.')
      return
    }
    setError(null)
    setProcessing(true)
    try {
      const url = await compressImage(file)
      onUpload(url)
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
        {/* Preview */}
        <div className="relative rounded-xl overflow-hidden" style={{ aspectRatio: '16/9' }}>
          <img src={thumbnailUrl} alt="Choice screen thumbnail" className="w-full h-full object-cover" />
          <div
            className="absolute inset-0 flex items-end justify-start p-2"
            style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 60%)' }}
          >
            <span className="text-[9px] font-mono tracking-wider uppercase" style={{ color: 'rgba(255,255,255,0.5)' }}>
              Custom
            </span>
          </div>
        </div>
        <div className="flex gap-1.5">
          <button
            onClick={() => inputRef.current?.click()}
            className="flex-1 text-[10px] font-mono py-1.5 rounded-lg transition-opacity hover:opacity-80"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#8a90a4' }}
          >
            Replace
          </button>
          <button
            onClick={onClear}
            className="text-[10px] font-mono px-3 py-1.5 rounded-lg transition-opacity hover:opacity-80"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#5c6273' }}
          >
            Remove
          </button>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
      </div>
    )
  }

  return (
    <div>
      <div
        className="flex flex-col items-center gap-2 px-3 py-4 rounded-xl border border-dashed transition-colors cursor-pointer"
        style={{ borderColor: 'rgba(255,255,255,0.08)', color: '#5c6273' }}
        onDrop={handleDrop}
        onDragOver={e => e.preventDefault()}
        onClick={() => inputRef.current?.click()}
      >
        <ImageIcon size={16} style={{ color: '#3a3f4e' }} />
        <div className="text-center">
          <p className="text-[11px]" style={{ color: '#5c6273' }}>Defaults to last video frame</p>
          <p className="text-[10px] mt-0.5" style={{ color: '#3a3f4e' }}>
            {processing ? 'Processing…' : 'Click or drag to upload custom image'}
          </p>
        </div>
      </div>
      {error && (
        <p className="text-[10px] font-mono mt-1.5" style={{ color: 'oklch(70% 0.18 25)' }}>{error}</p>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
      />
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
  const letter = String.fromCharCode(65 + index) // A, B, C…

  const targetNode = otherNodes.find(n => n.id === choice.targetNodeId)
  const hasNoTarget = !choice.targetNodeId

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        background: 'rgba(255,255,255,0.025)',
        border: hasNoTarget
          ? '1px solid oklch(80% 0.16 60 / 0.3)'
          : '1px solid rgba(255,255,255,0.08)',
      }}
    >
      {/* Choice header */}
      <div
        className="flex items-center gap-2 px-3 pt-2.5 pb-0"
      >
        <span
          className="shrink-0 w-5 h-5 flex items-center justify-center rounded font-mono text-[10px] font-medium"
          style={{ background: 'rgba(255,255,255,0.06)', color: '#8a90a4' }}
        >
          {letter}
        </span>
        <input
          className="flex-1 bg-transparent text-[12px] text-ink-1 placeholder-ink-4 outline-none py-1"
          value={choice.label}
          onChange={e => onUpdate({ label: e.target.value })}
          placeholder="Choice label"
        />
        <button
          onClick={onDelete}
          className="shrink-0 text-ink-4 hover:text-neon-danger transition-colors p-1"
        >
          <Trash2 size={11} />
        </button>
      </div>

      <div className="px-3 pb-2.5 pt-2 space-y-2">
        {/* Destination */}
        <div className="relative">
          <span className="absolute left-2 top-1/2 -translate-y-1/2 font-mono text-[10px]" style={{ color: '#3a3f4e' }}>
            →
          </span>
          <select
            className="w-full pl-6 pr-6 py-1.5 rounded-lg text-[11px] font-mono appearance-none outline-none transition-colors"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: hasNoTarget ? '1px solid oklch(80% 0.16 60 / 0.4)' : '1px solid rgba(255,255,255,0.08)',
              color: targetNode ? '#c9cdda' : 'oklch(80% 0.16 60)',
            }}
            value={choice.targetNodeId}
            onChange={e => onUpdate({ targetNodeId: e.target.value })}
          >
            <option value="">— pick destination —</option>
            {otherNodes.map(n => (
              <option key={n.id} value={n.id}>{n.title}</option>
            ))}
          </select>
          <ChevronDown
            size={10}
            className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: '#5c6273' }}
          />
        </div>

        {/* Feedback toggle */}
        <button
          onClick={() => setShowFeedback(v => !v)}
          className="text-[10px] font-mono transition-colors"
          style={{ color: showFeedback ? 'oklch(78% 0.18 285)' : '#3a3f4e' }}
        >
          {showFeedback ? '− feedback' : '+ add feedback'}
        </button>

        {/* Feedback textarea */}
        {showFeedback && (
          <textarea
            className="w-full bg-transparent text-[11px] text-ink-2 placeholder-ink-4 outline-none resize-none rounded-lg px-2.5 py-2 leading-relaxed"
            rows={2}
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.07)',
            }}
            value={choice.feedback ?? ''}
            onChange={e => onUpdate({ feedback: e.target.value || undefined })}
            placeholder="Shown to player after this choice…"
          />
        )}
      </div>
    </div>
  )
}

// ── Shared form primitives ────────────────────────────────────────────────────

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-mono text-ink-3 tracking-[0.14em] uppercase mb-1.5">
      {children}
    </p>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      {children}
    </div>
  )
}
