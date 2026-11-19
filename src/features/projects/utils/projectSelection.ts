import { getCookie, setCookie } from '../../../utils/cookies'

const KEY = 'awfl.projectId'

// Simple module-scoped subscription for project id changes
type Listener = () => void
const listeners = new Set<Listener>()
function emitChange() {
  for (const fn of Array.from(listeners)) {
    try { fn() } catch { /* no-op */ }
  }
}

// Internal subscription API (feature-internal usage)
export function subscribeSelectedProjectId(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getSelectedProjectId(): string {
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      const v = window.sessionStorage.getItem(KEY)
      if (v) return v
    }
  } catch {
    // ignore sessionStorage errors (e.g., privacy mode)
  }
  // Fallback to cookie for a good default on new loads
  return getCookie(KEY) || ''
}

export function setSelectedProjectId(id?: string | null): void {
  const prev = getSelectedProjectId()
  const val = id ?? ''
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      if (val) window.sessionStorage.setItem(KEY, val)
      else window.sessionStorage.removeItem(KEY)
    }
  } catch {
    // ignore sessionStorage errors
  }
  // Always persist last non-empty selection to cookie for cross-tab defaults
  if (val) setCookie(KEY, val)

  // Only emit if the effective value actually changed
  const next = getSelectedProjectId()
  if (next !== prev) emitChange()
}
