import { deleteCookie, getCookie, setCookie } from '../../../utils/cookies'

const KEY = 'awfl.projectId'
type Listener = () => void
const listeners = new Set<Listener>()

/** Session selection is tab-specific; changes in this tab are observable. */
export function subscribeSelectedProjectId(listener: Listener): () => void {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
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
  const previous = getSelectedProjectId()
  const val = id ?? ''
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      if (val) window.sessionStorage.setItem(KEY, val)
      else window.sessionStorage.removeItem(KEY)
    }
  } catch {
    // ignore sessionStorage errors
  }
  // An explicit clear must not resurrect a stale cookie as the selected project.
  if (val) setCookie(KEY, val)
  else deleteCookie(KEY)
  if (getSelectedProjectId() !== previous) {
    for (const notify of listeners) notify()
  }
}
