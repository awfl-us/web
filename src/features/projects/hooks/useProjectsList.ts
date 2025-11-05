import { useCallback, useEffect, useRef, useState } from 'react'
import { makeApiClient } from '../../../api/apiClient'
import type { Project } from '../types/project'

export type UseProjectsListParams = {
  idToken?: string | null
  enabled?: boolean
  limit?: number
  order?: 'asc' | 'desc'
}

export type UseProjectsListResult = {
  projects: Project[]
  loading: boolean
  error: string | null
  reload: () => void
}

function mapAnyToProject(input: any): Project | null {
  if (!input) return null
  // Accept common shapes
  const id = input.id || input.projectId || input.key || input._id || input.uid
  if (!id || typeof id !== 'string') return null
  const name = input.name ?? input.title ?? null
  const remote = input.remote ?? input.repo ?? input.url ?? null
  return { id, name: name ?? null, remote: remote ?? null }
}

export function useProjectsList(params: UseProjectsListParams): UseProjectsListResult {
  const { idToken, enabled = true, limit, order } = params || {}
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const bump = useRef(0)

  const reload = useCallback(() => {
    bump.current++
  }, [])

  useEffect(() => {
    let cancelled = false
    const ac = new AbortController()

    async function load() {
      setError(null)
      const skipAuth = (import.meta as any)?.env?.VITE_SKIP_AUTH === '1'
      if (!enabled || (!idToken && !skipAuth)) {
        setProjects([])
        return
      }
      setLoading(true)
      try {
        const client = makeApiClient({ idToken: idToken ?? undefined, skipAuth })
        const json: any = await client.projectsList({ limit, order }, { signal: ac.signal })
        // Accept arrays or wrapped shapes
        let arr: any[] = []
        if (Array.isArray(json)) arr = json
        else if (Array.isArray(json?.items)) arr = json.items
        else if (Array.isArray(json?.projects)) arr = json.projects
        else if (Array.isArray(json?.data)) arr = json.data

        const mapped: Project[] = arr
          .map((it) => {
            try {
              return mapAnyToProject(it)
            } catch {
              return null
            }
          })
          .filter(Boolean) as Project[]

        if (!cancelled) setProjects(mapped)
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
  }, [idToken, enabled, limit, order, bump.current])

  return { projects, loading, error, reload }
}
