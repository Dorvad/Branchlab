'use client'
import { useState, useEffect } from 'react'
import { SettingsSection } from './SettingsSection'
import { SettingRow } from './SettingRow'
import { SaveBar } from './SaveBar'
import { validateDisplayName } from '@/lib/settings/validation'
import type { UserProfile, SaveState } from '@/lib/settings/types'

interface Props {
  data: UserProfile
  email: string | null
  onSave: (patch: Partial<UserProfile>) => Promise<void>
  onSignOut: () => void
}

export function AccountSection({ data, email, onSave, onSignOut }: Props) {
  const [displayName, setDisplayName] = useState(data.displayName ?? '')
  const [avatarUrl, setAvatarUrl] = useState(data.avatarUrl ?? '')
  const [nameError, setNameError] = useState<string | null>(null)
  const [saveState, setSaveState] = useState<SaveState>('idle')

  const isDirty =
    displayName !== (data.displayName ?? '') ||
    avatarUrl !== (data.avatarUrl ?? '')

  useEffect(() => {
    if (isDirty && saveState === 'idle') setSaveState('dirty')
    if (!isDirty && saveState === 'dirty') setSaveState('idle')
  }, [isDirty])

  async function handleSave() {
    const err = validateDisplayName(displayName)
    if (err) { setNameError(err); return }
    setNameError(null)
    setSaveState('saving')
    try {
      await onSave({
        displayName: displayName.trim() || null,
        avatarUrl: avatarUrl.trim() || null,
      })
      setSaveState('saved')
      setTimeout(() => setSaveState('idle'), 2000)
    } catch {
      setSaveState('error')
    }
  }

  function handleReset() {
    setDisplayName(data.displayName ?? '')
    setAvatarUrl(data.avatarUrl ?? '')
    setNameError(null)
    setSaveState('idle')
  }

  return (
    <>
      <SettingsSection
        sectionKey="account"
        title="Account"
        subtitle="Your personal identity in BranchLab."
      >
        <SettingRow label="Display name" hint="Shown on published scenarios and exports.">
          <div className="flex flex-col items-end gap-1">
            <input
              type="text"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="Your name"
              className="w-48 px-3 py-1.5 rounded-lg text-sm bg-transparent border outline-none"
              style={{
                color: 'var(--fg-1)',
                borderColor: nameError ? 'oklch(65% 0.22 30)' : 'var(--line-2)',
              }}
            />
            {nameError && <p className="text-[11px] font-mono" style={{ color: 'oklch(65% 0.22 30)' }}>{nameError}</p>}
          </div>
        </SettingRow>

        <SettingRow label="Email" hint="Your sign-in email. Cannot be changed here.">
          <span className="text-sm font-mono" style={{ color: 'var(--fg-3)' }}>
            {email ?? '—'}
          </span>
        </SettingRow>

        <SettingRow label="Avatar URL" hint="Direct image URL for your avatar.">
          <input
            type="url"
            value={avatarUrl}
            onChange={e => setAvatarUrl(e.target.value)}
            placeholder="https://…"
            className="w-48 px-3 py-1.5 rounded-lg text-sm bg-transparent border outline-none"
            style={{ color: 'var(--fg-1)', borderColor: 'var(--line-2)' }}
          />
        </SettingRow>

        <SettingRow label="Sign out" hint="Sign out of this device.">
          <button
            type="button"
            onClick={onSignOut}
            className="px-3 py-1.5 rounded-lg text-xs font-mono transition-colors"
            style={{ color: 'oklch(65% 0.22 30)', border: '1px solid oklch(65% 0.22 30 / 0.4)' }}
          >
            Sign out
          </button>
        </SettingRow>
      </SettingsSection>

      <SaveBar saveState={saveState} onSave={handleSave} onReset={handleReset} />
    </>
  )
}
