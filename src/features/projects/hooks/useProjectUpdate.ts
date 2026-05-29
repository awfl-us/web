import { useCallback, useEffect, useRef, useState } from 'react'
import { makeApiClient } from '../../../api/apiClient'
import type { Project } from '../types/project'

export type UseProjectUpdateParams = {
  idToken?: string | null
  enabled?: boolean
}

export type UseProjectUpdateResult = {
  update: (id: string, input: { name?: string | null; remote?: string | null; live?: boolean | null }) => Promise<Project | null>
  loading: boolean
  error: string | null
}

function mapAnyToProject(input: any): Project | null {
  if (!input) return null
  const id = input.id || input.projectId || input.key || input._id || input.uid
  if (!id || typeof id !== 'string') return null
  const name = input.name ?? input.title ?? null
  const remote = input.remote ?? input.repo ?? input.url ?? null
  return { id, name: name ?? null, remote: remote ?? null }
}

export function useProjectUpdate(params: UseProjectUpdateParams): UseProjectUpdateResult {
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

  const update = useCallback(async (id: string, input: { name?: string | null; remote?: string | null; live?: boolean | null }) => {
    setError(null)
    const skipAuth = (import.meta as any)?.env?.VITE_SKIP_AUTH === '1'
    if (!enabled || (!idToken && !skipAuth)) {
      setError('Not authorized')
      return null
    }
    if (!id) {
      setError('Project id is required')
      return null
    }

    const ac = new AbortController()
    inFlight.current?.abort()
    inFlight.current = ac
    setLoading(true)
    try {
      const client = makeApiClient({ idToken: idToken ?? undefined, skipAuth })
      const json: any = await client.projectsUpdate(id, input || {}, { signal: ac.signal })
      const projObj = (json && typeof json === 'object') ? (json.project && typeof json.project === 'object' ? json.project : json) : null
      return mapAnyToProject(projObj)
    } catch (e: any) {
      if (!unmounted.current) setError(e?.message || String(e))
      return null
    } finally {
      if (!unmounted.current) setLoading(false)
    }
  }, [idToken, enabled])

  return { update, loading, error }
}
