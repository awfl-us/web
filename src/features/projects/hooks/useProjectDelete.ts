import { useCallback, useEffect, useRef, useState } from 'react'
import { makeApiClient } from '../../../api/apiClient'

export type UseProjectDeleteParams = {
  idToken?: string | null
  enabled?: boolean
}

export type UseProjectDeleteResult = {
  remove: (id: string) => Promise<boolean>
  loading: boolean
  error: string | null
}

export function useProjectDelete(params: UseProjectDeleteParams): UseProjectDeleteResult {
  const { idToken, enabled = true } = params || {}
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inFlight = useRef<AbortController | null>(null)
  const unmounted = useRef(false)

  useEffect(() => {
    return () => {
      unmounted.current = true
      try { inFlight.current?.abort() } catch {}
    }
  }, [])

  const remove = useCallback(async (id: string) => {
    setError(null)
    const skipAuth = (import.meta as any)?.env?.VITE_SKIP_AUTH === '1'
    if (!enabled || (!idToken && !skipAuth)) {
      setError('Not authorized')
      return false
    }
    if (!id) {
      setError('Project id is required')
      return false
    }

    const ac = new AbortController()
    inFlight.current?.abort()
    inFlight.current = ac
    setLoading(true)
    try {
      const client = makeApiClient({ idToken: idToken ?? undefined, skipAuth })
      await client.projectsDelete(id, { signal: ac.signal })
      return true
    } catch (e: any) {
      if (!unmounted.current) setError(e?.message || String(e))
      return false
    } finally {
      if (!unmounted.current) setLoading(false)
    }
  }, [idToken, enabled])

  return { remove, loading, error }
}
