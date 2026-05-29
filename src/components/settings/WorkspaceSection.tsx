'use client'
import { useState, useEffect } from 'react'
import { SettingsSection } from './SettingsSection'
import { SettingRow } from './SettingRow'
import { SaveBar } from './SaveBar'
import { validateWorkspaceName, validateWorkspaceSlug, validateTimezone } from '@/lib/settings/validation'
import type { WorkspaceSettings, SaveState } from '@/lib/settings/types'

interface Props {
  data: WorkspaceSettings
  onSave: (patch: Partial<WorkspaceSettings>) => Promise<void>
}

export function WorkspaceSection({ data, onSave }: Props) {
  const [name, setName] = useState(data.workspaceName)
  const [slug, setSlug] = useState(data.workspaceSlug ?? '')
  const [logoUrl, setLogoUrl] = useState(data.workspaceLogoUrl ?? '')
  const [timezone, setTimezone] = useState(data.workspaceTimezone)
  const [nameError, setNameError] = useState<string | null>(null)
  const [slugError, setSlugError] = useState<string | null>(null)
  const [tzError, setTzError] = useState<string | null>(null)
  const [saveState, setSaveState] = useState<SaveState>('idle')

  const isDirty =
    name !== data.workspaceName ||
    slug !== (data.workspaceSlug ?? '') ||
    logoUrl !== (data.workspaceLogoUrl ?? '') ||
    timezone !== data.workspaceTimezone

  useEffect(() => {
    if (isDirty && saveState === 'idle') setSaveState('dirty')
    if (!isDirty && saveState === 'dirty') setSaveState('idle')
  }, [isDirty])

  async function handleSave() {
    const ne = validateWorkspaceName(name)
    const se = validateWorkspaceSlug(slug)
    const te = validateTimezone(timezone)
    setNameError(ne)
    setSlugError(se)
    setTzError(te)
    if (ne || se || te) return

    setSaveState('saving')
    try {
      await onSave({
        workspaceName: name,
        workspaceSlug: slug.trim() || null,
        workspaceLogoUrl: logoUrl.trim() || null,
        workspaceTimezone: timezone,
      })
      setSaveState('saved')
      setTimeout(() => setSaveState('idle'), 2000)
    } catch {
      setSaveState('error')
    }
  }

  function handleReset() {
    setName(data.workspaceName)
    setSlug(data.workspaceSlug ?? '')
    setLogoUrl(data.workspaceLogoUrl ?? '')
    setTimezone(data.workspaceTimezone)
    setNameError(null)
    setSlugError(null)
    setTzError(null)
    setSaveState('idle')
  }

  const inputCls = 'w-56 px-3 py-1.5 rounded-lg text-sm bg-transparent border outline-none'

  return (
    <>
      <SettingsSection sectionKey="workspace" title="Workspace" subtitle="Settings for your personal workspace.">
        <SettingRow label="Workspace name">
          <div className="flex flex-col items-end gap-1">
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className={inputCls}
              style={{ color: 'var(--fg-1)', borderColor: nameError ? 'oklch(65% 0.22 30)' : 'var(--line-2)' }}
            />
            {nameError && <p className="text-[11px] font-mono" style={{ color: 'oklch(65% 0.22 30)' }}>{nameError}</p>}
          </div>
        </SettingRow>

        <SettingRow label="Workspace slug" hint="URL-safe identifier. Lowercase, hyphens allowed.">
          <div className="flex flex-col items-end gap-1">
            <input
              type="text"
              value={slug}
              onChange={e => setSlug(e.target.value)}
              placeholder="my-workspace"
              className={inputCls}
              style={{ color: 'var(--fg-1)', borderColor: slugError ? 'oklch(65% 0.22 30)' : 'var(--line-2)' }}
            />
            {slugError && <p className="text-[11px] font-mono" style={{ color: 'oklch(65% 0.22 30)' }}>{slugError}</p>}
          </div>
        </SettingRow>

        <SettingRow label="Logo URL" hint="Direct image URL for your workspace logo.">
          <input
            type="url"
            value={logoUrl}
            onChange={e => setLogoUrl(e.target.value)}
            placeholder="https://…"
            className={inputCls}
            style={{ color: 'var(--fg-1)', borderColor: 'var(--line-2)' }}
          />
        </SettingRow>

        <SettingRow label="Timezone" hint="Workspace timezone for display purposes.">
          <div className="flex flex-col items-end gap-1">
            <input
              type="text"
              value={timezone}
              onChange={e => setTimezone(e.target.value)}
              className={inputCls}
              style={{ color: 'var(--fg-1)', borderColor: tzError ? 'oklch(65% 0.22 30)' : 'var(--line-2)' }}
            />
            {tzError && <p className="text-[11px] font-mono" style={{ color: 'oklch(65% 0.22 30)' }}>{tzError}</p>}
          </div>
        </SettingRow>
      </SettingsSection>

      <SaveBar saveState={saveState} onSave={handleSave} onReset={handleReset} />
    </>
  )
}
