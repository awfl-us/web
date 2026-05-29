import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

export type UseSessionModelParams = {
  sessionId: string | null
  enabled?: boolean
}

export type UseSessionModelResult = {
  model: string
  setModel: (m: string) => void
  options: Array<{ value: string; label: string }>
}

const DEFAULT_MODEL = 'gpt-5'
const OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'gpt-5', label: 'GPT-5' },
  { value: 'gpt-4.1', label: 'GPT-4.1' },
  { value: 'gpt-4o', label: 'GPT-4o' },
]

function keyFor(sessionId: string | null) {
  return sessionId ? `session:model:${sessionId}` : `session:model:__none__`
}

export function useSessionModel(params: UseSessionModelParams): UseSessionModelResult {
  const { sessionId, enabled = true } = params || {}

  const [model, setModelState] = useState<string>(DEFAULT_MODEL)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  // Load from localStorage on session change
  useEffect(() => {
    if (!enabled) return
    const k = keyFor(sessionId)
    try {
      const raw = typeof window !== 'undefined' ? window.localStorage.getItem(k) : null
      if (raw && typeof raw === 'string') {
        const val = raw.trim()
        // Only accept known options to avoid typos from older keys
        const exists = OPTIONS.some((o) => o.value === val)
        setModelState(exists ? val : DEFAULT_MODEL)
      } else {
        setModelState(DEFAULT_MODEL)
      }
    } catch {
      setModelState(DEFAULT_MODEL)
    }
  }, [sessionId, enabled])

  const setModel = useCallback((m: string) => {
    const val = OPTIONS.some((o) => o.value === m) ? m : DEFAULT_MODEL
    setModelState(val)
    try {
      const k = keyFor(sessionId)
      if (typeof window !== 'undefined') window.localStorage.setItem(k, val)
    } catch {
      // ignore storage errors
    }
  }, [sessionId])

  const options = useMemo(() => OPTIONS, [])

  return { model, setModel, options }
}
