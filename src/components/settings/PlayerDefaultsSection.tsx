'use client'
import { useState, useEffect } from 'react'
import { SettingsSection } from './SettingsSection'
import { SettingRow } from './SettingRow'
import { SegmentedControl } from './SegmentedControl'
import { SettingsToggle } from './SettingsToggle'
import { SaveBar } from './SaveBar'
import { validateChoiceDelay } from '@/lib/settings/validation'
import type {
  WorkspaceSettings, SaveState,
  RestartButtonMode, ChoiceDisplayStyle, VideoControlsMode,
} from '@/lib/settings/types'

interface Props {
  data: WorkspaceSettings
  onSave: (patch: Partial<WorkspaceSettings>) => Promise<void>
}

export function PlayerDefaultsSection({ data, onSave }: Props) {
  const [showTitle, setShowTitle] = useState(data.playerShowScenarioTitle)
  const [showProgress, setShowProgress] = useState(data.playerShowProgressBar)
  const [restartButton, setRestartButton] = useState<RestartButtonMode>(data.playerShowRestartButton)
  const [choiceStyle, setChoiceStyle] = useState<ChoiceDisplayStyle>(data.playerChoiceDisplayStyle)
  const [choiceDelay, setChoiceDelay] = useState(String(data.playerChoiceDelaySeconds))
  const [videoControls, setVideoControls] = useState<VideoControlsMode>(data.playerVideoControls)
  const [reducedMotion, setReducedMotion] = useState(data.playerReducedMotion)
  const [delayError, setDelayError] = useState<string | null>(null)
  const [saveState, setSaveState] = useState<SaveState>('idle')

  const isDirty =
    showTitle !== data.playerShowScenarioTitle ||
    showProgress !== data.playerShowProgressBar ||
    restartButton !== data.playerShowRestartButton ||
    choiceStyle !== data.playerChoiceDisplayStyle ||
    choiceDelay !== String(data.playerChoiceDelaySeconds) ||
    videoControls !== data.playerVideoControls ||
    reducedMotion !== data.playerReducedMotion

  useEffect(() => {
    if (isDirty && saveState === 'idle') setSaveState('dirty')
    if (!isDirty && saveState === 'dirty') setSaveState('idle')
  }, [isDirty])

  async function handleSave() {
    const delayNum = parseInt(choiceDelay, 10)
    const err = validateChoiceDelay(isNaN(delayNum) ? -1 : delayNum)
    setDelayError(err)
    if (err) return

    setSaveState('saving')
    try {
      await onSave({
        playerShowScenarioTitle: showTitle,
        playerShowProgressBar: showProgress,
        playerShowRestartButton: restartButton,
        playerChoiceDisplayStyle: choiceStyle,
        playerChoiceDelaySeconds: delayNum,
        playerVideoControls: videoControls,
        playerReducedMotion: reducedMotion,
      })
      setSaveState('saved')
      setTimeout(() => setSaveState('idle'), 2000)
    } catch {
      setSaveState('error')
    }
  }

  function handleReset() {
    setShowTitle(data.playerShowScenarioTitle)
    setShowProgress(data.playerShowProgressBar)
    setRestartButton(data.playerShowRestartButton)
    setChoiceStyle(data.playerChoiceDisplayStyle)
    setChoiceDelay(String(data.playerChoiceDelaySeconds))
    setVideoControls(data.playerVideoControls)
    setReducedMotion(data.playerReducedMotion)
    setDelayError(null)
    setSaveState('idle')
  }

  return (
    <>
      <SettingsSection sectionKey="player-defaults" title="Player Defaults" subtitle="Default player experience for your published scenarios.">
        <SettingRow label="Show scenario title">
          <SettingsToggle checked={showTitle} onChange={setShowTitle} label="Show scenario title" />
        </SettingRow>

        <SettingRow label="Show progress bar">
          <SettingsToggle checked={showProgress} onChange={setShowProgress} label="Show progress bar" />
        </SettingRow>

        <SettingRow label="Restart button">
          <SegmentedControl
            value={restartButton}
            onChange={setRestartButton}
            options={[
              { value: 'always', label: 'Always' },
              { value: 'ending_only', label: 'Ending only' },
              { value: 'never', label: 'Never' },
            ]}
          />
        </SettingRow>

        <SettingRow label="Choice display style">
          <SegmentedControl
            value={choiceStyle}
            onChange={setChoiceStyle}
            options={[
              { value: 'video_overlay', label: 'Overlay' },
              { value: 'separate_screen', label: 'Separate' },
              { value: 'bottom_sheet', label: 'Sheet' },
            ]}
          />
        </SettingRow>

        <SettingRow label="Choice delay" hint="Seconds before choices appear (0–30).">
          <div className="flex flex-col items-end gap-1">
            <input
              type="number"
              min={0}
              max={30}
              value={choiceDelay}
              onChange={e => setChoiceDelay(e.target.value)}
              className="w-20 px-3 py-1.5 rounded-lg text-sm bg-transparent border outline-none text-right"
              style={{ color: 'var(--fg-1)', borderColor: delayError ? 'oklch(65% 0.22 30)' : 'var(--line-2)' }}
            />
            {delayError && <p className="text-[11px] font-mono" style={{ color: 'oklch(65% 0.22 30)' }}>{delayError}</p>}
          </div>
        </SettingRow>

        <SettingRow label="Video controls">
          <SegmentedControl
            value={videoControls}
            onChange={setVideoControls}
            options={[
              { value: 'full', label: 'Full' },
              { value: 'minimal', label: 'Minimal' },
              { value: 'hidden', label: 'Hidden' },
            ]}
          />
        </SettingRow>

        <SettingRow label="Reduced motion" hint="Minimize player animations.">
          <SettingsToggle checked={reducedMotion} onChange={setReducedMotion} label="Reduced motion" />
        </SettingRow>
      </SettingsSection>

      <SaveBar saveState={saveState} onSave={handleSave} onReset={handleReset} />
    </>
  )
}
