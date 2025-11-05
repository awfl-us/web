import { useCallback, useMemo, useState } from 'react'

export function useFsSelection(initial?: string[]) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set(initial || []))

  const isSelected = useCallback((path: string) => selected.has(path), [selected])

  const select = useCallback((path: string, value: boolean) => {
    setSelected(prev => {
      const has = prev.has(path)
      // Idempotent: no state change if membership already matches desired value
      if ((value && has) || (!value && !has)) return prev
      const next = new Set(prev)
      if (value) next.add(path)
      else next.delete(path)
      return next
    })
  }, [])

  const toggle = useCallback((path: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }, [])

  const clear = useCallback(() => {
    setSelected(prev => (prev.size ? new Set() : prev))
  }, [])

  const count = selected.size
  const paths = useMemo(() => Array.from(selected), [selected])

  return { selected, paths, count, isSelected, select, toggle, clear, setSelected }
}
