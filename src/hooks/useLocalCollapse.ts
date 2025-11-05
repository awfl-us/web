import { useEffect, useState } from 'react'
import { collapseStorageKey } from '../utils/collapse'

export function useLocalCollapse(sessionId?: string, label?: string) {
  const [expanded, setExpanded] = useState<boolean | null>(null)
  const key = sessionId && label ? collapseStorageKey(sessionId, label) : null

  useEffect(() => {
    if (!key) return
    try {
      const raw = localStorage.getItem(key)
      if (raw === '1') setExpanded(true)
      else if (raw === '0') setExpanded(false)
      else setExpanded(null)
    } catch {
      setExpanded(null)
    }
  }, [key])

  const save = (value: boolean) => {
    if (!key) return
    try {
      localStorage.setItem(key, value ? '1' : '0')
    } catch {}
  }

  return { expanded, setExpanded, save }
}
