// Onboarding state is intentionally device-local (localStorage).
// A user logging in on a new device starts fresh — this is the intended
// SaaS behavior so the checklist appears on every new device.

const KEY = 'branchlab:onboarding'

interface OnboardingState {
  dismissed: boolean
  previewedScenarioIds: string[]
}

const DEFAULT: OnboardingState = {
  dismissed: false,
  previewedScenarioIds: [],
}

function read(): OnboardingState {
  if (typeof window === 'undefined') return DEFAULT
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? { ...DEFAULT, ...JSON.parse(raw) } : DEFAULT
  } catch { return DEFAULT }
}

function write(state: OnboardingState): void {
  if (typeof window === 'undefined') return
  try { localStorage.setItem(KEY, JSON.stringify(state)) } catch {}
}

export function getOnboardingState(): OnboardingState { return read() }

export function dismissOnboarding(): void {
  write({ ...read(), dismissed: true })
}

export function resetOnboarding(): void {
  if (typeof window === 'undefined') return
  try { localStorage.removeItem(KEY) } catch {}
}

export function markScenarioPreviewed(scenarioId: string): void {
  const s = read()
  if (!s.previewedScenarioIds.includes(scenarioId)) {
    write({ ...s, previewedScenarioIds: [...s.previewedScenarioIds, scenarioId] })
  }
}

export function hasPreviewedScenario(scenarioId: string): boolean {
  return read().previewedScenarioIds.includes(scenarioId)
}
