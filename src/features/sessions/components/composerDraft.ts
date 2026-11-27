export type Draft = { text: string; revision: string }
const empty = (): Draft => ({ text: '', revision: '' })
const key = (scope: string) => 'awfl:draft:v1:' + scope
export function readDraft(scope?: string): Draft {
  if (!scope) return empty()
  try {
    const value = JSON.parse(sessionStorage.getItem(key(scope)) || 'null')
    if (typeof value?.text === 'string' && typeof value?.revision === 'string') return value
  } catch { /* optional storage */ }
  return empty()
}
export function saveDraft(scope: string | undefined, draft: Draft) {
  if (!scope) return
  try {
    if (draft.text) sessionStorage.setItem(key(scope), JSON.stringify(draft))
    else sessionStorage.removeItem(key(scope))
  } catch { /* optional storage */ }
}
export function clearAcknowledgedDraft(scope: string | undefined, revision: string) {
  if (scope && readDraft(scope).revision === revision) {
    saveDraft(scope, empty())
    window.dispatchEvent(new CustomEvent('awfl:draft-ack', { detail: { scope, revision } }))
  }
}
