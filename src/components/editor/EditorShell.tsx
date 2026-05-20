'use client'

import { useState, useCallback, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Eye, Globe, AlertTriangle, CheckCircle2, Save, Library, Loader2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { ScenarioCanvas } from './ScenarioCanvas'
import { LeftSidebar } from './LeftSidebar'
import { NodeInspector } from './NodeInspector'
import { ValidationPanel } from './ValidationPanel'
import { AssetLibrary } from './AssetLibrary'
import { validateScenario } from '@/lib/scenario-engine'
import { getScenario, saveScenario, publishScenario } from '@/lib/scenario-store'
import { getAllClips } from '@/lib/clip-store'
import { getSupabaseClient } from '@/lib/supabase/client'
import { PublishModal } from './PublishModal'
import type { Scenario, ScenarioNode, ScenarioChoice, ScenarioEdge, VideoClip } from '@/types'

interface EditorShellProps {
  scenarioId: string
}

export function EditorShell({ scenarioId }: EditorShellProps) {
  const router = useRouter()
  const [scenario, setScenario] = useState<Scenario | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [isDirty, setIsDirty] = useState(false)
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const [showValidation, setShowValidation] = useState(false)
  const [showPublish, setShowPublish] = useState(false)
  const [showAssets, setShowAssets] = useState(false)

  // Auth guard + initial scenario load
  useEffect(() => {
    const sb = getSupabaseClient()
    sb.auth.getUser().then(async res => {
      const user = res.data?.user
      if (!user) {
        router.replace('/auth')
        return
      }
      const s = await getScenario(scenarioId)
      if (!s) {
        setNotFound(true)
      } else {
        setScenario(s)
        setSavedAt(new Date(s.updatedAt))
      }
      setLoading(false)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenarioId])

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center" style={{ background: '#0a0b10' }}>
        <Loader2 size={22} className="animate-spin text-ink-3" />
      </div>
    )
  }

  if (notFound || !scenario) {
    return (
      <div className="flex h-screen items-center justify-center flex-col gap-4" style={{ background: '#0a0b10' }}>
        <p className="text-ink-2 text-sm">Scenario not found.</p>
        <Link
          href="/dashboard"
          className="text-xs font-mono text-ink-3 hover:text-ink-1 transition-colors underline underline-offset-4"
        >
          Back to dashboard
        </Link>
      </div>
    )
  }

  return (
    <EditorUI
      scenario={scenario}
      setScenario={setScenario}
      selectedNodeId={selectedNodeId}
      setSelectedNodeId={setSelectedNodeId}
      isDirty={isDirty}
      setIsDirty={setIsDirty}
      savedAt={savedAt}
      setSavedAt={setSavedAt}
      showValidation={showValidation}
      setShowValidation={setShowValidation}
      showPublish={showPublish}
      setShowPublish={setShowPublish}
      showAssets={showAssets}
      setShowAssets={setShowAssets}
    />
  )
}

// ── EditorUI ───────────────────────────────────────────────────────────────────
// Separated so that hooks aren't called conditionally above the null-guard.

interface EditorUIProps {
  scenario: Scenario
  setScenario: React.Dispatch<React.SetStateAction<Scenario | null>>
  selectedNodeId: string | null
  setSelectedNodeId: React.Dispatch<React.SetStateAction<string | null>>
  isDirty: boolean
  setIsDirty: React.Dispatch<React.SetStateAction<boolean>>
  savedAt: Date | null
  setSavedAt: React.Dispatch<React.SetStateAction<Date | null>>
  showValidation: boolean
  setShowValidation: React.Dispatch<React.SetStateAction<boolean>>
  showPublish: boolean
  setShowPublish: React.Dispatch<React.SetStateAction<boolean>>
  showAssets: boolean
  setShowAssets: React.Dispatch<React.SetStateAction<boolean>>
}

function EditorUI({
  scenario,
  setScenario,
  selectedNodeId,
  setSelectedNodeId,
  isDirty,
  setIsDirty,
  savedAt,
  setSavedAt,
  showValidation,
  setShowValidation,
  showPublish,
  setShowPublish,
  showAssets,
  setShowAssets,
}: EditorUIProps) {
  const [isSaving, setIsSaving] = useState(false)

  const selectedNode = useMemo(
    () => scenario.nodes.find(n => n.id === selectedNodeId) ?? null,
    [scenario.nodes, selectedNodeId]
  )

  // Edges derived from choices — no separate edges array needed during editing
  const derivedEdges = useMemo<ScenarioEdge[]>(() => {
    const nodeIds = new Set(scenario.nodes.map(n => n.id))
    const edges: ScenarioEdge[] = []
    for (const node of scenario.nodes) {
      for (const choice of node.choices) {
        if (choice.targetNodeId && nodeIds.has(choice.targetNodeId)) {
          edges.push({
            id: `${node.id}__${choice.id}`,
            sourceNodeId: node.id,
            targetNodeId: choice.targetNodeId,
            choiceId: choice.id,
          })
        }
      }
    }
    return edges
  }, [scenario.nodes])

  const validationResult = useMemo(
    () => validateScenario(scenario),
    [scenario]
  )

  // Derive per-node status for canvas and sidebar indicators
  const nodeStatusMap = useMemo((): Record<string, 'error' | 'warning'> => {
    const map: Record<string, 'error' | 'warning'> = {}
    for (const [nodeId, nodeIssues] of Object.entries(validationResult.nodeIssueMap)) {
      map[nodeId] = nodeIssues.some(i => i.severity === 'error') ? 'error' : 'warning'
    }
    return map
  }, [validationResult.nodeIssueMap])

  // ── Node mutations ────────────────────────────────────────────────────────

  const updateNode = useCallback((nodeId: string, updates: Partial<ScenarioNode>) => {
    setScenario(prev => prev ? ({
      ...prev,
      nodes: prev.nodes.map(n => n.id === nodeId ? { ...n, ...updates } : n),
    }) : prev)
    setIsDirty(true)
  }, [setScenario, setIsDirty])

  const updateNodePosition = useCallback((nodeId: string, position: { x: number; y: number }) => {
    setScenario(prev => prev ? ({
      ...prev,
      nodes: prev.nodes.map(n => n.id === nodeId ? { ...n, position } : n),
    }) : prev)
  }, [setScenario])

  const addNode = useCallback(() => {
    const maxY = scenario.nodes.length
      ? Math.max(...scenario.nodes.map(n => n.position.y)) + 180
      : 120
    const newNode: ScenarioNode = {
      id: `node-${Date.now()}`,
      type: 'scene',
      title: 'New Scene',
      description: '',
      choices: [],
      position: { x: 260 + Math.floor(Math.random() * 200), y: maxY },
    }
    setScenario(prev => prev ? ({ ...prev, nodes: [...prev.nodes, newNode] }) : prev)
    setSelectedNodeId(newNode.id)
    setIsDirty(true)
  }, [scenario.nodes, setScenario, setSelectedNodeId, setIsDirty])

  const deleteNode = useCallback((nodeId: string) => {
    setScenario(prev => prev ? ({
      ...prev,
      nodes: prev.nodes
        .filter(n => n.id !== nodeId)
        .map(n => ({
          ...n,
          choices: n.choices.map(c =>
            c.targetNodeId === nodeId ? { ...c, targetNodeId: '' } : c
          ),
        })),
    }) : prev)
    setSelectedNodeId(id => id === nodeId ? null : id)
    setIsDirty(true)
  }, [setScenario, setSelectedNodeId, setIsDirty])

  // ── Choice mutations ──────────────────────────────────────────────────────

  const addChoice = useCallback((nodeId: string) => {
    const newChoice: ScenarioChoice = {
      id: `choice-${Date.now()}`,
      label: 'New choice',
      targetNodeId: '',
    }
    setScenario(prev => prev ? ({
      ...prev,
      nodes: prev.nodes.map(n =>
        n.id === nodeId ? { ...n, choices: [...n.choices, newChoice] } : n
      ),
    }) : prev)
    setIsDirty(true)
  }, [setScenario, setIsDirty])

  const updateChoice = useCallback(
    (nodeId: string, choiceId: string, updates: Partial<ScenarioChoice>) => {
      setScenario(prev => prev ? ({
        ...prev,
        nodes: prev.nodes.map(n =>
          n.id === nodeId
            ? { ...n, choices: n.choices.map(c => c.id === choiceId ? { ...c, ...updates } : c) }
            : n
        ),
      }) : prev)
      setIsDirty(true)
    },
    [setScenario, setIsDirty]
  )

  const deleteChoice = useCallback((nodeId: string, choiceId: string) => {
    setScenario(prev => prev ? ({
      ...prev,
      nodes: prev.nodes.map(n =>
        n.id === nodeId
          ? { ...n, choices: n.choices.filter(c => c.id !== choiceId) }
          : n
      ),
    }) : prev)
    setIsDirty(true)
  }, [setScenario, setIsDirty])

  // ── Save ──────────────────────────────────────────────────────────────────

  const handleSave = useCallback(async () => {
    if (isSaving) return
    setIsSaving(true)
    try {
      const stored = await saveScenario({ ...scenario, edges: derivedEdges })
      setScenario(stored)
      setSavedAt(new Date(stored.updatedAt))
      setIsDirty(false)
    } finally {
      setIsSaving(false)
    }
  }, [scenario, derivedEdges, isSaving, setScenario, setSavedAt, setIsDirty])

  const handlePublish = useCallback(async (slug: string) => {
    const updated = await publishScenario({ ...scenario, edges: derivedEdges }, slug)
    setScenario(updated)
    setSavedAt(new Date(updated.updatedAt))
    setIsDirty(false)
  }, [scenario, derivedEdges, setScenario, setSavedAt, setIsDirty])

  // ── Clip management ───────────────────────────────────────────────────────
  const [clips, setClips] = useState<VideoClip[]>(() => getAllClips())

  const addClip = useCallback((clip: VideoClip) => {
    setClips(prev => [clip, ...prev])
  }, [])

  const removeClip = useCallback((id: string) => {
    setClips(prev => prev.filter(c => c.id !== id))
  }, [])

  const attachClipToNode = useCallback((clipId: string) => {
    if (!selectedNodeId) return
    updateNode(selectedNodeId, { clipId })
  }, [selectedNodeId, updateNode])

  const { errors, warnings } = validationResult
  const errorCount = errors.length
  const warningCount = warnings.length

  const handleSelectFromValidation = (nodeId: string) => {
    setSelectedNodeId(nodeId)
    setShowValidation(false)
  }

  // Validation button style: red if errors, amber if only warnings, muted if valid
  const validateBtnStyle = errorCount > 0
    ? { borderColor: 'oklch(70% 0.18 25 / 0.4)', color: 'oklch(70% 0.18 25)' }
    : warningCount > 0
    ? { borderColor: 'oklch(80% 0.16 60 / 0.4)', color: 'oklch(80% 0.16 60)' }
    : { borderColor: 'rgba(255,255,255,0.1)', color: '#5c6273' }

  const validateBtnLabel = errorCount > 0
    ? `${errorCount} error${errorCount !== 1 ? 's' : ''}${warningCount > 0 ? ` · ${warningCount}` : ''}`
    : warningCount > 0
    ? `${warningCount} warning${warningCount !== 1 ? 's' : ''}`
    : 'Valid'

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: '#0a0b10' }}>

      {/* ── Top bar ───────────────────────────────────────────────────────── */}
      <header
        className="flex items-center justify-between px-4 h-[52px] shrink-0 z-20 border-b"
        style={{
          borderColor: 'rgba(255,255,255,0.07)',
          background: 'rgba(8,9,13,0.92)',
          backdropFilter: 'blur(16px)',
        }}
      >
        {/* Left */}
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/dashboard"
            className="shrink-0 flex items-center gap-1.5 text-sm text-ink-3 hover:text-ink-1 transition-colors"
          >
            <ArrowLeft size={14} />
            <span className="hidden sm:inline">Dashboard</span>
          </Link>
          <span style={{ color: 'rgba(255,255,255,0.12)' }}>/</span>
          <span className="text-sm font-medium text-ink-0 truncate max-w-[200px]">
            {scenario.title}
          </span>
          <StatusPill status={scenario.status} />
          {isDirty && (
            <span className="text-[10px] font-mono text-ink-3 tracking-wider">
              unsaved
            </span>
          )}
        </div>

        {/* Right */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAssets(v => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono border transition-all hover:bg-white/5"
            style={{
              borderColor: showAssets ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.1)',
              color: showAssets ? '#c9cdda' : '#8a90a4',
            }}
          >
            <Library size={12} />
            Assets
            {clips.length > 0 && (
              <span
                className="px-1.5 py-px rounded-full font-mono text-[9px]"
                style={{ background: 'rgba(255,255,255,0.08)', color: '#8a90a4' }}
              >
                {clips.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setShowValidation(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono border transition-all hover:bg-white/5"
            style={validateBtnStyle}
          >
            {errorCount > 0 ? (
              <><AlertTriangle size={12} /> {validateBtnLabel}</>
            ) : warningCount > 0 ? (
              <><AlertTriangle size={12} /> {validateBtnLabel}</>
            ) : (
              <><CheckCircle2 size={12} /> {validateBtnLabel}</>
            )}
          </button>

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono border transition-all hover:bg-white/5 disabled:opacity-50"
            style={{
              borderColor: isDirty ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.08)',
              color: isDirty ? '#c9cdda' : '#5c6273',
            }}
          >
            {isSaving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
            {isSaving ? 'Saving…' : 'Save draft'}
          </button>

          <Link
            href={`/preview/${scenario.id}`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono border transition-all hover:bg-white/5"
            style={{ borderColor: 'rgba(255,255,255,0.1)', color: '#c9cdda' }}
          >
            <Eye size={12} />
            Preview
          </Link>

          <button
            onClick={() => setShowPublish(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono border transition-all hover:bg-white/5"
            style={{ borderColor: 'rgba(255,255,255,0.1)', color: '#8a90a4' }}
          >
            <Globe size={12} />
            {scenario.publishedVersion ? 'Republish' : 'Publish'}
          </button>
        </div>
      </header>

      {/* ── Main body ─────────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        <LeftSidebar
          scenario={scenario}
          selectedNodeId={selectedNodeId}
          onSelectNode={setSelectedNodeId}
          onAddNode={addNode}
          nodeStatusMap={nodeStatusMap}
        />

        <div className="flex-1 relative overflow-hidden">
          <ScenarioCanvas
            nodes={scenario.nodes}
            edges={derivedEdges}
            selectedNodeId={selectedNodeId}
            onSelectNode={setSelectedNodeId}
            onNodePositionChange={updateNodePosition}
            nodeStatusMap={nodeStatusMap}
          />
        </div>

        {selectedNode && (
          <NodeInspector
            node={selectedNode}
            allNodes={scenario.nodes}
            clips={clips}
            onUpdateNode={updateNode}
            onAddChoice={addChoice}
            onUpdateChoice={updateChoice}
            onDeleteChoice={deleteChoice}
            onDeleteNode={deleteNode}
            onOpenLibrary={() => setShowAssets(true)}
            onClose={() => setSelectedNodeId(null)}
          />
        )}
      </div>

      {/* ── Status bar ────────────────────────────────────────────────────── */}
      <div
        className="flex items-center gap-5 px-5 h-[34px] shrink-0 border-t"
        style={{
          borderColor: 'rgba(255,255,255,0.06)',
          background: 'rgba(8,9,13,0.75)',
        }}
      >
        {[
          { label: 'Nodes', value: scenario.nodes.length },
          { label: 'Edges', value: derivedEdges.length },
          { label: 'Endings', value: scenario.nodes.filter(n => n.type === 'ending').length },
          {
            label: 'Errors',
            value: errorCount === 0 ? '✓ none' : String(errorCount),
            color: errorCount === 0 ? 'oklch(82% 0.18 165)' : 'oklch(70% 0.18 25)',
          },
          {
            label: 'Warnings',
            value: warningCount === 0 ? '✓ none' : String(warningCount),
            color: warningCount === 0 ? '#5c6273' : 'oklch(80% 0.16 60)',
          },
          {
            label: 'Saved',
            value: savedAt
              ? savedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : 'never',
          },
        ].map(stat => (
          <div key={stat.label} className="flex items-center gap-1.5">
            <span className="text-[10px] font-mono text-ink-4 tracking-wider uppercase">
              {stat.label}
            </span>
            <span
              className="text-[10px] font-mono"
              style={{ color: 'color' in stat ? stat.color : '#8a90a4' }}
            >
              {stat.value}
            </span>
          </div>
        ))}
      </div>

      {showValidation && (
        <ValidationPanel
          result={validationResult}
          onSelectNode={handleSelectFromValidation}
          onClose={() => setShowValidation(false)}
        />
      )}

      {showPublish && (
        <PublishModal
          scenario={scenario}
          validationResult={validationResult}
          onPublish={handlePublish}
          onClose={() => setShowPublish(false)}
        />
      )}

      <AnimatePresence>
        {showAssets && (
          <AssetLibrary
            clips={clips}
            selectedNodeTitle={selectedNode?.title ?? null}
            canAttach={!!selectedNodeId}
            onAddClip={addClip}
            onRemoveClip={removeClip}
            onAttachToNode={attachClipToNode}
            onClose={() => setShowAssets(false)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function StatusPill({ status }: { status: string }) {
  const s = {
    published: { color: 'oklch(82% 0.18 165)', bg: 'oklch(82% 0.18 165 / 0.1)', border: 'oklch(82% 0.18 165 / 0.3)' },
    draft:     { color: '#8a90a4', bg: 'rgba(255,255,255,0.04)', border: 'rgba(255,255,255,0.1)' },
    archived:  { color: '#5c6273', bg: 'rgba(255,255,255,0.02)', border: 'rgba(255,255,255,0.07)' },
  }[status] ?? { color: '#8a90a4', bg: 'rgba(255,255,255,0.04)', border: 'rgba(255,255,255,0.1)' }

  return (
    <span
      className="px-2.5 py-0.5 rounded-full text-[10px] font-mono tracking-widest uppercase"
      style={{ color: s.color, background: s.bg, border: `1px solid ${s.border}` }}
    >
      {status}
    </span>
  )
}
