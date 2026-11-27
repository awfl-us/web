import { describe, expect, it } from 'vitest'
import { defaultAppearance, normalizeAppearance } from './appearance'
describe('appearance preferences', () => {
  it('defaults unknown versions and invalid values', () => {
    expect(normalizeAppearance(null)).toEqual(defaultAppearance)
    expect(normalizeAppearance({version: 99, theme: 'dark'})).toEqual(defaultAppearance)
    expect(normalizeAppearance({version: 1, theme: 'url(evil)', navigationWidth: NaN})).toEqual(defaultAppearance)
  })
  it('accepts known choices and bounds geometry', () => {
    expect(normalizeAppearance({version: 1, theme: 'dark', density: 'compact', navigation: 'right', navigationWidth: 999, conversationMaxWidth: 1})).toEqual({
      version: 1, theme: 'dark', density: 'compact', navigation: 'right', navigationWidth: 400, conversationMaxWidth: 480, messageStyle: 'conversation', showTimestamps: true, showCosts: true, activityMode: 'compact',
    })
  })
})
