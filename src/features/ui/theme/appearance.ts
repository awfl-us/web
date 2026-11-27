export type Appearance = {
  version: 1
  theme: 'light' | 'dark' | 'system'
  density: 'comfortable' | 'compact'
  navigation: 'left' | 'right'
  navigationWidth: number
  conversationMaxWidth: number
  messageStyle?: 'conversation' | 'legacy'
  showTimestamps?: boolean
  showCosts?: boolean
}
export const defaultAppearance: Appearance = {
  version: 1, theme: 'light', density: 'comfortable',
  navigation: 'left', navigationWidth: 320, conversationMaxWidth: 900,
  messageStyle: 'conversation', showTimestamps: true, showCosts: true,
}
function bounded(value: unknown, min: number, max: number, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(min, Math.min(max, Math.round(value))) : fallback
}
export function normalizeAppearance(value: unknown): Appearance {
  if (!value || typeof value !== 'object') return { ...defaultAppearance }
  const v = value as Partial<Appearance>
  if (v.version !== 1) return { ...defaultAppearance }
  return {
    version: 1,
    theme: v.theme === 'dark' || v.theme === 'system' ? v.theme : 'light',
    density: v.density === 'compact' ? 'compact' : 'comfortable',
    navigation: v.navigation === 'right' ? 'right' : 'left',
    navigationWidth: bounded(v.navigationWidth, 200, 400, defaultAppearance.navigationWidth),
    conversationMaxWidth: bounded(v.conversationMaxWidth, 480, 1600, defaultAppearance.conversationMaxWidth),
    messageStyle: v.messageStyle === 'legacy' ? 'legacy' : 'conversation',
    showTimestamps: v.showTimestamps !== false,
    showCosts: v.showCosts !== false,
  }
}
