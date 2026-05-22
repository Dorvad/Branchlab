'use client'

import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Eye, Globe, AlertTriangle, CheckCircle2, Save, Library, Loader2, Monitor, Smartphone, ChevronDown } from 'lucide-react'
import { BranchLabLoader } from '@/components/BranchLabLoader'
import { ThemeToggle } from '@/components/ThemeToggle'
import { motion, AnimatePresence } from 'framer-motion'
import { ScenarioCanvas } from './ScenarioCanvas'
import { LeftSidebar } from './LeftSidebar'
import { NodeInspector } from './NodeInspector'
import { ValidationPanel } from './ValidationPanel'
import { AssetLibrary } from './AssetLibrary'
import { validateScenario } from '@/lib/scenario-engine'
import { getScenario, saveScenario, publishScenario } from '@/lib/scenario-store'
import { fetchClips } from '@/lib/supabase/clips'
import { getSupabaseClient } from '@/lib/supabase/client'
import { PublishModal } from './PublishModal'
import type { Scenario, ScenarioNode, ScenarioChoice, ScenarioEdge, Clip, PublishConfig } from '@/types'

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

  // Mobile warning — editor is desktop-only
  const mobileWarning = (
    <div
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center p-8 text-center md:hidden"
      style={{ background: 'var(--bg-0)' }}
    >
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6"
        style={{ background: 'var(--tint-2)', border: '1px solid var(--line-2)' }}
      >
        <Monitor size={22} style={{ color: 'var(--fg-3)' }} />
      </div>
      <h2 className="text-lg font-semibold text-ink-0 mb-2">Open on a larger screen</h2>
      <p className="text-sm text-ink-3 leading-relaxed max-w-xs">
        The scenario editor is designed for desktop. Open this page on a laptop or desktop computer to build your scenario.
      </p>
      <Link
        href="/dashboard"
        className="mt-8 text-xs font-mono text-ink-3 hover:text-ink-1 transition-colors underline underline-offset-4"
      >
        Back to dashboard
      </Link>
    </div>
  )

  if (loading) {
    return (
      <>
        {mobileWarning}
        <div className="hidden md:block" style={{ background: 'var(--bg-0)' }}>
          <BranchLabLoader size={260} />
        </div>
      </>
    )
  }

  if (notFound || !scenario) {
    return (
      <>
        {mobileWarning}
        <div className="hidden md:flex h-screen items-center justify-center flex-col gap-4" style={{ background: 'var(--bg-0)' }}>
          <p className="text-ink-2 text-sm">Scenario not found.</p>
          <Link
            href="/dashboard"
            className="text-xs font-mono text-ink-3 hover:text-ink-1 transition-colors underline underline-offset-4"
          >
            Back to dashboard
          </Link>
        </div>
      </>
    )
  }

  return (
    <>
      {mobileWarning}
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
    </>
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
  const [saveError, setSaveError] = useState<string | null>(null)
  const [showPreviewMenu, setShowPreviewMenu] = useState(false)
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Refs so the autosave timeout always reads the latest state without stale closures
  const scenarioRef = useRef(scenario)
  const edgesRef = useRef<ScenarioEdge[]>([])
  useEffect(() => { scenarioRef.current = scenario }, [scenario])


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

  const duplicateNode = useCallback((nodeId: string) => {
    const node = scenario.nodes.find(n => n.id === nodeId)
    if (!node) return
    const ts = Date.now()
    const newNode: ScenarioNode = {
      ...node,
      id: `node-${ts}`,
      title: `${node.title} (copy)`,
      position: { x: node.position.x + 50, y: node.position.y + 50 },
      choices: node.choices.map((c, i) => ({ ...c, id: `choice-${ts}-${i}` })),
    }
    setScenario(prev => prev ? ({ ...prev, nodes: [...prev.nodes, newNode] }) : prev)
    setSelectedNodeId(newNode.id)
    setIsDirty(true)
  }, [scenario.nodes, setScenario, setSelectedNodeId, setIsDirty])

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
    setSaveError(null)
    setIsSaving(true)
    try {
      const stored = await saveScenario({
        ...scenarioRef.current,
        edges: edgesRef.current,
      })
      setScenario(stored)
      setSavedAt(new Date(stored.updatedAt))
      setIsDirty(false)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setIsSaving(false)
    }
  // isSaving intentionally omitted — we guard with the ref pattern instead
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setScenario, setSavedAt, setIsDirty])

  // ── Autosave: debounce 2.5 s after last change ────────────────────────────
  useEffect(() => {
    edgesRef.current = derivedEdges
  }, [derivedEdges])

  useEffect(() => {
    if (!isDirty || isSaving) return
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current)
    autoSaveTimerRef.current = setTimeout(handleSave, 2500)
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current)
    }
  // scenario in deps so the timer resets on every content change (debounce)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDirty, scenario, handleSave])

  // ── Canvas connection handlers ────────────────────────────────────────────

  const connectNodes = useCallback((sourceNodeId: string, targetNodeId: string) => {
    const newChoice: ScenarioChoice = {
      id: `choice-${Date.now()}`,
      label: 'New choice',
      targetNodeId,
    }
    setScenario(prev => prev ? ({
      ...prev,
      nodes: prev.nodes.map(n =>
        n.id === sourceNodeId ? { ...n, choices: [...n.choices, newChoice] } : n
      ),
    }) : prev)
    setSelectedNodeId(sourceNodeId)
    setIsDirty(true)
  }, [setScenario, setSelectedNodeId, setIsDirty])

  const reconnectEdge = useCallback((edgeId: string, newTargetNodeId: string) => {
    const parts = edgeId.split('__')
    if (parts.length < 2) return
    const [sourceNodeId, choiceId] = parts
    setScenario(prev => prev ? ({
      ...prev,
      nodes: prev.nodes.map(n =>
        n.id === sourceNodeId
          ? { ...n, choices: n.choices.map(c => c.id === choiceId ? { ...c, targetNodeId: newTargetNodeId } : c) }
          : n
      ),
    }) : prev)
    setIsDirty(true)
  }, [setScenario, setIsDirty])

  const onEdgeClick = useCallback((sourceNodeId: string) => {
    setSelectedNodeId(sourceNodeId)
  }, [setSelectedNodeId])

  const handlePublish = useCallback(async (config: PublishConfig) => {
    const updated = await publishScenario({ ...scenario, edges: derivedEdges }, config)
    setScenario(updated)
    setSavedAt(new Date(updated.updatedAt))
    setIsDirty(false)
  }, [scenario, derivedEdges, setScenario, setSavedAt, setIsDirty])

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      const isInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
        || (e.target as HTMLElement).isContentEditable
      if (isInput) return

      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedNodeId) {
        const node = scenario.nodes.find(n => n.id === selectedNodeId)
        if (node?.type === 'start') return // protect start node from accidental delete
        deleteNode(selectedNodeId)
        return
      }
      if (e.key === 'Escape') {
        setSelectedNodeId(null)
        return
      }
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key.toLowerCase() === 'd' && selectedNodeId) {
        e.preventDefault()
        duplicateNode(selectedNodeId)
        return
      }
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key.toLowerCase() === 's') {
        e.preventDefault()
        handleSave()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedNodeId, scenario.nodes])

  // ── Clip management ───────────────────────────────────────────────────────
  const [clips, setClips] = useState<Clip[]>([])

  useEffect(() => {
    fetchClips().then(setClips).catch(() => {})
  }, [])

  const addClip = useCallback((clip: Clip) => {
    setClips(prev => [clip, ...prev])
  }, [])

  const removeClip = useCallback((id: string) => {
    setClips(prev => prev.filter(c => c.id !== id))
  }, [])

  const attachClipToNode = useCallback((clipId: string) => {
    if (!selectedNodeId) return
    const clip = clips.find(c => c.id === clipId)
    if (!clip) return
    updateNode(selectedNodeId, {
      clip: { id: clip.id, url: clip.url, duration: clip.duration },
      clipId: undefined,
    })
  }, [selectedNodeId, clips, updateNode])

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
    : { borderColor: 'var(--line-2)', color: 'var(--fg-3)' }

  const validateBtnLabel = errorCount > 0
    ? `${errorCount} error${errorCount !== 1 ? 's' : ''}${warningCount > 0 ? ` · ${warningCount}` : ''}`
    : warningCount > 0
    ? `${warningCount} warning${warningCount !== 1 ? 's' : ''}`
    : 'Valid'

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: 'var(--bg-0)' }}>

      {/* ── Top bar ───────────────────────────────────────────────────────── */}
      <header
        className="flex items-center justify-between px-4 h-[52px] shrink-0 z-20 border-b"
        style={{
          borderColor: 'var(--line-1)',
          background: 'var(--bg-glass)',
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
          <span style={{ color: 'var(--line-3)' }}>/</span>
          <span className="text-sm font-medium text-ink-0 truncate max-w-[200px]">
            {scenario.title}
          </span>
          <StatusPill status={scenario.status} />
        </div>

        {/* Right */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAssets(v => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono border transition-all hover:bg-[var(--tint-3)]"
            style={{
              borderColor: showAssets ? 'var(--line-4)' : 'var(--line-2)',
              color: showAssets ? 'var(--fg-1)' : 'var(--fg-2)',
            }}
          >
            <Library size={12} />
            Assets
            {clips.length > 0 && (
              <span
                className="px-1.5 py-px rounded-full font-mono text-[9px]"
                style={{ background: 'var(--tint-3)', color: 'var(--fg-2)' }}
              >
                {clips.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setShowValidation(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono border transition-all hover:bg-[var(--tint-3)]"
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
            disabled={isSaving || !isDirty}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono border transition-all hover:bg-[var(--tint-3)] disabled:opacity-40"
            style={{
              borderColor: isDirty && !isSaving ? 'var(--line-4)' : 'var(--line-1)',
              color: isDirty && !isSaving ? 'var(--fg-1)' : 'var(--fg-3)',
            }}
            title={isSaving ? 'Saving…' : isDirty ? 'Save now (⌘S)' : 'All changes saved'}
          >
            {isSaving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
            {isSaving ? 'Saving…' : isDirty ? 'Save now' : 'Saved'}
          </button>

          <ThemeToggle />

          {/* ── Preview split button ──────────────────────────────────────── */}
          <div className="relative">
            <div
              className="flex items-stretch rounded-xl overflow-hidden border"
              style={{ borderColor: 'var(--line-2)' }}
            >
              <button
                onClick={async () => {
                  if (isDirty) await handleSave()
                  window.open(`/preview/${scenario.id}?device=mobile`, '_blank', 'noopener,noreferrer')
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono transition-all hover:bg-[var(--tint-3)]"
                style={{ color: 'var(--fg-1)' }}
              >
                <Eye size={12} />
                Preview
              </button>
              <div style={{ width: 1, background: 'var(--line-2)' }} />
              <button
                onClick={() => setShowPreviewMenu(v => !v)}
                className="flex items-center px-2 py-1.5 text-xs transition-all hover:bg-[var(--tint-3)]"
                style={{ color: 'var(--fg-3)' }}
              >
                <ChevronDown size={11} />
              </button>
            </div>

            {showPreviewMenu && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setShowPreviewMenu(false)} />
                <div
                  className="absolute right-0 top-full mt-1.5 rounded-xl overflow-hidden z-40"
                  style={{
                    background: 'var(--bg-1)',
                    border: '1px solid var(--line-2)',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                    minWidth: 170,
                  }}
                >
                  {[
                    { icon: <Smartphone size={13} />, label: 'Mobile preview', device: 'mobile' },
                    { icon: <Monitor size={13} />, label: 'Desktop preview', device: 'desktop' },
                  ].map(({ icon, label, device }) => (
                    <button
                      key={device}
                      onClick={async () => {
                        setShowPreviewMenu(false)
                        if (isDirty) await handleSave()
                        window.open(`/preview/${scenario.id}?device=${device}`, '_blank', 'noopener,noreferrer')
                      }}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-mono text-left transition-colors hover:bg-[var(--tint-3)]"
                      style={{ color: 'var(--fg-1)' }}
                    >
                      <span style={{ color: 'var(--fg-3)' }}>{icon}</span>
                      {label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <button
            onClick={() => setShowPublish(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono border transition-all hover:bg-[var(--tint-3)]"
            style={{ borderColor: 'var(--line-2)', color: 'var(--fg-2)' }}
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
            startNodeId={scenario.startNodeId}
            onConnect={connectNodes}
            onEdgeClick={onEdgeClick}
            onEdgeReconnect={reconnectEdge}
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
            onDuplicateNode={() => duplicateNode(selectedNode.id)}
            onOpenLibrary={() => setShowAssets(true)}
            onClose={() => setSelectedNodeId(null)}
          />
        )}
      </div>

      {/* ── Status bar ────────────────────────────────────────────────────── */}
      <div
        className="flex items-center gap-5 px-5 h-[34px] shrink-0 border-t"
        style={{
          borderColor: 'var(--line-1)',
          background: 'var(--bg-glass-2)',
        }}
      >
        {[
          { label: 'Scenes', value: scenario.nodes.length },
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
            color: warningCount === 0 ? 'var(--fg-3)' : 'oklch(80% 0.16 60)',
          },
        ].map(stat => (
          <div key={stat.label} className="flex items-center gap-1.5">
            <span className="text-[10px] font-mono text-ink-4 tracking-wider uppercase">
              {stat.label}
            </span>
            <span
              className="text-[10px] font-mono"
              style={{ color: 'color' in stat ? stat.color : 'var(--fg-2)' }}
            >
              {stat.value}
            </span>
          </div>
        ))}

        {/* Save status — right-aligned */}
        <div className="ml-auto flex items-center gap-1.5">
          {isSaving ? (
            <>
              <Loader2 size={10} className="animate-spin" style={{ color: 'var(--fg-3)' }} />
              <span className="text-[10px] font-mono" style={{ color: 'var(--fg-3)' }}>Autosaving…</span>
            </>
          ) : saveError ? (
            <span className="text-[10px] font-mono" style={{ color: 'oklch(70% 0.18 25)' }} title={saveError}>
              Save failed
            </span>
          ) : isDirty ? (
            <span className="text-[10px] font-mono" style={{ color: 'oklch(80% 0.16 60)' }}>
              Unsaved
            </span>
          ) : savedAt ? (
            <span className="text-[10px] font-mono" style={{ color: 'var(--fg-4)' }}>
              Saved {savedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          ) : null}
        </div>
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
          onPublish={(config) => handlePublish(config)}
          onClose={() => setShowPublish(false)}
        />
      )}

      <AnimatePresence>
        {showAssets && (
          <AssetLibrary
            clips={clips}
            selectedNodeTitle={selectedNode?.title ?? null}
            canAttach={!!selectedNodeId}
            nodeClipId={selectedNode?.clip?.id}
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
    draft:     { color: 'var(--fg-2)', bg: 'var(--tint-2)', border: 'var(--line-2)' },
    archived:  { color: 'var(--fg-3)', bg: 'var(--tint-1)', border: 'var(--line-1)' },
  }[status] ?? { color: 'var(--fg-2)', bg: 'var(--tint-2)', border: 'var(--line-2)' }

  return (
    <span
      className="px-2.5 py-0.5 rounded-full text-[10px] font-mono tracking-widest uppercase"
      style={{ color: s.color, background: s.bg, border: `1px solid ${s.border}` }}
    >
      {status}
    </span>
  )
}
