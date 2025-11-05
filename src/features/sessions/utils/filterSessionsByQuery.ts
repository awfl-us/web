import type { Session } from '../types/session'

/**
 * Filter sessions by a free-text query across title, summary, tags, and highlights.
 * Case-insensitive; trims the query. Returns the original array when query is empty.
 */
export function filterSessionsByQuery(sessions: Session[], query: string): Session[] {
  const q = (query || '').trim().toLowerCase()
  if (!q) return sessions
  return sessions.filter((s) => {
    const hay = [
      s.title || '',
      s.summary || '',
      ...(Array.isArray(s.tags) ? s.tags : []),
      ...(Array.isArray(s.highlights) ? s.highlights : []),
    ]
      .join(' \n ')
      .toLowerCase()
    return hay.includes(q)
  })
}
