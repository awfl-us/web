// Shared Session shape used across pages, hooks, and mapping
export type Session = {
  id: string
  title: string
  // ISO string (e.g., 2025-01-01T00:00:00.000Z)
  updatedAt: string
  summary?: string
  highlights?: string[]
  tags?: string[]
}
