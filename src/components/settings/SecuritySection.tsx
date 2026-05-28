'use client'
import { SettingsSection } from './SettingsSection'
import { SettingRow } from './SettingRow'

interface Props {
  email: string | null
  provider: string
  onSignOut: () => void
}

export function SecuritySection({ email, provider, onSignOut }: Props) {
  return (
    <SettingsSection
      sectionKey="security"
      title="Security"
      subtitle="Authentication and session management."
    >
      <SettingRow label="Email" hint="Your sign-in email address.">
        <span className="text-sm font-mono" style={{ color: 'var(--fg-3)' }}>
          {email ?? '—'}
        </span>
      </SettingRow>

      <SettingRow label="Sign-in method">
        <span className="text-sm font-mono" style={{ color: 'var(--fg-3)' }}>
          {provider}
        </span>
      </SettingRow>

      <SettingRow label="Password change" hint="Coming soon.">
        <span
          className="text-xs font-mono px-2 py-1 rounded"
          style={{ color: 'var(--fg-4)', background: 'var(--tint-1)' }}
        >
          Coming soon
        </span>
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
  )
}
