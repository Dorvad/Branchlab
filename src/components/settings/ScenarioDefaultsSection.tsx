'use client'
import { useState, useEffect } from 'react'
import { SettingsSection } from './SettingsSection'
import { SettingRow } from './SettingRow'
import { SegmentedControl } from './SegmentedControl'
import { SaveBar } from './SaveBar'
import type {
  WorkspaceSettings, SaveState,
  SupportedLanguage, ScenarioVisibility, ValidationMode, ThumbnailSource, FeedbackBehavior,
} from '@/lib/settings/types'

interface Props {
  data: WorkspaceSettings
  onSave: (patch: Partial<WorkspaceSettings>) => Promise<void>
}

export function ScenarioDefaultsSection({ data, onSave }: Props) {
  const [language, setLanguage] = useState<SupportedLanguage>(data.defaultScenarioLanguage)
  const [visibility, setVisibility] = useState<ScenarioVisibility>(data.defaultScenarioVisibility)
  const [validationMode, setValidationMode] = useState<ValidationMode>(data.defaultValidationMode)
  const [thumbnailSource, setThumbnailSource] = useState<ThumbnailSource>(data.defaultThumbnailSource)
  const [feedbackBehavior, setFeedbackBehavior] = useState<FeedbackBehavior>(data.defaultFeedbackBehavior)
  const [saveState, setSaveState] = useState<SaveState>('idle')

  const isDirty =
    language !== data.defaultScenarioLanguage ||
    visibility !== data.defaultScenarioVisibility ||
    validationMode !== data.defaultValidationMode ||
    thumbnailSource !== data.defaultThumbnailSource ||
    feedbackBehavior !== data.defaultFeedbackBehavior

  useEffect(() => {
    if (isDirty && saveState === 'idle') setSaveState('dirty')
    if (!isDirty && saveState === 'dirty') setSaveState('idle')
  }, [isDirty])

  async function handleSave() {
    setSaveState('saving')
    try {
      await onSave({
        defaultScenarioLanguage: language,
        defaultScenarioVisibility: visibility,
        defaultValidationMode: validationMode,
        defaultThumbnailSource: thumbnailSource,
        defaultFeedbackBehavior: feedbackBehavior,
      })
      setSaveState('saved')
      setTimeout(() => setSaveState('idle'), 2000)
    } catch {
      setSaveState('error')
    }
  }

  function handleReset() {
    setLanguage(data.defaultScenarioLanguage)
    setVisibility(data.defaultScenarioVisibility)
    setValidationMode(data.defaultValidationMode)
    setThumbnailSource(data.defaultThumbnailSource)
    setFeedbackBehavior(data.defaultFeedbackBehavior)
    setSaveState('idle')
  }

  return (
    <>
      <SettingsSection sectionKey="scenario-defaults" title="Scenario Defaults" subtitle="Default values when creating new scenarios.">
        <SettingRow label="Language">
          <SegmentedControl
            value={language}
            onChange={setLanguage}
            options={[
              { value: 'en', label: 'English' },
              { value: 'he', label: 'Hebrew' },
            ]}
          />
        </SettingRow>

        <SettingRow label="Visibility">
          <SegmentedControl
            value={visibility}
            onChange={setVisibility}
            options={[
              { value: 'private', label: 'Private' },
              { value: 'unlisted', label: 'Unlisted' },
              { value: 'public', label: 'Public' },
            ]}
          />
        </SettingRow>

        <SettingRow label="Validation mode" hint="Which issues are shown in the validator.">
          <SegmentedControl
            value={validationMode}
            onChange={setValidationMode}
            options={[
              { value: 'errors_only', label: 'Errors only' },
              { value: 'errors_and_warnings', label: 'Errors + warnings' },
            ]}
          />
        </SettingRow>

        <SettingRow label="Thumbnail source" hint="How scenario thumbnails are generated.">
          <SegmentedControl
            value={thumbnailSource}
            onChange={setThumbnailSource}
            options={[
              { value: 'placeholder', label: 'Placeholder' },
              { value: 'last_frame', label: 'Last frame' },
              { value: 'custom', label: 'Custom' },
            ]}
          />
        </SettingRow>

        <SettingRow label="Feedback behavior" hint="How feedback nodes are presented to players.">
          <SegmentedControl
            value={feedbackBehavior}
            onChange={setFeedbackBehavior}
            options={[
              { value: 'overlay', label: 'Overlay' },
              { value: 'separate_step', label: 'Separate' },
              { value: 'disabled', label: 'Off' },
            ]}
          />
        </SettingRow>
      </SettingsSection>

      <SaveBar saveState={saveState} onSave={handleSave} onReset={handleReset} />
    </>
  )
}
