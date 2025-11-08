import { useCallback, useEffect, useRef, useState } from 'react'
import { makeApiClient } from '../api/apiClient'
import type { GitConfig } from '../types/git'

export type UseGitIntegrationParams = {
  idToken?: string | null
  projectId?: string | null
  enabled?: boolean
}

export type UseGitIntegrationResult = {
  config: GitConfig | null
  loading: boolean
  saving: boolean
  testing: boolean
  error: string | null
  reload: () => void
  save: (input: { owner?: string; repo?: string; defaultBranch?: string; token?: string }) => Promise<void>
  remove: () => Promise<void>
  test: (ref?: string) => Promise<any>
}

export function useGitIntegration(params: UseGitIntegrationParams): UseGitIntegrationResult {
  const { idToken, projectId, enabled = true } = params

  const [config, setConfig] = useState<GitConfig | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const bump = useRef(0)

  const reload = useCallback(() => {
    bump.current++
  }, [])

  const canRun = !!projectId && (!!idToken || (import.meta as any)?.env?.VITE_SKIP_AUTH === '1') && enabled

  useEffect(() => {
    let cancelled = false
    const ac = new AbortController()

    async function load() {
      setError(null)
      if (!canRun) {
        setConfig(null)
        return
      }
      setLoading(true)
      try {
        const client = makeApiClient({ idToken: idToken ?? undefined, skipAuth: (import.meta as any)?.env?.VITE_SKIP_AUTH === '1' })
        const json = await client.gitConfigGet(projectId!, { signal: ac.signal })
        if (!cancelled) setConfig(json as GitConfig)
      } catch (e: any) {
        if (!cancelled) setError(e?.message || String(e))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()

    return () => {
      cancelled = true
      ac.abort()
    }
  }, [projectId, idToken, enabled, bump.current])

  const save = useCallback(async (input: { owner?: string; repo?: string; defaultBranch?: string; token?: string }) => {
    if (!projectId) throw new Error('projectId is required')
    setSaving(true)
    setError(null)
    try {
      const client = makeApiClient({ idToken: idToken ?? undefined, skipAuth: (import.meta as any)?.env?.VITE_SKIP_AUTH === '1' })
      await client.gitConfigPut({ projectId, ...input })
      // Refresh after save
      const refreshed = await client.gitConfigGet(projectId)
      setConfig(refreshed as GitConfig)
    } catch (e: any) {
      setError(e?.message || String(e))
      throw e
    } finally {
      setSaving(false)
    }
  }, [projectId, idToken])

  const remove = useCallback(async () => {
    if (!projectId) throw new Error('projectId is required')
    setSaving(true)
    setError(null)
    try {
      const client = makeApiClient({ idToken: idToken ?? undefined, skipAuth: (import.meta as any)?.env?.VITE_SKIP_AUTH === '1' })
      await client.gitConfigDelete(projectId)
      setConfig(null)
    } catch (e: any) {
      setError(e?.message || String(e))
      throw e
    } finally {
      setSaving(false)
    }
  }, [projectId, idToken])

  const test = useCallback(async (ref?: string) => {
    if (!projectId) throw new Error('projectId is required')
    setTesting(true)
    setError(null)
    try {
      const client = makeApiClient({ idToken: idToken ?? undefined, skipAuth: (import.meta as any)?.env?.VITE_SKIP_AUTH === '1' })
      const json = await client.gitTree({ projectId, ref: ref || config?.defaultBranch || 'main' })
      return json
    } catch (e: any) {
      setError(e?.message || String(e))
      throw e
    } finally {
      setTesting(false)
    }
  }, [projectId, idToken, config?.defaultBranch])

  return { config, loading, saving, testing, error, reload, save, remove, test }
}
