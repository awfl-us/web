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

const DEFAULT_MODEL = 'gpt-6.1-terra'
const OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'gpt-6.1-terra', label: 'GPT-6.1 Terra' },
  { value: 'gpt-5', label: 'GPT-5' },
  { value: 'gpt-4.1', label: 'GPT-4.1' },
  { value: 'gpt-4o', label: 'GPT-4o' },
  { value: 'gpt-6.2-sol', label: 'GPT-6.2 Sol' },
  { value: 'gpt-6-luna', label: 'GPT-6 Luna' },
  { value: 'claude-sonnet-5-5', label: 'Claude Sonnet 5.5' },
  { value: 'claude-opus-5-5', label: 'Claude Opus 5.5' },
  { value: 'gemini-4-argon', label: 'Gemini 4 Argon' },
  { value: 'gemini-3.8-flash', label: 'Gemini 3.8 Flash' },
  { value: 'deepseek-v4.1-flash', label: 'DeepSeek V4.1 Flash' },
  { value: 'deepseek-v4-pro', label: 'DeepSeek V4 Pro' },
  { value: 'glm-5.3', label: 'GLM 5.3' },
  { value: 'kimi-k2.7-code', label: 'Kimi K2.7 Code' },
]

export function normalizeSessionModel(raw: string): string {
  const val = raw.trim().replace(/^opencode\//, '')
  return OPTIONS.some(o => o.value === val) ? val : DEFAULT_MODEL
}

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
        const val = normalizeSessionModel(raw)
        setModelState(val)
        if (val !== raw) window.localStorage.setItem(k, val)
      } else {
        setModelState(DEFAULT_MODEL)
      }
    } catch {
      setModelState(DEFAULT_MODEL)
    }
  }, [sessionId, enabled])

  const setModel = useCallback((m: string) => {
    const val = normalizeSessionModel(m)
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
