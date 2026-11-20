import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getSelectedProjectId, setSelectedProjectId, subscribeSelectedProjectId } from './projectSelection'

describe('observable tab-scoped project selection', () => {
  const storage = new Map<string, string>()
  const cookies = new Map<string, string>()
  beforeEach(() => {
    storage.clear()
    cookies.clear()
    vi.stubGlobal('window', {
      sessionStorage: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => { storage.set(key, value) },
        removeItem: (key: string) => { storage.delete(key) },
      },
    })
    vi.stubGlobal('document', {
      get cookie() { return [...cookies].map(([k, v]) => `${k}=${v}`).join('; ') },
      set cookie(value: string) {
        const [key, val] = value.split(';')[0].split('=')
        if (value.includes('Thu, 01 Jan 1970')) cookies.delete(key)
        else cookies.set(key, val)
      },
    })
  })
  afterEach(() => vi.unstubAllGlobals())

  it('notifies on meaningful same-tab changes and preserves project selection', () => {
    const changed = vi.fn()
    const unsubscribe = subscribeSelectedProjectId(changed)
    setSelectedProjectId('project-A')
    setSelectedProjectId('project-A')
    setSelectedProjectId('project-B')
    expect(getSelectedProjectId()).toBe('project-B')
    expect(changed).toHaveBeenCalledTimes(2)
    unsubscribe()
    setSelectedProjectId('project-C')
    expect(changed).toHaveBeenCalledTimes(2)
  })

  it('clears both session and cookie selection rather than falling back to old project', () => {
    setSelectedProjectId('project-A')
    setSelectedProjectId(null)
    expect(getSelectedProjectId()).toBe('')
    expect(cookies.has('awfl.projectId')).toBe(false)
  })

  it('restores the cookie in a fresh tab without overwriting a tab-specific choice', () => {
    setSelectedProjectId('project-A')
    storage.clear()
    expect(getSelectedProjectId()).toBe('project-A')
    storage.set('awfl.projectId', 'project-B')
    expect(getSelectedProjectId()).toBe('project-B')
  })
})
