'use client'
import { useState, useEffect } from 'react'
import { SettingsSection } from './SettingsSection'
import { SettingRow } from './SettingRow'
import { SegmentedControl } from './SegmentedControl'
import { SaveBar } from './SaveBar'
import type {
  UserPreferences, SaveState,
  ThemePreference, InterfaceDensity, MotionPreference,
  SupportedLanguage, DashboardView, EditorOpenBehavior,
} from '@/lib/settings/types'

interface Props {
  data: UserPreferences
  onSave: (patch: Partial<UserPreferences>) => Promise<void>
}

export function PreferencesSection({ data, onSave }: Props) {
  const [theme, setTheme] = useState<ThemePreference>(data.theme)
  const [density, setDensity] = useState<InterfaceDensity>(data.interfaceDensity)
  const [motion, setMotion] = useState<MotionPreference>(data.motionPreference)
  const [language, setLanguage] = useState<SupportedLanguage>(data.language)
  const [timezone, setTimezone] = useState(data.timezone)
  const [dashView, setDashView] = useState<DashboardView>(data.defaultDashboardView)
  const [editorBehavior, setEditorBehavior] = useState<EditorOpenBehavior>(data.editorOpenBehavior)
  const [saveState, setSaveState] = useState<SaveState>('idle')

  const isDirty =
    theme !== data.theme ||
    density !== data.interfaceDensity ||
    motion !== data.motionPreference ||
    language !== data.language ||
    timezone !== data.timezone ||
    dashView !== data.defaultDashboardView ||
    editorBehavior !== data.editorOpenBehavior

  useEffect(() => {
    if (isDirty && saveState === 'idle') setSaveState('dirty')
    if (!isDirty && saveState === 'dirty') setSaveState('idle')
  }, [isDirty])

  async function handleSave() {
    setSaveState('saving')
    try {
      await onSave({
        theme,
        interfaceDensity: density,
        motionPreference: motion,
        language,
        timezone,
        defaultDashboardView: dashView,
        editorOpenBehavior: editorBehavior,
      })
      setSaveState('saved')
      setTimeout(() => setSaveState('idle'), 2000)
    } catch {
      setSaveState('error')
    }
  }

  function handleReset() {
    setTheme(data.theme)
    setDensity(data.interfaceDensity)
    setMotion(data.motionPreference)
    setLanguage(data.language)
    setTimezone(data.timezone)
    setDashView(data.defaultDashboardView)
    setEditorBehavior(data.editorOpenBehavior)
    setSaveState('idle')
  }

  return (
    <>
      <SettingsSection sectionKey="preferences" title="Preferences" subtitle="Interface and display settings.">
        <SettingRow label="Theme">
          <SegmentedControl
            value={theme}
            onChange={setTheme}
            options={[
              { value: 'dark', label: 'Dark' },
              { value: 'light', label: 'Light' },
              { value: 'system', label: 'System' },
            ]}
          />
        </SettingRow>

        <SettingRow label="Density" hint="Controls spacing throughout the interface.">
          <SegmentedControl
            value={density}
            onChange={setDensity}
            options={[
              { value: 'comfortable', label: 'Comfortable' },
              { value: 'compact', label: 'Compact' },
            ]}
          />
        </SettingRow>

        <SettingRow label="Motion" hint="Reduce animations for accessibility.">
          <SegmentedControl
            value={motion}
            onChange={setMotion}
            options={[
              { value: 'full', label: 'Full' },
              { value: 'reduced', label: 'Reduced' },
            ]}
          />
        </SettingRow>

        <SettingRow label="Language" hint="Interface language.">
          <SegmentedControl
            value={language}
            onChange={setLanguage}
            options={[
              { value: 'en', label: 'English' },
              { value: 'he', label: 'Hebrew' },
            ]}
          />
        </SettingRow>

        <SettingRow label="Timezone" hint="Used for date display.">
          <input
            type="text"
            value={timezone}
            onChange={e => setTimezone(e.target.value)}
            placeholder="Asia/Jerusalem"
            className="w-44 px-3 py-1.5 rounded-lg text-sm bg-transparent border outline-none"
            style={{ color: 'var(--fg-1)', borderColor: 'var(--line-2)' }}
          />
        </SettingRow>

        <SettingRow label="Dashboard view">
          <SegmentedControl
            value={dashView}
            onChange={setDashView}
            options={[
              { value: 'grid', label: 'Grid' },
              { value: 'list', label: 'List' },
            ]}
          />
        </SettingRow>

        <SettingRow label="Editor open behavior" hint="Camera position when opening a scenario.">
          <SegmentedControl
            value={editorBehavior}
            onChange={setEditorBehavior}
            options={[
              { value: 'fit_graph', label: 'Fit graph' },
              { value: 'last_view', label: 'Last view' },
              { value: 'start_node', label: 'Start node' },
            ]}
          />
        </SettingRow>
      </SettingsSection>

      <SaveBar saveState={saveState} onSave={handleSave} onReset={handleReset} />
    </>
  )
}
