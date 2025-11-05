// Utilities for collapse/expand state normalization and storage keys

// Normalize group labels to a stable, server-aligned key
// - Uppercase
// - Replace any non [A-Z0-9_] with underscore
// - Collapse repeated underscores and trim at ends
export function normalizeGroup(label: string): string {
  const up = String(label || '').toUpperCase()
  const replaced = up.replace(/[^A-Z0-9_]+/g, '_')
  const collapsed = replaced.replace(/_+/g, '_')
  return collapsed.replace(/^_+|_+$/g, '')
}

// Stable localStorage key for collapse state by session and group
export function collapseStorageKey(sessionId: string, label: string): string {
  return `collapseState:${String(sessionId)}:${normalizeGroup(label)}`
}
