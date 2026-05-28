'use client'
import { useState, useEffect } from 'react'
import { SettingsSection } from './SettingsSection'
import { SettingRow } from './SettingRow'
import { SegmentedControl } from './SegmentedControl'
import { SettingsToggle } from './SettingsToggle'
import { SaveBar } from './SaveBar'
import type { WorkspaceSettings, SaveState, AssetViewMode, StorageStats } from '@/lib/settings/types'

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`
}

interface Props {
  data: WorkspaceSettings
  stats: StorageStats
  onSave: (patch: Partial<WorkspaceSettings>) => Promise<void>
}

export function MediaStorageSection({ data, stats, onSave }: Props) {
  const [defaultView, setDefaultView] = useState<AssetViewMode>(data.mediaDefaultAssetView)
  const [warnLarge, setWarnLarge] = useState(data.mediaWarnBeforeLargeUpload)
  const [autoDelete, setAutoDelete] = useState(data.mediaAutoDeleteUnusedAssets)
  const [saveState, setSaveState] = useState<SaveState>('idle')

  const isDirty =
    defaultView !== data.mediaDefaultAssetView ||
    warnLarge !== data.mediaWarnBeforeLargeUpload ||
    autoDelete !== data.mediaAutoDeleteUnusedAssets

  useEffect(() => {
    if (isDirty && saveState === 'idle') setSaveState('dirty')
    if (!isDirty && saveState === 'dirty') setSaveState('idle')
  }, [isDirty])

  async function handleSave() {
    setSaveState('saving')
    try {
      await onSave({
        mediaDefaultAssetView: defaultView,
        mediaWarnBeforeLargeUpload: warnLarge,
        mediaAutoDeleteUnusedAssets: autoDelete,
      })
      setSaveState('saved')
      setTimeout(() => setSaveState('idle'), 2000)
    } catch {
      setSaveState('error')
    }
  }

  function handleReset() {
    setDefaultView(data.mediaDefaultAssetView)
    setWarnLarge(data.mediaWarnBeforeLargeUpload)
    setAutoDelete(data.mediaAutoDeleteUnusedAssets)
    setSaveState('idle')
  }

  return (
    <>
      <SettingsSection sectionKey="media-storage" title="Media & Storage" subtitle="Clip storage usage and media library preferences.">
        <SettingRow label="Clips" hint="Total number of uploaded clips.">
          <span className="text-sm font-mono" style={{ color: 'var(--fg-3)' }}>
            {stats.clipCount} clip{stats.clipCount !== 1 ? 's' : ''}
          </span>
        </SettingRow>

        <SettingRow label="Storage used">
          <span className="text-sm font-mono" style={{ color: 'var(--fg-3)' }}>
            {formatBytes(stats.totalBytes)}
          </span>
        </SettingRow>

        <SettingRow label="Default asset view" hint="How assets are sorted in the library by default.">
          <SegmentedControl
            value={defaultView}
            onChange={setDefaultView}
            options={[
              { value: 'recent', label: 'Recent' },
              { value: 'by_scenario', label: 'By scenario' },
              { value: 'all', label: 'All' },
            ]}
          />
        </SettingRow>

        <SettingRow label="Warn before large upload" hint="Show a confirmation for files over 100 MB.">
          <SettingsToggle checked={warnLarge} onChange={setWarnLarge} label="Warn before large upload" />
        </SettingRow>

        <SettingRow label="Auto-delete unused assets" hint="Automatically remove clips not attached to any scenario.">
          <SettingsToggle checked={autoDelete} onChange={setAutoDelete} label="Auto-delete unused assets" />
        </SettingRow>
      </SettingsSection>

      <SaveBar saveState={saveState} onSave={handleSave} onReset={handleReset} />
    </>
  )
}
