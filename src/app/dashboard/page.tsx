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
  ChevronDown, Check, SortAsc, Upload,
  Eye,
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
import { fetchClips, uploadClip, deleteClip, ACCEPTED_EXTENSIONS, type UploadProgress } from '@/lib/supabase/clips'
import { useTheme } from '@/lib/theme'
import type { Scenario, Clip } from '@/types'
import type { User } from '@supabase/supabase-js'

type Section = 'home' | 'drafts' | 'published' | 'assets'
type SortKey = 'updated' | 'name' | 'created'

// ─────────────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [scenarios, setScenarios] = useState<Scenario[]>([])
  const [clips, setClips] = useState<Clip[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const [section, setSection] = useState<Section>('home')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<SortKey>('updated')
  const [deleteTarget, setDeleteTarget] = useState<Scenario | null>(null)
  const [clipUploadProgress, setClipUploadProgress] = useState<UploadProgress | null>(null)
  const [clipUploadError, setClipUploadError] = useState<string | null>(null)

  // Auth guard + initial load
  useEffect(() => {
    const sb = getSupabaseClient()
    sb.auth.getUser().then(res => {
      const u = res.data?.user
      if (!u) { router.replace('/auth'); return }
      setUser(u)
      load()
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Lazy-load clips when assets tab opens
  useEffect(() => {
    if (section === 'assets' && clips.length === 0) {
      fetchClips().then(setClips).catch(() => {})
    }
  }, [section, clips.length])

  const load = () => {
    setError(null)
    getAllScenarios()
      .then(s => { setScenarios(s); setLoading(false) })
      .catch(e => { setError(e.message ?? 'Failed to load'); setLoading(false) })
  }

  const handleCreate = () => {
    startTransition(async () => {
      const s = createScenario()
      await saveScenario(s)
      router.push(`/editor/${s.id}`)
    })
  }

  const handleCreateFromTemplate = () => {
    startTransition(async () => {
      const s = createFromTemplate()
      await saveScenario(s)
      router.push(`/editor/${s.id}`)
    })
  }

  const handleDuplicate = useCallback(async (source: Scenario) => {
    const copy = duplicateScenario(source)
    await saveScenario(copy)
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const confirmDelete = useCallback((s: Scenario) => setDeleteTarget(s), [])

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return
    await deleteScenario(deleteTarget.id)
    setDeleteTarget(null)
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deleteTarget])

  const handleClipUpload = useCallback(async (file: File) => {
    setClipUploadError(null)
    setClipUploadProgress({ loaded: 0, total: file.size })
    try {
      const clip = await uploadClip(file, p => setClipUploadProgress(p))
      setClips(prev => [clip, ...prev])
    } catch (e) {
      setClipUploadError(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setClipUploadProgress(null)
    }
  }, [])

  const handleClipDelete = useCallback(async (clip: import('@/types').Clip) => {
    try {
      await deleteClip(clip.id, clip.storagePath)
      setClips(prev => prev.filter(c => c.id !== clip.id))
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Delete failed')
    }
  }, [])

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
                    uploadProgress={clipUploadProgress}
                    uploadError={clipUploadError}
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
}

function Sidebar({
  section, onSectionChange,
  draftCount, publishedCount, assetCount,
  user, onCreateBlank, onCreateFromTemplate, isPending,
}: SidebarProps) {
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

      {/* Divider */}
      <div style={{ height: 1, background: 'var(--line-1)', margin: '8px 0' }} />

      {/* User settings */}
      <UserMenu user={user} />
    </aside>
  )
}

// ── UserMenu ──────────────────────────────────────────────────────────────────

function UserMenu({ user }: { user: User | null }) {
  const [open, setOpen] = useState(false)
  const { isDark, toggle } = useTheme()
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
          <p className="text-[10px] font-mono" style={{ color: 'var(--fg-4)' }}>Free plan</p>
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
              <p className="text-[10px] font-mono mt-0.5" style={{ color: 'var(--fg-4)' }}>BranchLab · Free plan</p>
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

// ── TopBar ────────────────────────────────────────────────────────────────────

const SORT_OPTIONS: { key: SortKey; label: string; icon: React.ReactNode }[] = [
  { key: 'updated', label: 'Last edited', icon: <Clock size={12} /> },
  { key: 'name', label: 'Name A–Z', icon: <SortAsc size={12} /> },
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
  onCreateBlank, onCreateFromTemplate, isPending,
}: {
  search: string
  onSearch: (v: string) => void
  sort: SortKey
  onSort: (k: SortKey) => void
  section: Section
  onCreateBlank: () => void
  onCreateFromTemplate: () => void
  isPending: boolean
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
      <h1 className="text-sm font-semibold shrink-0" style={{ color: 'var(--fg-0)' }}>
        {SECTION_TITLES[section]}
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
    null, // divider
    { icon: <Copy size={12} />, label: 'Duplicate', action: onDuplicate },
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

function AssetsView({
  clips, uploadProgress, uploadError, onUpload, onClipDelete,
}: {
  clips: Clip[]
  uploadProgress: UploadProgress | null
  uploadError: string | null
  onUpload: (file: File) => void
  onClipDelete: (clip: Clip) => void
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const isUploading = uploadProgress !== null
  const uploadPct = uploadProgress
    ? Math.round((uploadProgress.loaded / uploadProgress.total) * 100)
    : 0

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  }

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      onUpload(file)
      e.target.value = ''
    }
  }

  return (
    <div className="px-8 py-6">
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_EXTENSIONS}
        className="hidden"
        onChange={handleFileChange}
      />

      <div className="flex items-center gap-3 mb-6">
        <div className="flex-1">
          <h2 className="text-sm font-semibold" style={{ color: 'var(--fg-0)' }}>Asset Library</h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--fg-3)' }}>
            {clips.length} clip{clips.length !== 1 ? 's' : ''} · MP4, WebM, or MOV up to 500 MB
          </p>
        </div>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium transition-all disabled:opacity-50"
          style={{
            background: 'oklch(82% 0.18 165)',
            color: '#052916',
            boxShadow: isUploading ? 'none' : '0 0 16px oklch(82% 0.18 165 / 0.3)',
          }}
        >
          <Upload size={12} />
          Upload clip
        </button>
      </div>

      {/* Upload progress */}
      <AnimatePresence>
        {isUploading && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="mb-4 rounded-xl p-3.5"
            style={{ background: 'var(--tint-2)', border: '1px solid var(--line-2)' }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono" style={{ color: 'var(--fg-2)' }}>Uploading…</span>
              <span className="text-xs font-mono" style={{ color: 'var(--fg-3)' }}>{uploadPct}%</span>
            </div>
            <div className="h-1 rounded-full overflow-hidden" style={{ background: 'var(--tint-3)' }}>
              <motion.div
                className="h-full rounded-full"
                style={{ background: 'oklch(82% 0.18 165)', width: `${uploadPct}%` }}
                transition={{ duration: 0.1 }}
              />
            </div>
          </motion.div>
        )}
        {uploadError && !isUploading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mb-4 px-4 py-3 rounded-xl text-xs font-mono"
            style={{ background: 'oklch(70% 0.18 25 / 0.08)', border: '1px solid oklch(70% 0.18 25 / 0.25)', color: 'oklch(70% 0.18 25)' }}
          >
            {uploadError}
          </motion.div>
        )}
      </AnimatePresence>

      {clips.length === 0 && !isUploading ? (
        <div
          className="flex flex-col items-center justify-center py-20 rounded-2xl border border-dashed text-center cursor-pointer transition-colors hover:border-[var(--line-3)]"
          style={{ borderColor: 'var(--line-2)' }}
          onClick={() => fileInputRef.current?.click()}
        >
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: 'var(--tint-2)' }}
          >
            <Upload size={22} style={{ color: 'var(--fg-4)' }} />
          </div>
          <p className="text-sm font-medium" style={{ color: 'var(--fg-1)' }}>Drop a video clip here</p>
          <p className="text-xs mt-1.5 max-w-xs leading-relaxed" style={{ color: 'var(--fg-3)' }}>
            MP4, WebM, or MOV · max 500 MB
          </p>
          <p className="text-[11px] font-mono mt-3 px-3 py-1.5 rounded-lg" style={{ color: 'var(--fg-3)', background: 'var(--tint-2)' }}>
            Click to browse
          </p>
        </div>
      ) : (
        <div
          className="rounded-2xl overflow-hidden"
          style={{ border: '1px solid var(--line-1)' }}
        >
          <div
            className="grid gap-4 px-5 py-2.5 text-[10px] font-mono tracking-widest uppercase border-b"
            style={{ gridTemplateColumns: '1fr 80px 80px 100px 40px', borderColor: 'var(--line-1)', color: 'var(--fg-4)', background: 'var(--tint-1)' }}
          >
            <span>Name</span>
            <span>Duration</span>
            <span>Size</span>
            <span>Uploaded</span>
            <span />
          </div>
          {clips.map((clip, i) => (
            <ClipRow
              key={clip.id}
              clip={clip}
              formatSize={formatSize}
              formatDuration={formatDuration}
              isLast={i === clips.length - 1}
              onDelete={() => onClipDelete(clip)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function ClipRow({
  clip, formatSize, formatDuration, isLast, onDelete,
}: {
  clip: Clip
  formatSize: (n: number) => string
  formatDuration: (n: number) => string
  isLast: boolean
  onDelete: () => void
}) {
  const [hovered, setHovered] = useState(false)
  const uploadedDate = new Date(clip.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const ext = clip.name.split('.').pop()?.toUpperCase() ?? 'MP4'

  return (
    <div
      className="grid gap-4 px-5 py-3 items-center transition-colors"
      style={{
        gridTemplateColumns: '1fr 80px 80px 100px 40px',
        borderBottom: isLast ? 'none' : '1px solid var(--line-1)',
        background: hovered ? 'var(--tint-1)' : 'transparent',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Name */}
      <div className="flex items-center gap-3 min-w-0">
        <div
          className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-[9px] font-mono font-bold"
          style={{ background: 'var(--tint-3)', color: 'var(--fg-2)' }}
        >
          {ext}
        </div>
        <span className="text-sm truncate" style={{ color: 'var(--fg-1)' }}>{clip.name}</span>
      </div>

      <span className="text-xs font-mono" style={{ color: 'var(--fg-3)' }}>
        {formatDuration(clip.duration)}
      </span>
      <span className="text-xs font-mono" style={{ color: 'var(--fg-3)' }}>
        {formatSize(clip.size)}
      </span>
      <span className="text-xs font-mono" style={{ color: 'var(--fg-3)' }}>
        {uploadedDate}
      </span>

      <button
        onClick={onDelete}
        className="flex items-center justify-center w-7 h-7 rounded-lg transition-all"
        style={{
          opacity: hovered ? 1 : 0,
          color: 'oklch(70% 0.18 25)',
          background: 'oklch(70% 0.18 25 / 0.1)',
        }}
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
