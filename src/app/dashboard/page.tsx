'use client'

import {
  useState, useEffect, useTransition, useMemo,
  useCallback, useRef,
} from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, Globe, Film, Home, Loader2, Search,
  LogOut, Sun, Moon, FileEdit, Trash2, Copy,
  GitBranch, Clock, ExternalLink, X, Play,
  ChevronDown, Check, Upload,
  Eye, BarChart3, Download, FolderOpen, Settings,
} from 'lucide-react'
import { BranchLabLoader } from '@/components/BranchLabLoader'
import {
  getAllScenarios,
  saveScenario,
  deleteScenario,
  createScenario,
  createFromTemplate,
  duplicateScenario,
} from '@/lib/scenario-store'
import { getSupabaseClient } from '@/lib/supabase/client'
import { signOut } from '@/lib/supabase/auth'
import { fetchClips, uploadClip, deleteClip, formatFileSize, formatDuration, ACCEPTED_EXTENSIONS, LARGE_FILE_WARNING_BYTES } from '@/lib/supabase/clips'
import { exportToBlab, importFromBlab, blabToScenario } from '@/lib/blab-format'
import { exportToZip, importFromZip } from '@/lib/zip-export'
import type { ClipUploadStatus, OrgWithRole } from '@/types'
import { useTheme } from '@/lib/theme'
import type { Scenario, Clip } from '@/types'
import type { User } from '@supabase/supabase-js'
import { useOrg } from '@/lib/org-context'
import { createOrg } from '@/lib/supabase/orgs'

type Section = 'home' | 'drafts' | 'published' | 'assets'
type SortKey = 'updated' | 'name' | 'created'

// ─────────────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter()
  const { activeOrg, setActiveOrg, orgs, refetchOrgs } = useOrg()
  const [user, setUser] = useState<User | null>(null)
  const [scenarios, setScenarios] = useState<Scenario[]>([])
  const [clips, setClips] = useState<Clip[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const hasLoadedRef = useRef(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const [section, setSection] = useState<Section>('home')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<SortKey>('updated')
  const [deleteTarget, setDeleteTarget] = useState<Scenario | null>(null)

  // Per-file upload state for the assets view
  const [uploadState, setUploadState] = useState<{
    fileName: string
    status: import('@/types').ClipUploadStatus
    progress: number
    error?: string
  } | null>(null)

  // Auth guard — runs once on mount
  useEffect(() => {
    const sb = getSupabaseClient()
    sb.auth.getUser().then(res => {
      const u = res.data?.user
      if (!u) { router.replace('/auth'); return }
      setUser(u)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Reload scenarios whenever user authenticates or active org changes
  useEffect(() => {
    if (!user) return
    const isFirstLoad = !hasLoadedRef.current
    if (isFirstLoad) {
      setLoading(true)
    } else {
      setRefreshing(true)
    }
    setError(null)
    setClips([]) // reset clips so lazy-load picks up the new scope
    getAllScenarios(activeOrg?.id ?? null)
      .then(s => {
        setScenarios(s)
        setLoading(false)
        setRefreshing(false)
        hasLoadedRef.current = true
      })
      .catch(e => {
        setError(e.message ?? 'Failed to load')
        setLoading(false)
        setRefreshing(false)
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, activeOrg?.id])

  // Lazy-load clips when assets tab opens
  useEffect(() => {
    if (section === 'assets' && clips.length === 0) {
      fetchClips(activeOrg?.id ?? null).then(setClips).catch(() => {})
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section, clips.length, activeOrg?.id])

  const load = () => {
    setError(null)
    getAllScenarios(activeOrg?.id ?? null)
      .then(s => { setScenarios(s); setLoading(false) })
      .catch(e => { setError(e.message ?? 'Failed to load'); setLoading(false) })
  }

  const [createError, setCreateError] = useState<string | null>(null)

  // Reset search when workspace switches
  useEffect(() => { setSearch('') }, [activeOrg?.id])

  const handleCreate = () => {
    setCreateError(null)
    startTransition(async () => {
      try {
        const s = createScenario()
        await saveScenario(s, activeOrg?.id ?? null)
        router.push(`/editor/${s.id}`)
      } catch (e) {
        setCreateError(e instanceof Error ? e.message : 'Failed to create scenario')
      }
    })
  }

  const handleCreateFromTemplate = () => {
    setCreateError(null)
    startTransition(async () => {
      try {
        const s = createFromTemplate()
        await saveScenario(s, activeOrg?.id ?? null)
        router.push(`/editor/${s.id}`)
      } catch (e) {
        setCreateError(e instanceof Error ? e.message : 'Failed to create scenario')
      }
    })
  }

  const handleDuplicate = useCallback(async (source: Scenario) => {
    try {
      const copy = duplicateScenario(source)
      await saveScenario(copy, activeOrg?.id ?? null)
      load()
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : 'Failed to duplicate scenario')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeOrg?.id])

  const confirmDelete = useCallback((s: Scenario) => setDeleteTarget(s), [])

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return
    try {
      await deleteScenario(deleteTarget.id)
      setDeleteTarget(null)
      load()
    } catch (e) {
      setDeleteTarget(null)
      setCreateError(e instanceof Error ? e.message : 'Failed to delete scenario')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deleteTarget])

  const handleClipUpload = useCallback(async (file: File) => {
    setUploadState({ fileName: file.name, status: 'uploading', progress: 0 })
    try {
      const clip = await uploadClip(
        file,
        p => setUploadState(s => s ? { ...s, progress: Math.round((p.loaded / p.total) * 100) } : s),
        status => setUploadState(s => s ? { ...s, status } : s),
        activeOrg?.id ?? null,
      )
      setClips(prev => [clip, ...prev])
      setTimeout(() => setUploadState(null), 1500)
    } catch (e) {
      setUploadState(s => s ? { ...s, status: 'failed', error: e instanceof Error ? e.message : 'Upload failed' } : s)
      setTimeout(() => setUploadState(null), 4000)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeOrg?.id])

  const handleClipDelete = useCallback(async (clip: import('@/types').Clip) => {
    try {
      await deleteClip(clip.id, clip.storagePath)
      setClips(prev => prev.filter(c => c.id !== clip.id))
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : 'Delete failed')
    }
  }, [])

  const [zipImportProgress, setZipImportProgress] = useState<{ pct: number; label: string } | null>(null)

  const handleImportBlab = useCallback(async (file: File) => {
    try {
      const blab = await importFromBlab(file)
      const draft = blabToScenario(blab)
      const saved = await saveScenario(draft, activeOrg?.id ?? null)
      router.push(`/editor/${saved.id}`)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Import failed')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, activeOrg?.id])

  const handleImportZip = useCallback(async (file: File) => {
    setZipImportProgress({ pct: 0, label: 'Starting…' })
    try {
      const draft = await importFromZip(file, (pct, label) => setZipImportProgress({ pct, label }))
      const saved = await saveScenario(draft, activeOrg?.id ?? null)
      setZipImportProgress(null)
      router.push(`/editor/${saved.id}`)
    } catch (e) {
      setZipImportProgress(null)
      alert(e instanceof Error ? e.message : 'ZIP import failed')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, activeOrg?.id])

  const drafts = useMemo(() => scenarios.filter(s => s.status !== 'published'), [scenarios])
  const published = useMemo(() => scenarios.filter(s => s.status === 'published'), [scenarios])

  const sortFn = useCallback((a: Scenario, b: Scenario): number => {
    if (sort === 'name') return a.title.localeCompare(b.title)
    if (sort === 'created') return a.createdAt.localeCompare(b.createdAt)
    return b.updatedAt.localeCompare(a.updatedAt)
  }, [sort])

  const filtered = useCallback((list: Scenario[]) =>
    list
      .filter(s => s.title.toLowerCase().includes(search.toLowerCase()))
      .sort(sortFn),
  [search, sortFn])

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg-0)' }}>
      {/* ── Left sidebar ── */}
      <Sidebar
        section={section}
        onSectionChange={setSection}
        draftCount={drafts.length}
        publishedCount={published.length}
        assetCount={clips.length}
        user={user}
        onCreateBlank={handleCreate}
        onCreateFromTemplate={handleCreateFromTemplate}
        isPending={isPending}
        onImportBlab={handleImportBlab}
        onImportZip={handleImportZip}
        activeOrg={activeOrg}
        setActiveOrg={setActiveOrg}
        orgs={orgs}
        refetchOrgs={refetchOrgs}
      />

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar
          search={search}
          onSearch={setSearch}
          sort={sort}
          onSort={setSort}
          section={section}
          onCreateBlank={handleCreate}
          onCreateFromTemplate={handleCreateFromTemplate}
          isPending={isPending}
          refreshing={refreshing}
        />

        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <BranchLabLoader fullscreen={false} size={180} showCaption={false} />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-64 gap-3">
              <p className="text-sm" style={{ color: 'var(--fg-3)' }}>{error}</p>
              <button
                onClick={load}
                className="text-xs underline underline-offset-2 transition-colors"
                style={{ color: 'var(--fg-3)' }}
              >
                Retry
              </button>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              {section === 'assets' ? (
                <motion.div key="assets" {...fadeProps}>
                  <AssetsView
                    clips={clips}
                    uploadState={uploadState}
                    onUpload={handleClipUpload}
                    onClipDelete={handleClipDelete}
                  />
                </motion.div>
              ) : section === 'drafts' ? (
                <motion.div key="drafts" {...fadeProps}>
                  <SectionView
                    title="Drafts"
                    scenarios={filtered(drafts)}
                    search={search}
                    onDuplicate={handleDuplicate}
                    onDelete={confirmDelete}
                    onCreateBlank={handleCreate}
                    onCreateFromTemplate={handleCreateFromTemplate}
                  />
                </motion.div>
              ) : section === 'published' ? (
                <motion.div key="published" {...fadeProps}>
                  <SectionView
                    title="Published"
                    scenarios={filtered(published)}
                    search={search}
                    onDuplicate={handleDuplicate}
                    onDelete={confirmDelete}
                  />
                </motion.div>
              ) : (
                <motion.div key="home" {...fadeProps}>
                  <HomeView
                    scenarios={scenarios}
                    drafts={filtered(drafts)}
                    published={filtered(published)}
                    search={search}
                    onDuplicate={handleDuplicate}
                    onDelete={confirmDelete}
                    onCreateBlank={handleCreate}
                    onCreateFromTemplate={handleCreateFromTemplate}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>
      </div>

      {/* ── Create error toast ── */}
      <AnimatePresence>
        {createError && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] flex items-center gap-3 px-4 py-3 rounded-xl"
            style={{
              background: 'oklch(70% 0.18 25 / 0.12)',
              border: '1px solid oklch(70% 0.18 25 / 0.35)',
              backdropFilter: 'blur(12px)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
            }}
          >
            <p className="text-sm font-mono" style={{ color: 'oklch(70% 0.18 25)' }}>{createError}</p>
            <button
              onClick={() => setCreateError(null)}
              className="shrink-0"
              style={{ color: 'oklch(70% 0.18 25)' }}
            >
              <X size={13} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Delete confirmation modal ── */}
      <AnimatePresence>
        {deleteTarget && (
          <ConfirmDeleteModal
            name={deleteTarget.title}
            onConfirm={handleDelete}
            onCancel={() => setDeleteTarget(null)}
          />
        )}
      </AnimatePresence>

      {/* ── ZIP import progress modal ── */}
      <AnimatePresence>
        {zipImportProgress && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="rounded-2xl px-8 py-6 flex flex-col items-center gap-4"
              style={{ background: 'var(--bg-1)', border: '1px solid var(--line-2)', minWidth: 280 }}
            >
              <Loader2 size={24} className="animate-spin" style={{ color: 'oklch(82% 0.18 165)' }} />
              <div className="text-center">
                <p className="text-sm font-medium" style={{ color: 'var(--fg-0)' }}>Importing ZIP</p>
                <p className="text-xs mt-1 font-mono" style={{ color: 'var(--fg-3)' }}>{zipImportProgress.label}</p>
              </div>
              <div className="w-full rounded-full overflow-hidden" style={{ height: 4, background: 'var(--tint-3)' }}>
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${zipImportProgress.pct}%`, background: 'oklch(82% 0.18 165)' }}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

const fadeProps = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.15 },
}

// ── Sidebar ───────────────────────────────────────────────────────────────────

interface SidebarProps {
  section: Section
  onSectionChange: (s: Section) => void
  draftCount: number
  publishedCount: number
  assetCount: number
  user: User | null
  onCreateBlank: () => void
  onCreateFromTemplate: () => void
  isPending: boolean
  onImportBlab: (file: File) => void
  onImportZip: (file: File) => void
  activeOrg: OrgWithRole | null
  setActiveOrg: (org: OrgWithRole | null) => void
  orgs: OrgWithRole[]
  refetchOrgs: () => Promise<void>
}

function Sidebar({
  section, onSectionChange,
  draftCount, publishedCount, assetCount,
  user, onCreateBlank, onCreateFromTemplate, isPending,
  onImportBlab, onImportZip,
  activeOrg, setActiveOrg, orgs, refetchOrgs,
}: SidebarProps) {
  const blabInputRef = useRef<HTMLInputElement>(null)
  const zipInputRef = useRef<HTMLInputElement>(null)
  const [showCreateMenu, setShowCreateMenu] = useState(false)
  const createRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (createRef.current && !createRef.current.contains(e.target as Node)) {
        setShowCreateMenu(false)
      }
    }
    if (showCreateMenu) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showCreateMenu])

  const navItems: { key: Section; icon: React.ReactNode; label: string; count?: number }[] = [
    { key: 'home', icon: <Home size={15} />, label: 'Home' },
    { key: 'drafts', icon: <FileEdit size={15} />, label: 'Drafts', count: draftCount },
    { key: 'published', icon: <Globe size={15} />, label: 'Published', count: publishedCount },
    { key: 'assets', icon: <Film size={15} />, label: 'Assets', count: assetCount > 0 ? assetCount : undefined },
  ]

  return (
    <aside
      className="flex flex-col shrink-0 h-full"
      style={{
        width: 224,
        borderRight: '1px solid var(--line-1)',
        background: 'var(--bg-1)',
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 h-[52px] shrink-0 border-b" style={{ borderColor: 'var(--line-1)' }}>
        <svg width="22" height="22" viewBox="0 0 44 44" fill="none">
          <circle cx="10" cy="22" r="5" fill="oklch(82% 0.18 165)" />
          <circle cx="34" cy="10" r="4" fill="oklch(78% 0.18 285)" />
          <circle cx="34" cy="34" r="4" fill="oklch(80% 0.16 60)" />
          <path d="M14 22 L30 12 M14 22 L30 32" stroke="currentColor" strokeOpacity="0.4" strokeWidth="1.5" />
        </svg>
        <span className="font-semibold text-sm tracking-tight" style={{ color: 'var(--fg-0)' }}>BranchLab</span>
      </div>

      {/* Create button */}
      <div className="px-3 pt-4 pb-2" ref={createRef}>
        <div className="relative">
          <div
            className="flex items-stretch rounded-xl overflow-hidden"
            style={{ background: 'oklch(82% 0.18 165)', boxShadow: '0 0 16px oklch(82% 0.18 165 / 0.3)' }}
          >
            <button
              onClick={onCreateFromTemplate}
              disabled={isPending}
              className="flex-1 flex items-center gap-2 px-3 py-2 text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-60"
              style={{ color: '#052916' }}
            >
              {isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              New Scenario
            </button>
            <div style={{ width: 1, background: 'oklch(60% 0.18 165 / 0.4)' }} />
            <button
              onClick={() => setShowCreateMenu(v => !v)}
              className="px-2.5 py-2 transition-opacity hover:opacity-90"
              style={{ color: '#052916' }}
            >
              <ChevronDown size={12} />
            </button>
          </div>

          <AnimatePresence>
            {showCreateMenu && (
              <motion.div
                initial={{ opacity: 0, y: -4, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.97 }}
                transition={{ duration: 0.12 }}
                className="absolute left-0 right-0 top-full mt-1.5 rounded-xl overflow-hidden z-50"
                style={{
                  background: 'var(--bg-1)',
                  border: '1px solid var(--line-2)',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
                }}
              >
                <button
                  onClick={() => { setShowCreateMenu(false); onCreateFromTemplate() }}
                  className="w-full flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-[var(--tint-2)]"
                >
                  <GitBranch size={14} className="mt-0.5 shrink-0" style={{ color: 'oklch(82% 0.18 165)' }} />
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--fg-0)' }}>From template</p>
                    <p className="text-[11px] mt-0.5" style={{ color: 'var(--fg-3)' }}>Start node, 2 paths, 1 ending</p>
                  </div>
                </button>
                <div style={{ height: 1, background: 'var(--line-1)' }} />
                <button
                  onClick={() => { setShowCreateMenu(false); onCreateBlank() }}
                  className="w-full flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-[var(--tint-2)]"
                >
                  <Plus size={14} className="mt-0.5 shrink-0" style={{ color: 'var(--fg-3)' }} />
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--fg-0)' }}>Blank scenario</p>
                    <p className="text-[11px] mt-0.5" style={{ color: 'var(--fg-3)' }}>Empty canvas, start from scratch</p>
                  </div>
                </button>
                <div style={{ height: 1, background: 'var(--line-1)' }} />
                <button
                  onClick={() => { setShowCreateMenu(false); blabInputRef.current?.click() }}
                  className="w-full flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-[var(--tint-2)]"
                >
                  <FolderOpen size={14} className="mt-0.5 shrink-0" style={{ color: 'var(--fg-3)' }} />
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--fg-0)' }}>Import .blab</p>
                    <p className="text-[11px] mt-0.5" style={{ color: 'var(--fg-3)' }}>Restore from scenario file</p>
                  </div>
                </button>
                <button
                  onClick={() => { setShowCreateMenu(false); zipInputRef.current?.click() }}
                  className="w-full flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-[var(--tint-2)]"
                >
                  <Download size={14} className="mt-0.5 shrink-0" style={{ color: 'var(--fg-3)' }} />
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--fg-0)' }}>Import ZIP</p>
                    <p className="text-[11px] mt-0.5" style={{ color: 'var(--fg-3)' }}>Scenario + video bundle</p>
                  </div>
                </button>
                {/* Hidden file inputs */}
                <input
                  ref={blabInputRef}
                  type="file"
                  accept=".blab,.json"
                  className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) { onImportBlab(f); e.target.value = '' } }}
                />
                <input
                  ref={zipInputRef}
                  type="file"
                  accept=".zip"
                  className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) { onImportZip(f); e.target.value = '' } }}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Nav */}
      <nav className="px-2 flex-1 space-y-0.5 pt-1">
        {navItems.map(item => {
          const active = section === item.key
          return (
            <button
              key={item.key}
              onClick={() => onSectionChange(item.key)}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all"
              style={{
                background: active ? 'var(--tint-3)' : 'transparent',
                color: active ? 'var(--fg-0)' : 'var(--fg-3)',
                fontWeight: active ? 500 : 400,
              }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--tint-2)' }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
            >
              <span style={{ color: active ? 'oklch(82% 0.18 165)' : 'var(--fg-4)' }}>{item.icon}</span>
              <span className="flex-1 text-left">{item.label}</span>
              {item.count !== undefined && (
                <span
                  className="text-[10px] font-mono px-1.5 py-0.5 rounded-md"
                  style={{ background: 'var(--tint-2)', color: 'var(--fg-3)' }}
                >
                  {item.count}
                </span>
              )}
            </button>
          )
        })}
      </nav>

      {/* Org switcher */}
      <div style={{ height: 1, background: 'var(--line-1)', margin: '4px 0 0 0' }} />
      <OrgSwitcher
        activeOrg={activeOrg}
        setActiveOrg={setActiveOrg}
        orgs={orgs}
        refetchOrgs={refetchOrgs}
      />

      {/* Divider */}
      <div style={{ height: 1, background: 'var(--line-1)' }} />

      {/* User settings */}
      <UserMenu user={user} />
    </aside>
  )
}

// ── UserMenu ──────────────────────────────────────────────────────────────────

function UserMenu({ user }: { user: User | null }) {
  const [open, setOpen] = useState(false)
  const { isDark, toggle } = useTheme()
  const { activeOrg } = useOrg()
  const router = useRouter()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const email = user?.email ?? ''
  const initial = email[0]?.toUpperCase() ?? '?'
  const avatarColor = getAvatarColor(email)

  const handleSignOut = async () => {
    await signOut()
    router.push('/auth')
    router.refresh()
  }

  return (
    <div className="px-2 pb-3 relative" ref={ref}>
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl transition-all"
        style={{ background: open ? 'var(--tint-3)' : 'transparent' }}
        onMouseEnter={e => { if (!open) e.currentTarget.style.background = 'var(--tint-2)' }}
        onMouseLeave={e => { if (!open) e.currentTarget.style.background = 'transparent' }}
      >
        {/* Avatar */}
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
          style={{ background: `${avatarColor.replace(')', ' / 0.2)').replace('oklch(', 'oklch(')}`, color: avatarColor, border: `1px solid ${avatarColor.replace(')', ' / 0.35)').replace('oklch(', 'oklch(')}` }}
        >
          {initial}
        </div>
        <div className="flex-1 min-w-0 text-left">
          <p className="text-xs font-medium truncate" style={{ color: 'var(--fg-1)' }}>{email || 'Account'}</p>
          <p className="text-[10px] font-mono" style={{ color: 'var(--fg-4)' }}>{activeOrg ? activeOrg.role : 'Personal'}</p>
        </div>
        <ChevronDown
          size={12}
          style={{ color: 'var(--fg-4)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.97 }}
            transition={{ duration: 0.12 }}
            className="absolute left-2 right-2 bottom-full mb-2 rounded-xl overflow-hidden z-50"
            style={{
              background: 'var(--bg-1)',
              border: '1px solid var(--line-2)',
              boxShadow: '0 -8px 32px rgba(0,0,0,0.25)',
            }}
          >
            {/* User info header */}
            <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--line-1)' }}>
              <p className="text-xs font-medium truncate" style={{ color: 'var(--fg-1)' }}>{email}</p>
              <p className="text-[10px] font-mono mt-0.5" style={{ color: 'var(--fg-4)' }}>BranchLab{activeOrg ? ` · ${activeOrg.role}` : ''}</p>
            </div>

            {/* Theme toggle */}
            <div className="px-4 py-2.5 flex items-center justify-between">
              <span className="text-xs" style={{ color: 'var(--fg-2)' }}>Appearance</span>
              <button
                onClick={toggle}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all"
                style={{ background: 'var(--tint-2)', border: '1px solid var(--line-2)', color: 'var(--fg-2)' }}
              >
                {isDark ? <Sun size={12} /> : <Moon size={12} />}
                <span className="text-[11px] font-mono">{isDark ? 'Light mode' : 'Dark mode'}</span>
              </button>
            </div>

            <div style={{ height: 1, background: 'var(--line-1)' }} />

            {/* Sign out */}
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors hover:bg-[var(--tint-2)]"
              style={{ color: 'var(--fg-2)' }}
            >
              <LogOut size={13} />
              Sign out
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── OrgSwitcher ───────────────────────────────────────────────────────────────

function OrgSwitcher({
  activeOrg, setActiveOrg, orgs, refetchOrgs,
}: {
  activeOrg: OrgWithRole | null
  setActiveOrg: (org: OrgWithRole | null) => void
  orgs: OrgWithRole[]
  refetchOrgs: () => Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const currentName = activeOrg?.name ?? 'Personal'

  return (
    <div className="px-2 py-1.5 relative" ref={ref}>
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl transition-all"
        style={{ background: open ? 'var(--tint-3)' : 'transparent' }}
        onMouseEnter={e => { if (!open) e.currentTarget.style.background = 'var(--tint-2)' }}
        onMouseLeave={e => { if (!open) e.currentTarget.style.background = 'transparent' }}
      >
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
          style={{
            background: activeOrg ? 'oklch(78% 0.18 285 / 0.15)' : 'var(--tint-2)',
            border: '1px solid var(--line-2)',
          }}
        >
          {activeOrg ? (
            <span className="text-[10px] font-bold" style={{ color: 'oklch(78% 0.18 285)' }}>
              {activeOrg.name.slice(0, 2).toUpperCase()}
            </span>
          ) : (
            <Home size={13} style={{ color: 'var(--fg-3)' }} />
          )}
        </div>
        <div className="flex-1 min-w-0 text-left">
          <p className="text-xs font-medium truncate" style={{ color: 'var(--fg-1)' }}>{currentName}</p>
          <p className="text-[10px] font-mono" style={{ color: 'var(--fg-4)' }}>
            {activeOrg ? `${activeOrg.memberCount} member${activeOrg.memberCount !== 1 ? 's' : ''}` : 'Workspace'}
          </p>
        </div>
        <ChevronDown
          size={12}
          style={{ color: 'var(--fg-4)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.97 }}
            transition={{ duration: 0.12 }}
            className="absolute left-2 right-2 bottom-full mb-1.5 rounded-xl overflow-hidden z-50"
            style={{
              background: 'var(--bg-1)',
              border: '1px solid var(--line-2)',
              boxShadow: '0 -8px 32px rgba(0,0,0,0.25)',
            }}
          >
            {/* Section label */}
            <p className="px-3 pt-2.5 pb-1 text-[10px] font-mono tracking-widest uppercase" style={{ color: 'var(--fg-4)' }}>
              Workspaces
            </p>

            {/* Personal */}
            <button
              onClick={() => { setActiveOrg(null); setOpen(false) }}
              className="w-full flex items-center gap-2.5 px-3 py-2 transition-colors hover:bg-[var(--tint-2)]"
            >
              <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0" style={{ background: 'var(--tint-2)' }}>
                <Home size={11} style={{ color: 'var(--fg-3)' }} />
              </div>
              <span className="flex-1 text-xs text-left" style={{ color: 'var(--fg-1)' }}>Personal</span>
              {!activeOrg && <Check size={12} style={{ color: 'oklch(82% 0.18 165)' }} />}
            </button>

            {/* Org list */}
            {orgs.length > 0 && (
              <>
                <div style={{ height: 1, background: 'var(--line-1)', margin: '2px 0' }} />
                {orgs.map(org => (
                  <div key={org.id} className="flex items-center hover:bg-[var(--tint-2)] transition-colors">
                    {/* Clicking this area switches the workspace */}
                    <button
                      onClick={() => { setActiveOrg(org); setOpen(false) }}
                      className="flex-1 flex items-center gap-2.5 px-3 py-2 min-w-0"
                    >
                      <div
                        className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
                        style={{ background: 'oklch(78% 0.18 285 / 0.15)' }}
                      >
                        <span className="text-[10px] font-bold" style={{ color: 'oklch(78% 0.18 285)' }}>
                          {org.name.slice(0, 2).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <p className="text-xs truncate" style={{ color: 'var(--fg-1)' }}>{org.name}</p>
                        <p className="text-[10px] font-mono" style={{ color: 'var(--fg-4)' }}>
                          {org.role} · {org.memberCount} member{org.memberCount !== 1 ? 's' : ''}
                        </p>
                      </div>
                      {activeOrg?.id === org.id && <Check size={12} style={{ color: 'oklch(82% 0.18 165)' }} />}
                    </button>
                    {/* Settings link — separate from the switch button so no <a> inside <button> */}
                    {(org.role === 'owner' || org.role === 'admin') && (
                      <Link
                        href={`/dashboard/org/${org.id}/settings`}
                        onClick={() => setOpen(false)}
                        className="flex items-center justify-center w-7 h-7 mr-2 rounded transition-colors hover:bg-[var(--tint-3)]"
                        style={{ color: 'var(--fg-4)', flexShrink: 0 }}
                        title="Org settings"
                      >
                        <Settings size={11} />
                      </Link>
                    )}
                  </div>
                ))}
              </>
            )}

            {/* New workspace */}
            <div style={{ height: 1, background: 'var(--line-1)', margin: '2px 0' }} />
            <button
              onClick={() => { setOpen(false); setShowCreateModal(true) }}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 transition-colors hover:bg-[var(--tint-2)]"
            >
              <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0" style={{ background: 'var(--tint-2)' }}>
                <Plus size={11} style={{ color: 'var(--fg-3)' }} />
              </div>
              <span className="text-xs" style={{ color: 'var(--fg-3)' }}>New workspace</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCreateModal && (
          <CreateOrgModal
            onClose={() => setShowCreateModal(false)}
            onCreated={async org => {
              await refetchOrgs()
              setActiveOrg(org)
              setShowCreateModal(false)
            }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// ── CreateOrgModal ────────────────────────────────────────────────────────────

function CreateOrgModal({
  onClose, onCreated,
}: {
  onClose: () => void
  onCreated: (org: OrgWithRole) => void
}) {
  const [name, setName] = useState('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setCreating(true)
    setCreateError(null)
    try {
      const org = await createOrg(name.trim())
      onCreated(org)
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create workspace')
      setCreating(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <motion.div
        initial={{ scale: 0.95, y: 8 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 8 }}
        transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-sm rounded-2xl overflow-hidden"
        style={{
          background: 'var(--bg-1)',
          border: '1px solid var(--line-2)',
          boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
        }}
      >
        <form onSubmit={handleSubmit}>
          <div className="p-6">
            <h3 className="text-base font-semibold mb-1" style={{ color: 'var(--fg-0)' }}>New workspace</h3>
            <p className="text-sm mb-5" style={{ color: 'var(--fg-3)' }}>
              Create a shared workspace to collaborate with your team.
            </p>
            <input
              ref={inputRef}
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Workspace name"
              maxLength={60}
              className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none"
              style={{
                background: 'var(--tint-2)',
                border: '1px solid var(--line-2)',
                color: 'var(--fg-0)',
              }}
            />
            {createError && (
              <p className="text-xs mt-2" style={{ color: 'oklch(70% 0.18 25)' }}>{createError}</p>
            )}
          </div>
          <div
            className="flex items-center justify-end gap-2 px-6 py-4 border-t"
            style={{ borderColor: 'var(--line-1)' }}
          >
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-medium transition-all hover:bg-[var(--tint-3)]"
              style={{ border: '1px solid var(--line-2)', color: 'var(--fg-2)' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim() || creating}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all disabled:opacity-50"
              style={{ background: 'oklch(82% 0.18 165)', color: '#052916' }}
            >
              {creating && <Loader2 size={14} className="animate-spin" />}
              Create workspace
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}

// ── TopBar ────────────────────────────────────────────────────────────────────

const SORT_OPTIONS: { key: SortKey; label: string; icon: React.ReactNode }[] = [
  { key: 'updated', label: 'Last edited', icon: <Clock size={12} /> },
  { key: 'name', label: 'Name A–Z', icon: <Search size={12} /> },
  { key: 'created', label: 'Date created', icon: <Clock size={12} /> },
]

const SECTION_TITLES: Record<Section, string> = {
  home: 'Home',
  drafts: 'Drafts',
  published: 'Published',
  assets: 'Assets',
}

function TopBar({
  search, onSearch, sort, onSort, section,
  onCreateBlank, onCreateFromTemplate, isPending, refreshing,
}: {
  search: string
  onSearch: (v: string) => void
  sort: SortKey
  onSort: (k: SortKey) => void
  section: Section
  onCreateBlank: () => void
  onCreateFromTemplate: () => void
  isPending: boolean
  refreshing?: boolean
}) {
  const [showSort, setShowSort] = useState(false)
  const sortRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) setShowSort(false)
    }
    if (showSort) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showSort])

  const currentSort = SORT_OPTIONS.find(o => o.key === sort)!

  return (
    <div
      className="flex items-center gap-3 px-6 h-[52px] shrink-0 border-b"
      style={{ borderColor: 'var(--line-1)', background: 'var(--bg-glass)', backdropFilter: 'blur(16px)' }}
    >
      {/* Section breadcrumb */}
      <h1 className="text-sm font-semibold shrink-0 flex items-center gap-2" style={{ color: 'var(--fg-0)' }}>
        {SECTION_TITLES[section]}
        {refreshing && <Loader2 size={12} className="animate-spin" style={{ color: 'var(--fg-4)' }} />}
      </h1>
      <div style={{ width: 1, height: 16, background: 'var(--line-2)' }} />

      {/* Search */}
      <div
        className="flex-1 flex items-center gap-2 px-3 py-1.5 rounded-xl max-w-sm"
        style={{ background: 'var(--tint-2)', border: '1px solid var(--line-1)' }}
      >
        <Search size={13} style={{ color: 'var(--fg-4)', flexShrink: 0 }} />
        <input
          type="text"
          value={search}
          onChange={e => onSearch(e.target.value)}
          placeholder="Search scenarios…"
          className="flex-1 bg-transparent text-sm outline-none"
          style={{ color: 'var(--fg-1)' }}
        />
        {search && (
          <button onClick={() => onSearch('')} style={{ color: 'var(--fg-4)' }}>
            <X size={12} />
          </button>
        )}
      </div>

      {/* Sort — only show for scenario sections */}
      {section !== 'assets' && (
        <div className="relative" ref={sortRef}>
          <button
            onClick={() => setShowSort(v => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono transition-all"
            style={{
              background: showSort ? 'var(--tint-3)' : 'var(--tint-2)',
              border: '1px solid var(--line-1)',
              color: 'var(--fg-2)',
            }}
          >
            {currentSort.icon}
            {currentSort.label}
            <ChevronDown size={11} style={{ transform: showSort ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
          </button>

          <AnimatePresence>
            {showSort && (
              <motion.div
                initial={{ opacity: 0, y: -4, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.97 }}
                transition={{ duration: 0.12 }}
                className="absolute right-0 top-full mt-1.5 rounded-xl overflow-hidden z-50"
                style={{
                  background: 'var(--bg-1)',
                  border: '1px solid var(--line-2)',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                  minWidth: 160,
                }}
              >
                {SORT_OPTIONS.map(opt => (
                  <button
                    key={opt.key}
                    onClick={() => { onSort(opt.key); setShowSort(false) }}
                    className="w-full flex items-center justify-between gap-3 px-4 py-2.5 text-xs transition-colors hover:bg-[var(--tint-2)]"
                    style={{ color: sort === opt.key ? 'var(--fg-0)' : 'var(--fg-2)' }}
                  >
                    <span className="flex items-center gap-2">
                      <span style={{ color: 'var(--fg-4)' }}>{opt.icon}</span>
                      {opt.label}
                    </span>
                    {sort === opt.key && <Check size={11} style={{ color: 'oklch(82% 0.18 165)' }} />}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}

// ── HomeView ──────────────────────────────────────────────────────────────────

function HomeView({
  scenarios, drafts, published, search,
  onDuplicate, onDelete, onCreateBlank, onCreateFromTemplate,
}: {
  scenarios: Scenario[]
  drafts: Scenario[]
  published: Scenario[]
  search: string
  onDuplicate: (s: Scenario) => void
  onDelete: (s: Scenario) => void
  onCreateBlank: () => void
  onCreateFromTemplate: () => void
}) {
  if (scenarios.length === 0) {
    return <EmptyHome onCreate={onCreateBlank} onCreateFromTemplate={onCreateFromTemplate} />
  }

  const recents = [...scenarios]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 4)

  const showSearch = search.length > 0
  const allFiltered = [...drafts, ...published]

  if (showSearch && allFiltered.length === 0) {
    return (
      <div className="px-8 py-16 text-center">
        <p className="text-sm" style={{ color: 'var(--fg-3)' }}>No scenarios match &ldquo;{search}&rdquo;</p>
      </div>
    )
  }

  return (
    <div className="px-8 py-6 space-y-10">
      {showSearch ? (
        <ContentSection title={`Results for "${search}"`} count={allFiltered.length}>
          <ScenarioGrid scenarios={allFiltered} onDuplicate={onDuplicate} onDelete={onDelete} />
        </ContentSection>
      ) : (
        <>
          {/* Recents */}
          <ContentSection title="Recently edited" count={recents.length}>
            <ScenarioGrid scenarios={recents} onDuplicate={onDuplicate} onDelete={onDelete} />
          </ContentSection>

          {/* Published */}
          {published.length > 0 && (
            <ContentSection title="Published" count={published.length} accent="oklch(82% 0.18 165)">
              <ScenarioGrid scenarios={published} onDuplicate={onDuplicate} onDelete={onDelete} />
            </ContentSection>
          )}

          {/* Drafts */}
          {drafts.length > 0 && (
            <ContentSection title="Drafts" count={drafts.length}>
              <ScenarioGrid scenarios={drafts} onDuplicate={onDuplicate} onDelete={onDelete} />
            </ContentSection>
          )}
        </>
      )}
    </div>
  )
}

// ── SectionView ───────────────────────────────────────────────────────────────

function SectionView({
  title, scenarios, search,
  onDuplicate, onDelete, onCreateBlank, onCreateFromTemplate,
}: {
  title: string
  scenarios: Scenario[]
  search: string
  onDuplicate: (s: Scenario) => void
  onDelete: (s: Scenario) => void
  onCreateBlank?: () => void
  onCreateFromTemplate?: () => void
}) {
  return (
    <div className="px-8 py-6">
      {scenarios.length === 0 ? (
        <div className="py-20 text-center">
          <p className="text-sm" style={{ color: 'var(--fg-3)' }}>
            {search ? `No ${title.toLowerCase()} match "${search}"` : `No ${title.toLowerCase()} yet`}
          </p>
          {!search && onCreateFromTemplate && (
            <button
              onClick={onCreateFromTemplate}
              className="mt-4 text-xs underline underline-offset-2 transition-colors"
              style={{ color: 'var(--fg-3)' }}
            >
              Create your first scenario →
            </button>
          )}
        </div>
      ) : (
        <ContentSection title={title} count={scenarios.length}>
          <ScenarioGrid scenarios={scenarios} onDuplicate={onDuplicate} onDelete={onDelete} />
        </ContentSection>
      )}
    </div>
  )
}

// ── ContentSection ────────────────────────────────────────────────────────────

function ContentSection({
  title, count, accent, children,
}: {
  title: string
  count: number
  accent?: string
  children: React.ReactNode
}) {
  return (
    <section>
      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-xs font-mono tracking-[0.12em] uppercase" style={{ color: accent ?? 'var(--fg-3)' }}>
          {title}
        </h2>
        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ background: 'var(--tint-2)', color: 'var(--fg-4)' }}>
          {count}
        </span>
        <div className="flex-1 h-px" style={{ background: 'var(--line-1)' }} />
      </div>
      {children}
    </section>
  )
}

// ── ScenarioGrid ──────────────────────────────────────────────────────────────

function ScenarioGrid({
  scenarios, onDuplicate, onDelete,
}: {
  scenarios: Scenario[]
  onDuplicate: (s: Scenario) => void
  onDelete: (s: Scenario) => void
}) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {scenarios.map((s, i) => (
        <DashboardCard
          key={s.id}
          scenario={s}
          index={i}
          onDuplicate={() => onDuplicate(s)}
          onDelete={() => onDelete(s)}
        />
      ))}
    </div>
  )
}

// ── DashboardCard ─────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  published: { dot: 'oklch(82% 0.18 165)', label: 'Published', text: 'oklch(82% 0.18 165)', bg: 'oklch(82% 0.18 165 / 0.10)', border: 'oklch(82% 0.18 165 / 0.3)' },
  draft:     { dot: 'var(--fg-3)', label: 'Draft', text: 'var(--fg-3)', bg: 'var(--tint-2)', border: 'var(--line-2)' },
  archived:  { dot: 'var(--fg-4)', label: 'Archived', text: 'var(--fg-4)', bg: 'var(--tint-1)', border: 'var(--line-1)' },
}

function DashboardCard({
  scenario, index, onDuplicate, onDelete,
}: {
  scenario: Scenario
  index: number
  onDuplicate: () => void
  onDelete: () => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const cfg = STATUS_CONFIG[scenario.status] ?? STATUS_CONFIG.draft
  const pub = scenario.publishedVersion
  const hasDraftChanges = pub && new Date(scenario.updatedAt) > new Date(pub.publishedAt)
  const updatedDate = new Date(scenario.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const nodeCount = scenario.nodes.length

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    if (menuOpen) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpen])

  const menuItems = [
    { icon: <FileEdit size={12} />, label: 'Open editor', href: `/editor/${scenario.id}` },
    { icon: <Eye size={12} />, label: 'Preview', href: `/preview/${scenario.id}?device=mobile` },
    ...(pub ? [{ icon: <Play size={12} />, label: 'View published', href: `/play/${pub.slug}` }] : []),
    ...(pub ? [{ icon: <BarChart3 size={12} />, label: 'Analytics', href: `/dashboard/scenario/${scenario.id}/analytics` }] : []),
    null, // divider
    { icon: <Copy size={12} />, label: 'Duplicate', action: onDuplicate },
    { icon: <Download size={12} />, label: 'Export .blab', action: () => exportToBlab(scenario) },
    { icon: <Download size={12} />, label: 'Export ZIP', action: () => exportToZip(scenario) },
    null, // divider
    { icon: <Trash2 size={12} />, label: 'Delete', action: onDelete, danger: true },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="group rounded-2xl overflow-hidden flex flex-col"
      style={{ background: 'var(--bg-1)', border: '1px solid var(--line-1)' }}
    >
      {/* Thumbnail */}
      <Link href={`/editor/${scenario.id}`} className="relative block" style={{ aspectRatio: '16/10' }}>
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{
            background: 'repeating-linear-gradient(135deg, var(--tint-1) 0 6px, transparent 6px 12px), var(--bg-2)',
          }}
        >
          <svg width="40" height="40" viewBox="0 0 44 44" fill="none" className="opacity-10">
            <circle cx="10" cy="22" r="5" fill="currentColor" />
            <circle cx="34" cy="10" r="4" fill="currentColor" />
            <circle cx="34" cy="34" r="4" fill="currentColor" />
            <path d="M14 22 L30 12 M14 22 L30 32" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </div>

        {/* Status badge */}
        <div
          className="absolute top-2.5 left-2.5 flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono"
          style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.text }}
        >
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: cfg.dot }} />
          {cfg.label}
        </div>

        {hasDraftChanges && (
          <div
            className="absolute bottom-2.5 left-2.5 px-2 py-0.5 rounded-full text-[9px] font-mono"
            style={{ background: 'rgba(0,0,0,0.6)', color: 'var(--fg-2)' }}
          >
            draft changes
          </div>
        )}

        {/* Published play link */}
        {pub && (
          <Link
            href={`/play/${pub.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            className="absolute bottom-2.5 right-2.5 flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-mono opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ background: 'oklch(82% 0.18 165 / 0.15)', border: '1px solid oklch(82% 0.18 165 / 0.3)', color: 'oklch(82% 0.18 165)' }}
          >
            <ExternalLink size={10} />
            Live
          </Link>
        )}

        {/* Context menu trigger */}
        <div
          ref={menuRef}
          className="absolute top-2 right-2"
          onClick={e => e.preventDefault()}
        >
          <button
            onClick={e => { e.preventDefault(); e.stopPropagation(); setMenuOpen(v => !v) }}
            className="w-6 h-6 flex items-center justify-center rounded-lg opacity-0 group-hover:opacity-100 transition-all"
            style={{ background: 'rgba(0,0,0,0.55)', color: 'var(--fg-1)' }}
            title="More options"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
              <circle cx="6" cy="2" r="1.2" />
              <circle cx="6" cy="6" r="1.2" />
              <circle cx="6" cy="10" r="1.2" />
            </svg>
          </button>

          <AnimatePresence>
            {menuOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.93, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.93, y: -4 }}
                transition={{ duration: 0.1 }}
                className="absolute right-0 top-full mt-1 rounded-xl overflow-hidden z-50"
                style={{
                  background: 'var(--bg-1)',
                  border: '1px solid var(--line-2)',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                  minWidth: 160,
                }}
              >
                {menuItems.map((item, idx) =>
                  item === null ? (
                    <div key={idx} style={{ height: 1, background: 'var(--line-1)' }} />
                  ) : 'href' in item ? (
                    <Link
                      key={item.label}
                      href={item.href!}
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2.5 px-3.5 py-2.5 text-xs transition-colors hover:bg-[var(--tint-2)]"
                      style={{ color: 'var(--fg-1)' }}
                    >
                      <span style={{ color: 'var(--fg-3)' }}>{item.icon}</span>
                      {item.label}
                    </Link>
                  ) : (
                    <button
                      key={item.label}
                      onClick={() => { setMenuOpen(false); item.action?.() }}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs text-left transition-colors hover:bg-[var(--tint-2)]"
                      style={{ color: item.danger ? 'oklch(70% 0.18 25)' : 'var(--fg-1)' }}
                    >
                      <span style={{ color: item.danger ? 'oklch(70% 0.18 25)' : 'var(--fg-3)' }}>{item.icon}</span>
                      {item.label}
                    </button>
                  )
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Link>

      {/* Card body */}
      <Link href={`/editor/${scenario.id}`} className="flex flex-col gap-2 p-3.5 flex-1">
        <p className="text-sm font-medium leading-snug" style={{ color: 'var(--fg-0)' }}>
          {scenario.title}
        </p>
        <div className="flex items-center gap-3 text-[10px] font-mono" style={{ color: 'var(--fg-4)' }}>
          <span className="flex items-center gap-1">
            <GitBranch size={9} />
            {nodeCount} nodes
          </span>
          <span className="flex items-center gap-1 ml-auto">
            <Clock size={9} />
            {updatedDate}
          </span>
        </div>
      </Link>
    </motion.div>
  )
}

// ── AssetsView ────────────────────────────────────────────────────────────────

const STORAGE_WARN_BYTES  = 5  * 1024 * 1024 * 1024 // 5 GB  — yellow
const STORAGE_LIMIT_BYTES = 10 * 1024 * 1024 * 1024 // 10 GB — display ceiling

type ClipSort = 'date' | 'name' | 'duration' | 'size'
type DurationBucket = 'all' | 'short' | 'medium' | 'long'

function AssetsView({
  clips, uploadState, onUpload, onClipDelete,
}: {
  clips: Clip[]
  uploadState: { fileName: string; status: ClipUploadStatus; progress: number; error?: string } | null
  onUpload: (file: File) => void
  onClipDelete: (clip: Clip) => void
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [search, setSearch]           = useState('')
  const [sort, setSort]               = useState<ClipSort>('date')
  const [durFilter, setDurFilter]     = useState<DurationBucket>('all')
  const [sizeWarn, setSizeWarn]       = useState<{ file: File } | null>(null)

  const totalBytes = clips.reduce((s, c) => s + c.size, 0)
  const storagePercent = Math.min(100, (totalBytes / STORAGE_LIMIT_BYTES) * 100)
  const storageColor = totalBytes >= STORAGE_WARN_BYTES
    ? 'oklch(80% 0.16 60)'
    : 'oklch(82% 0.18 165)'

  const isUploading = uploadState !== null && (uploadState.status === 'compressing' || uploadState.status === 'uploading' || uploadState.status === 'processing')

  const visibleClips = useMemo(() => {
    let list = [...clips]
    if (search.trim()) list = list.filter(c => c.name.toLowerCase().includes(search.toLowerCase()))
    if (durFilter === 'short')  list = list.filter(c => c.duration < 60)
    if (durFilter === 'medium') list = list.filter(c => c.duration >= 60 && c.duration < 300)
    if (durFilter === 'long')   list = list.filter(c => c.duration >= 300)
    list.sort((a, b) => {
      if (sort === 'name')     return a.name.localeCompare(b.name)
      if (sort === 'duration') return a.duration - b.duration
      if (sort === 'size')     return b.size - a.size
      return b.createdAt.localeCompare(a.createdAt)
    })
    return list
  }, [clips, search, sort, durFilter])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    if (file.size > LARGE_FILE_WARNING_BYTES) {
      setSizeWarn({ file })
    } else {
      onUpload(file)
    }
  }

  return (
    <div className="px-8 py-6 space-y-5">
      <input ref={fileInputRef} type="file" accept={ACCEPTED_EXTENSIONS} className="hidden" onChange={handleFileChange} />

      {/* Header row */}
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <h2 className="text-sm font-semibold" style={{ color: 'var(--fg-0)' }}>Asset Library</h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--fg-3)' }}>
            {clips.length} clip{clips.length !== 1 ? 's' : ''} · {formatFileSize(totalBytes)} used
          </p>
        </div>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium transition-all disabled:opacity-50"
          style={{ background: 'oklch(82% 0.18 165)', color: '#052916', boxShadow: isUploading ? 'none' : '0 0 16px oklch(82% 0.18 165 / 0.3)' }}
        >
          <Upload size={12} />
          Upload clip
        </button>
      </div>

      {/* Storage meter */}
      {clips.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex justify-between text-[10px] font-mono" style={{ color: 'var(--fg-3)' }}>
            <span>Storage used</span>
            <span style={{ color: totalBytes >= STORAGE_WARN_BYTES ? storageColor : 'var(--fg-3)' }}>
              {formatFileSize(totalBytes)} / {formatFileSize(STORAGE_LIMIT_BYTES)}
            </span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--tint-3)' }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${storagePercent}%`, background: storageColor }}
            />
          </div>
          {totalBytes >= STORAGE_WARN_BYTES && (
            <p className="text-[10px] font-mono" style={{ color: storageColor }}>
              Storage is getting full — consider removing unused clips.
            </p>
          )}
        </div>
      )}

      {/* Large-file confirmation */}
      <AnimatePresence>
        {sizeWarn && (
          <motion.div
            initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
            className="rounded-xl px-4 py-3.5 space-y-3"
            style={{ background: 'oklch(80% 0.16 60 / 0.07)', border: '1px solid oklch(80% 0.16 60 / 0.3)' }}
          >
            <div className="flex items-start gap-2.5">
              <span className="text-base leading-none" style={{ color: 'oklch(80% 0.16 60)' }}>⚠</span>
              <div>
                <p className="text-xs font-medium" style={{ color: 'oklch(80% 0.16 60)' }}>
                  Large file — {formatFileSize(sizeWarn.file.size)}
                </p>
                <p className="text-[11px] mt-0.5 leading-relaxed" style={{ color: 'var(--fg-2)' }}>
                  <span className="font-mono">{sizeWarn.file.name}</span> is larger than 150 MB and may take a few minutes to upload depending on your connection.
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => { onUpload(sizeWarn.file); setSizeWarn(null) }}
                className="px-3 py-1.5 rounded-lg text-[11px] font-mono transition-all hover:brightness-110"
                style={{ background: 'oklch(80% 0.16 60)', color: '#1a0f00' }}
              >
                Upload anyway
              </button>
              <button
                onClick={() => setSizeWarn(null)}
                className="px-3 py-1.5 rounded-lg text-[11px] font-mono transition-colors hover:bg-[var(--tint-3)]"
                style={{ border: '1px solid var(--line-2)', color: 'var(--fg-2)' }}
              >
                Cancel
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Upload status */}
      <AnimatePresence>
        {uploadState && (
          <motion.div
            key="upload-status"
            initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
            className="rounded-xl px-4 py-3 space-y-2"
            style={{ background: 'var(--tint-2)', border: '1px solid var(--line-2)' }}
          >
            <div className="flex items-center justify-between gap-4">
              <span className="text-[11px] font-mono truncate" style={{ color: 'var(--fg-1)' }}>
                {uploadState.fileName.length > 40 ? uploadState.fileName.slice(0, 37) + '…' : uploadState.fileName}
              </span>
              <UploadStatusBadge status={uploadState.status} progress={uploadState.progress} />
            </div>

            {uploadState.status === 'compressing' && (
              <div className="h-1 rounded-full overflow-hidden" style={{ background: 'var(--tint-4)' }}>
                <div className="h-full rounded-full transition-all duration-100" style={{ width: `${uploadState.progress}%`, background: 'oklch(80% 0.16 60)' }} />
              </div>
            )}
            {uploadState.status === 'uploading' && (
              <div className="h-1 rounded-full overflow-hidden" style={{ background: 'var(--tint-4)' }}>
                <div className="h-full rounded-full transition-all duration-100" style={{ width: `${uploadState.progress}%`, background: 'oklch(82% 0.18 165)' }} />
              </div>
            )}
            {uploadState.status === 'processing' && (
              <div className="h-1 rounded-full overflow-hidden" style={{ background: 'var(--tint-4)' }}>
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: 'oklch(78% 0.18 285)' }}
                  animate={{ width: ['20%', '80%', '20%'] }}
                  transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
                />
              </div>
            )}
            {uploadState.error && (
              <p className="text-[10px] font-mono" style={{ color: 'oklch(70% 0.18 25)' }}>{uploadState.error}</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty state */}
      {clips.length === 0 && !uploadState ? (
        <div
          className="flex flex-col items-center justify-center py-20 rounded-2xl border border-dashed text-center cursor-pointer transition-colors hover:border-[var(--line-3)]"
          style={{ borderColor: 'var(--line-2)' }}
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'var(--tint-2)' }}>
            <Upload size={22} style={{ color: 'var(--fg-4)' }} />
          </div>
          <p className="text-sm font-medium" style={{ color: 'var(--fg-1)' }}>Upload your first clip</p>
          <p className="text-xs mt-1.5 max-w-xs leading-relaxed" style={{ color: 'var(--fg-3)' }}>MP4, WebM, or MOV · max 5 GB (Pro plan)</p>
          <p className="text-[11px] font-mono mt-3 px-3 py-1.5 rounded-lg" style={{ color: 'var(--fg-3)', background: 'var(--tint-2)' }}>Click to browse</p>
        </div>
      ) : clips.length > 0 && (
        <>
          {/* Search + filter bar */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--fg-4)' }} />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search clips…"
                className="w-full pl-7 pr-3 py-1.5 rounded-lg text-xs outline-none"
                style={{ background: 'var(--tint-1)', border: '1px solid var(--line-2)', color: 'var(--fg-1)' }}
              />
            </div>

            <select
              value={sort}
              onChange={e => setSort(e.target.value as ClipSort)}
              className="py-1.5 pl-2 pr-6 rounded-lg text-xs appearance-none outline-none"
              style={{ background: 'var(--tint-1)', border: '1px solid var(--line-2)', color: 'var(--fg-2)' }}
            >
              <option value="date">Newest</option>
              <option value="name">Name</option>
              <option value="duration">Duration</option>
              <option value="size">Size</option>
            </select>

            <select
              value={durFilter}
              onChange={e => setDurFilter(e.target.value as DurationBucket)}
              className="py-1.5 pl-2 pr-6 rounded-lg text-xs appearance-none outline-none"
              style={{ background: 'var(--tint-1)', border: '1px solid var(--line-2)', color: 'var(--fg-2)' }}
            >
              <option value="all">All durations</option>
              <option value="short">&lt; 1 min</option>
              <option value="medium">1–5 min</option>
              <option value="long">&gt; 5 min</option>
            </select>
          </div>

          {/* Clip table */}
          {visibleClips.length === 0 ? (
            <p className="py-8 text-center text-xs font-mono" style={{ color: 'var(--fg-4)' }}>No clips match your filters.</p>
          ) : (
            <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--line-1)' }}>
              <div
                className="grid gap-3 px-5 py-2.5 text-[10px] font-mono tracking-widest uppercase border-b"
                style={{ gridTemplateColumns: '48px 1fr 72px 72px 90px 40px', borderColor: 'var(--line-1)', color: 'var(--fg-4)', background: 'var(--tint-1)' }}
              >
                <span />
                <span>Name</span>
                <span>Duration</span>
                <span>Size</span>
                <span>Uploaded</span>
                <span />
              </div>
              {visibleClips.map((clip, i) => (
                <ClipRow
                  key={clip.id}
                  clip={clip}
                  isLast={i === visibleClips.length - 1}
                  onDelete={() => onClipDelete(clip)}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function UploadStatusBadge({ status, progress }: { status: ClipUploadStatus; progress: number }) {
  const cfg: Record<ClipUploadStatus, { label: string; color: string }> = {
    compressing: { label: `${progress}%`,            color: 'oklch(80% 0.16 60)' },
    uploading:   { label: `${progress}%`,            color: 'var(--fg-3)' },
    processing:  { label: 'Generating thumbnail…',   color: 'oklch(78% 0.18 285)' },
    ready:       { label: 'Ready',                   color: 'oklch(82% 0.18 165)' },
    failed:      { label: 'Failed',                  color: 'oklch(70% 0.18 25)' },
  }
  const { label, color } = cfg[status]
  return <span className="text-[10px] font-mono shrink-0" style={{ color }}>{label}</span>
}

function ClipRow({ clip, isLast, onDelete }: { clip: Clip; isLast: boolean; onDelete: () => void }) {
  const [hovered, setHovered] = useState(false)
  const uploadedDate = new Date(clip.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  return (
    <div
      className="grid gap-3 px-5 py-2.5 items-center transition-colors"
      style={{
        gridTemplateColumns: '48px 1fr 72px 72px 90px 40px',
        borderBottom: isLast ? 'none' : '1px solid var(--line-1)',
        background: hovered ? 'var(--tint-1)' : 'transparent',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Thumbnail */}
      <div className="w-11 h-8 rounded-md overflow-hidden shrink-0" style={{ background: 'var(--tint-3)' }}>
        {clip.thumbnailUrl ? (
          <img src={clip.thumbnailUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <video
            src={clip.url}
            className="w-full h-full object-cover"
            muted playsInline preload="metadata"
            onLoadedMetadata={e => { (e.target as HTMLVideoElement).currentTime = 1 }}
          />
        )}
      </div>

      {/* Name */}
      <span className="text-xs truncate" style={{ color: 'var(--fg-1)' }} title={clip.name}>{clip.name}</span>

      <span className="text-xs font-mono" style={{ color: 'var(--fg-3)' }}>{formatDuration(clip.duration)}</span>
      <span className="text-xs font-mono" style={{ color: 'var(--fg-3)' }}>{formatFileSize(clip.size)}</span>
      <span className="text-xs font-mono" style={{ color: 'var(--fg-3)' }}>{uploadedDate}</span>

      <button
        onClick={onDelete}
        className="flex items-center justify-center w-7 h-7 rounded-lg transition-all"
        style={{ opacity: hovered ? 1 : 0, color: 'oklch(70% 0.18 25)', background: 'oklch(70% 0.18 25 / 0.1)' }}
        title="Delete clip"
      >
        <Trash2 size={12} />
      </button>
    </div>
  )
}

// ── EmptyHome ─────────────────────────────────────────────────────────────────

function EmptyHome({ onCreate, onCreateFromTemplate }: { onCreate: () => void; onCreateFromTemplate: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full py-24 px-8 text-center">
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6"
        style={{ background: 'var(--tint-2)', border: '1px solid var(--line-1)' }}
      >
        <GitBranch size={26} style={{ color: 'var(--fg-4)' }} />
      </div>
      <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--fg-0)' }}>No scenarios yet</h2>
      <p className="text-sm max-w-sm leading-relaxed mb-8" style={{ color: 'var(--fg-3)' }}>
        Create your first branching video scenario — a flow of scenes, choices, and outcomes.
      </p>
      <div className="flex items-center gap-3">
        <button
          onClick={onCreateFromTemplate}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all"
          style={{
            background: 'oklch(82% 0.18 165)',
            color: '#052916',
            boxShadow: '0 0 20px oklch(82% 0.18 165 / 0.3)',
          }}
        >
          <GitBranch size={14} />
          Start from template
        </button>
        <button
          onClick={onCreate}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all hover:bg-[var(--tint-3)]"
          style={{ border: '1px solid var(--line-2)', color: 'var(--fg-1)' }}
        >
          <Plus size={14} />
          Blank scenario
        </button>
      </div>
    </div>
  )
}

// ── ConfirmDeleteModal ────────────────────────────────────────────────────────

function ConfirmDeleteModal({
  name, onConfirm, onCancel,
}: {
  name: string
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}
      onClick={e => { if (e.target === e.currentTarget) onCancel() }}
    >
      <motion.div
        initial={{ scale: 0.95, y: 8 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 8 }}
        transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-sm rounded-2xl overflow-hidden"
        style={{
          background: 'var(--bg-1)',
          border: '1px solid var(--line-2)',
          boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
        }}
      >
        <div className="p-6">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
            style={{ background: 'oklch(70% 0.18 25 / 0.1)' }}
          >
            <Trash2 size={18} style={{ color: 'oklch(70% 0.18 25)' }} />
          </div>
          <h3 className="text-base font-semibold mb-1" style={{ color: 'var(--fg-0)' }}>
            Delete scenario?
          </h3>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--fg-3)' }}>
            <span className="font-medium" style={{ color: 'var(--fg-1)' }}>&ldquo;{name}&rdquo;</span>
            {' '}will be permanently deleted. This cannot be undone.
          </p>
        </div>
        <div
          className="flex items-center justify-end gap-2 px-6 py-4 border-t"
          style={{ borderColor: 'var(--line-1)' }}
        >
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-xl text-sm font-medium transition-all hover:bg-[var(--tint-3)]"
            style={{ border: '1px solid var(--line-2)', color: 'var(--fg-2)' }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded-xl text-sm font-medium transition-all"
            style={{
              background: 'oklch(70% 0.18 25)',
              color: '#fff',
              boxShadow: '0 0 16px oklch(70% 0.18 25 / 0.3)',
            }}
          >
            Delete
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getAvatarColor(email: string): string {
  const colors = [
    'oklch(82% 0.18 165)',
    'oklch(78% 0.18 285)',
    'oklch(80% 0.16 60)',
    'oklch(72% 0.18 220)',
    'oklch(75% 0.16 340)',
  ]
  let hash = 0
  for (let i = 0; i < email.length; i++) hash = email.charCodeAt(i) + ((hash << 5) - hash)
  return colors[Math.abs(hash) % colors.length]
}
