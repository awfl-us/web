import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { makeApiClient } from '../../../api/apiClient'

export type UseSessionModelParams = {
  sessionId: string | null
  enabled?: boolean
  idToken?: string | null
}

export type ModelOption = {
  value: string
  label: string
  title?: string
}

export type UseSessionModelResult = {
  model: string
  setModel: (m: string) => void
  options: ModelOption[]
}

const DEFAULT_MODEL = 'gpt-5'
const DEFAULT_OPTIONS: ModelOption[] = [
  { value: 'gpt-5', label: 'GPT-5' },
  { value: 'gpt-4.1', label: 'GPT-4.1' },
  { value: 'gpt-4o', label: 'GPT-4o' },
]

function keyFor(sessionId: string | null) {
  return sessionId ? `session:model:${sessionId}` : `session:model:__none__`
}

function prettyLabel(id: string): string {
  // Minimal prettifier; keep known mappings and otherwise return id
  const map: Record<string, string> = {
    'gpt-5': 'GPT-5',
    'gpt-4.1': 'GPT-4.1',
    'gpt-4o': 'GPT-4o',
    'o3-mini': 'o3-mini',
  }
  if (map[id]) return map[id]
  // Common title-cases for families
  if (id.startsWith('claude-3')) return id.replace(/^claude-3\.?/i, 'Claude 3 ').replace(/-/g, ' ').trim()
  if (id.startsWith('gemini-')) return id.replace(/^gemini-/i, 'Gemini ').replace(/-/g, ' ').trim()
  if (id.startsWith('llama')) return id.replace(/-/g, ' ').replace(/\b(\d+)b\b/i, '$1B')
  return id
}

function formatPricing(p: any): string | null {
  if (!p || typeof p !== 'object') return null
  const inK = (n: any) => (typeof n === 'number' ? `$${n.toFixed(4)}/1k` : null)
  const pin = inK((p.input ?? p.prompt ?? p.in) as any)
  const pout = inK((p.output ?? p.completion ?? p.out) as any)
  if (pin && pout) return `in ${pin}, out ${pout}`
  if (pin) return `in ${pin}`
  if (pout) return `out ${pout}`
  return null
}

export function useSessionModel(params: UseSessionModelParams): UseSessionModelResult {
  const { sessionId, enabled = true, idToken } = params || {}

  const [model, setModelState] = useState<string>(DEFAULT_MODEL)
  const [options, setOptions] = useState<ModelOption[]>(DEFAULT_OPTIONS)
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
        // Only accept known defaults here; later we re-validate against full options after fetch
        const exists = DEFAULT_OPTIONS.some((o) => o.value === val)
        setModelState(exists ? val : DEFAULT_MODEL)
      } else {
        setModelState(DEFAULT_MODEL)
      }
    } catch {
      setModelState(DEFAULT_MODEL)
    }
  }, [sessionId, enabled])

  // Fetch available models from server and merge with defaults
  useEffect(() => {
    let cancelled = false
    const ac = new AbortController()

    async function load() {
      const skipAuth = (import.meta as any)?.env?.VITE_SKIP_AUTH === '1'
      if (!enabled) return
      if (!idToken && !skipAuth) {
        // unauthenticated; keep defaults
        setOptions(DEFAULT_OPTIONS)
        return
      }

      try {
        const client = makeApiClient({ idToken: idToken ?? undefined, skipAuth })
        const json: any = await client.llmModels({ signal: ac.signal })

        // Build provider lookup per model from multiple possible shapes
        const providerByModel: Record<string, string> = {}
        try {
          const infer = json?.inference
          if (infer && typeof infer === 'object') {
            Object.keys(infer).forEach((prov) => {
              const arr = (infer as any)[prov]
              if (Array.isArray(arr)) arr.forEach((m: any) => { if (typeof m === 'string') providerByModel[m] = prov })
            })
          }
          const known = json?.known_models
          if (Array.isArray(known)) {
            known.forEach((it: any) => {
              if (typeof it === 'string') providerByModel[it] = providerByModel[it] || (json?.providers?.default || '')
              else if (it && typeof it === 'object') {
                const name = it.id || it.name || it.model || it.value
                const prov = it.provider || it.vendor || it.source
                if (typeof name === 'string' && typeof prov === 'string') providerByModel[name] = prov
              }
            })
          }
        } catch {}

        const maxTokens: Record<string, number> = (json?.max_tokens && typeof json.max_tokens === 'object') ? json.max_tokens : {}
        const pricing: Record<string, any> = (json?.pricing && typeof json.pricing === 'object') ? json.pricing : {}

        // Compose set of models from defaults + server
        const serverModels: string[] = []
        if (Array.isArray(json?.known_models)) {
          json.known_models.forEach((it: any) => {
            const id = typeof it === 'string' ? it : (it?.id || it?.name || it?.model || it?.value)
            if (typeof id === 'string') serverModels.push(id)
          })
        } else if (json?.inference && typeof json.inference === 'object') {
          Object.values(json.inference as Record<string, any>).forEach((arr: any) => {
            if (Array.isArray(arr)) arr.forEach((m: any) => { if (typeof m === 'string') serverModels.push(m) })
          })
        }

        const seen = new Set<string>()
        const mergedIds: string[] = []
        // Keep defaults in front
        DEFAULT_OPTIONS.forEach((o) => { if (!seen.has(o.value)) { seen.add(o.value); mergedIds.push(o.value) } })
        serverModels.forEach((m) => { if (!seen.has(m)) { seen.add(m); mergedIds.push(m) } })

        const mergedOptions: ModelOption[] = mergedIds.map((id) => {
          const prov = providerByModel[id] || null
          const mt = typeof maxTokens[id] === 'number' ? maxTokens[id] : null
          const pr = pricing[id] || null
          const pricingText = formatPricing(pr)
          const parts: string[] = []
          if (prov) parts.push(`Provider: ${prov}`)
          if (mt) parts.push(`Max tokens: ${mt}`)
          if (pricingText) parts.push(`Pricing: ${pricingText}`)
          const title = parts.length ? parts.join(' \u2022 ') : undefined
          return { value: id, label: prettyLabel(id), title }
        })

        if (!cancelled && mounted.current) setOptions(mergedOptions)
      } catch (e) {
        // Keep defaults on error
        if (!cancelled && mounted.current) setOptions(DEFAULT_OPTIONS)
      }
    }

    load()

    return () => {
      cancelled = true
      ac.abort()
    }
  }, [idToken, enabled])

  // Ensure current model remains valid once options settle
  useEffect(() => {
    const exists = options.some((o) => o.value === model)
    if (!exists) setModelState(DEFAULT_MODEL)
  }, [options, model])

  const setModel = useCallback((m: string) => {
    const val = (options.some((o) => o.value === m) ? m : DEFAULT_MODEL)
    setModelState(val)
    try {
      const k = keyFor(sessionId)
      if (typeof window !== 'undefined') window.localStorage.setItem(k, val)
    } catch {
      // ignore storage errors
    }
  }, [sessionId, options])

  const opts = useMemo(() => options, [options])

  return { model, setModel, options: opts }
}
