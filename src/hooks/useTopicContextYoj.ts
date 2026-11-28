import { useCallback, useEffect, useState } from 'react'
import { makeApiClient } from '../api/apiClient'
import type { YojMessage } from '../types/context'

export type UseTopicContextYojParams = {
  sessionId?: string | null
  projectId?: string | null
  userId?: string | null
  idToken?: string | null
  windowSeconds?: number
  enabled?: boolean
}

export type UseTopicContextYojResult = {
  messages: YojMessage[]
  running: boolean
  error: string | null
  reload: () => void
}

function normalizeYojMessages(arr: any[] | undefined | null): YojMessage[] {
  if (!Array.isArray(arr)) return []
  const out: YojMessage[] = []
  for (const item of arr) {
    try {
      const role = (item?.role ?? 'assistant') as YojMessage['role']
      const rawContent = (item as any)?.content
      let content: string | null | undefined = undefined
      if (typeof rawContent === 'string') content = rawContent
      else if (rawContent == null) content = null
      else if (typeof rawContent === 'object') {
        try { content = JSON.stringify(rawContent) } catch { content = String(rawContent) }
      } else {
        content = String(rawContent)
      }

      const rawTs: any = (item as any)?.create_time
      let create_time: number | string | undefined = undefined
      if (typeof rawTs === 'number') create_time = rawTs
      else if (typeof rawTs === 'string') create_time = rawTs

      const rawCost: any = (item as any)?.cost
      let cost: number | null | undefined = undefined
      if (typeof rawCost === 'number') cost = rawCost
      else if (typeof rawCost === 'string') {
        const n = parseFloat(rawCost)
        if (isFinite(n)) cost = n
      }

      const normalized: YojMessage = {
        ...(item || {}),
        role,
        content,
        create_time,
        cost,
      }
      out.push(normalized)
    } catch (e) {
      // Swallow individual mapping errors to keep UI resilient
       
      console.warn('normalizeYojMessages: skipped bad item', e)
    }
  }
  return out
}

const EMPTY_MESSAGES: YojMessage[] = []

export function useTopicContextYoj(params: UseTopicContextYojParams): UseTopicContextYojResult {
  const { sessionId, projectId, userId, idToken, windowSeconds = 3600, enabled = true } = params

  const scope = JSON.stringify([userId, projectId, sessionId])
  const [result, setResult] = useState<{scope:string; messages:YojMessage[]}>({scope,messages:[]})
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Use state for the bump so calling reload triggers a re-render and re-runs the effect
  const [bump, setBump] = useState(0)

  const reload = useCallback(() => {
    setBump((n) => n + 1)
  }, [])

  useEffect(() => {
    let cancelled = false
    const ac = new AbortController()

    async function load() {
      setError(null)

      const skipAuth = (import.meta as any)?.env?.VITE_SKIP_AUTH === '1'
      if (!enabled || !sessionId || (!idToken && !skipAuth)) {
        setResult({scope,messages:[]})
        setRunning(false)
        return
      }

      setRunning(true)
      try {
        const client = makeApiClient({ idToken: idToken ?? undefined, skipAuth })
        const nowSec = Math.floor(Date.now() / 1000)
        const body = {
          kala: { kind: 'SegKala', sessionId, end: nowSec, windowSeconds },
          presetId: 'TopicContext',
          includeDocId: true,
        }
        const json = await client.topicContextYoj(body, { signal: ac.signal, ...(projectId ? {extraHeaders:{'x-project-id':projectId}} : {}) })
        const raw = Array.isArray((json as any)?.yoj) ? ((json as any).yoj as any[]) : []
        const yoj = normalizeYojMessages(raw)
        if (!cancelled) setResult({scope,messages:yoj})
      } catch (e: any) {
        if (!cancelled) setError(e?.message || String(e))
      } finally {
        if (!cancelled) setRunning(false)
      }
    }

    load()

    return () => {
      cancelled = true
      ac.abort()
    }
  }, [scope, sessionId, projectId, idToken, windowSeconds, enabled, bump])

  return { messages: result.scope === scope ? result.messages : EMPTY_MESSAGES, running, error, reload }
}
