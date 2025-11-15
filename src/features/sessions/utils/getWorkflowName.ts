/**
 * Compute workflow name given a session id and environment.
 * Suffix rules:
 * - If VITE_WORKFLOW_ENV is set and non-empty, append it as-is.
 * - Else if in dev mode (import.meta.env.DEV), append 'Dev'.
 * - Else, no suffix.
 */
export function getWorkflowName(sessionId?: string | null): string | null {
  if (!sessionId) return null
  const env: any = (import.meta as any)?.env
  const rawSuffix = env?.VITE_WORKFLOW_ENV
  const suffix = rawSuffix && String(rawSuffix).trim().length > 0 ? String(rawSuffix) : env?.DEV ? 'Dev' : ''
  return `${sessionId}${suffix || ''}`
}
