import { describe, expect, it } from 'vitest'
import { normalizeSessionModel } from './useSessionModel'

describe('provider-neutral model selection', () => {
  it('migrates legacy OpenCode selections to canonical IDs', () => {
    expect(normalizeSessionModel('opencode/deepseek-v4.1-flash')).toBe('deepseek-v4.1-flash')
    expect(normalizeSessionModel('opencode/claude-sonnet-5-5')).toBe('claude-sonnet-5-5')
  })
  it('preserves existing models and rejects unknown IDs', () => {
    expect(normalizeSessionModel('gpt-6.1-terra')).toBe('gpt-6.1-terra')
    expect(normalizeSessionModel('gpt-6-luna')).toBe('gpt-6-luna')
    expect(normalizeSessionModel('opencode/unknown')).toBe('gpt-6.1-terra')
  })
})
