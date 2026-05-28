'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { BranchLabLoader } from '@/components/BranchLabLoader'
import { SettingsLayout } from '@/components/settings/SettingsLayout'
import { AccountSection } from '@/components/settings/AccountSection'
import { PreferencesSection } from '@/components/settings/PreferencesSection'
import { WorkspaceSection } from '@/components/settings/WorkspaceSection'
import { ScenarioDefaultsSection } from '@/components/settings/ScenarioDefaultsSection'
import { PlayerDefaultsSection } from '@/components/settings/PlayerDefaultsSection'
import { MediaStorageSection } from '@/components/settings/MediaStorageSection'
import { PublishingSection } from '@/components/settings/PublishingSection'
import { SecuritySection } from '@/components/settings/SecuritySection'
import { type SettingsSectionId } from '@/components/settings/SettingsNav'
import {
  getAllSettings,
  updateProfile,
  updatePreferences,
  updateWorkspaceSettings,
  getStorageStats,
} from '@/lib/persistence/settings'
import { isSupabaseMode } from '@/lib/persistence/mode'
import { getSupabaseClient } from '@/lib/supabase/client'
import { signOut } from '@/lib/supabase/auth'
import type { AllSettings, StorageStats, UserProfile, UserPreferences, WorkspaceSettings } from '@/lib/settings/types'

export default function SettingsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [settings, setSettings] = useState<AllSettings | null>(null)
  const [stats, setStats] = useState<StorageStats>({ clipCount: 0, totalBytes: 0 })
  const [activeSection, setActiveSection] = useState<SettingsSectionId>('account')
  const [email, setEmail] = useState<string | null>(null)
  const [provider, setProvider] = useState('Email / Password')

  useEffect(() => {
    async function load() {
      try {
        const [allSettings, storageStats] = await Promise.all([
          getAllSettings(),
          getStorageStats(),
        ])
        setSettings(allSettings)
        setStats(storageStats)

        if (isSupabaseMode()) {
          const { data: { user } } = await getSupabaseClient().auth.getUser()
          if (user) {
            setEmail(user.email ?? null)
            const identities = user.identities ?? []
            if (identities.length > 0) {
              const p = identities[0].provider
              setProvider(p === 'email' ? 'Email / Password' : p)
            }
          }
        } else {
          setEmail('local@branchlab.dev')
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load settings')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const handleSignOut = async () => {
    if (isSupabaseMode()) {
      await signOut()
      router.push('/auth')
      router.refresh()
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: 'var(--bg-canvas)' }}>
        <BranchLabLoader size={180} />
      </div>
    )
  }

  if (error || !settings) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: 'var(--bg-canvas)' }}>
        <p className="text-sm font-mono" style={{ color: 'oklch(65% 0.22 30)' }}>
          {error ?? 'Failed to load settings'}
        </p>
      </div>
    )
  }

  async function handleProfileSave(patch: Partial<UserProfile>) {
    const updated = await updateProfile(settings!.profile.userId, patch)
    setSettings(s => s ? { ...s, profile: updated } : s)
  }

  async function handlePreferencesSave(patch: Partial<UserPreferences>) {
    const updated = await updatePreferences(settings!.preferences.userId, patch)
    setSettings(s => s ? { ...s, preferences: updated } : s)
  }

  async function handleWorkspaceSave(patch: Partial<WorkspaceSettings>) {
    const updated = await updateWorkspaceSettings(settings!.workspace.userId, patch)
    setSettings(s => s ? { ...s, workspace: updated } : s)
  }

  function renderSection() {
    switch (activeSection) {
      case 'account':
        return (
          <AccountSection
            data={settings!.profile}
            email={email}
            onSave={handleProfileSave}
            onSignOut={handleSignOut}
          />
        )
      case 'preferences':
        return (
          <PreferencesSection
            data={settings!.preferences}
            onSave={handlePreferencesSave}
          />
        )
      case 'workspace':
        return (
          <WorkspaceSection
            data={settings!.workspace}
            onSave={handleWorkspaceSave}
          />
        )
      case 'scenario-defaults':
        return (
          <ScenarioDefaultsSection
            data={settings!.workspace}
            onSave={handleWorkspaceSave}
          />
        )
      case 'player-defaults':
        return (
          <PlayerDefaultsSection
            data={settings!.workspace}
            onSave={handleWorkspaceSave}
          />
        )
      case 'media-storage':
        return (
          <MediaStorageSection
            data={settings!.workspace}
            stats={stats}
            onSave={handleWorkspaceSave}
          />
        )
      case 'publishing':
        return (
          <PublishingSection
            data={settings!.workspace}
            onSave={handleWorkspaceSave}
          />
        )
      case 'security':
        return (
          <SecuritySection
            email={email}
            provider={provider}
            onSignOut={handleSignOut}
          />
        )
      default:
        return null
    }
  }

  return (
    <SettingsLayout activeSection={activeSection} onSectionChange={setActiveSection}>
      {renderSection()}
    </SettingsLayout>
  )
}
