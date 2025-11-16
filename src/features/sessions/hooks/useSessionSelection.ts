import { useEffect, useMemo, useState } from 'react'
import type { Session } from '../types/session'

export function useSessionSelection(params: {
  sessions: Session[]
  filtered: Session[]
  userId?: string | null
  idToken?: string | null
}) {
  const { sessions, filtered, userId, idToken } = params

  const [selectedId, setSelectedId] = useState<string | null>(null)

  // Clear selection when auth is missing
  useEffect(() => {
    if (!idToken || !userId) setSelectedId(null)
  }, [idToken, userId])

  // Ensure selectedId is valid against the full list and auto-select first on load
  useEffect(() => {
    if (!sessions.length) return
    if (!selectedId) {
      setSelectedId(sessions[0].id)
      return
    }
    const exists = sessions.some((s) => s.id === selectedId)
    if (!exists) setSelectedId(sessions[0].id)
  }, [sessions, selectedId])

  // Selected object resolved within the currently filtered list
  const selected = useMemo(() => {
    if (!filtered.length) return null
    const cur = selectedId ? filtered.find((s) => s.id === selectedId) : null
    return cur ?? filtered[0]
  }, [filtered, selectedId])

  return { selectedId, setSelectedId, selected }
}
