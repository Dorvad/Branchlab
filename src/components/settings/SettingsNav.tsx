'use client'
import { User, Sliders, Building2, GitBranch, Play, HardDrive, Globe, Shield } from 'lucide-react'

export type SettingsSectionId =
  | 'account'
  | 'preferences'
  | 'workspace'
  | 'scenario-defaults'
  | 'player-defaults'
  | 'media-storage'
  | 'publishing'
  | 'security'

const SECTIONS: Array<{ id: SettingsSectionId; label: string; Icon: React.ElementType }> = [
  { id: 'account',          label: 'Account',           Icon: User },
  { id: 'preferences',      label: 'Preferences',       Icon: Sliders },
  { id: 'workspace',        label: 'Workspace',         Icon: Building2 },
  { id: 'scenario-defaults',label: 'Scenario Defaults', Icon: GitBranch },
  { id: 'player-defaults',  label: 'Player Defaults',   Icon: Play },
  { id: 'media-storage',    label: 'Media & Storage',   Icon: HardDrive },
  { id: 'publishing',       label: 'Publishing',        Icon: Globe },
  { id: 'security',         label: 'Security',          Icon: Shield },
]

interface Props {
  active: SettingsSectionId
  onChange: (id: SettingsSectionId) => void
}

export function SettingsNav({ active, onChange }: Props) {
  return (
    <nav className="flex flex-col gap-0.5 py-2">
      {SECTIONS.map(({ id, label, Icon }) => {
        const isActive = id === active
        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-xs font-mono text-left transition-colors"
            style={
              isActive
                ? {
                    color: 'oklch(82% 0.18 165)',
                    background: 'oklch(82% 0.18 165 / 0.07)',
                    borderLeft: '2px solid oklch(82% 0.18 165)',
                    paddingLeft: '10px',
                  }
                : {
                    color: 'var(--fg-3)',
                    borderLeft: '2px solid transparent',
                    paddingLeft: '10px',
                  }
            }
          >
            <Icon size={13} />
            {label}
          </button>
        )
      })}
    </nav>
  )
}
