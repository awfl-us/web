import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useToolExec } from '../../tools/useToolExec'
import { parseLsA1F, decodeEncodedResult } from '../parse'
import type { FsEntry, FsListResult } from '../types'

function shQuotePath(p: string) {
  const s = p || '.'
  // POSIX-safe single-quote wrapping
  return `'${s.replace(/'/g, `'\\''`)}'`
}

export function useFsList(params: { path?: string; idToken?: string | null; enabled?: boolean }) {
  const { path = '.', idToken, enabled = true } = params
  const [state, setState] = useState<{ loading: boolean; error: string | null; data: FsListResult | null }>({ loading: false, error: null, data: null })
  const bumpRef = useRef(0)
  const bump = useCallback(() => {
    bumpRef.current += 1
    setState((s) => ({ ...s }))
  }, [])

  const { runCommand } = useToolExec({ idToken, enabled })

  const load = useCallback(async (signal?: AbortSignal) => {
    const target = path || '.'
    const cmd = `ls -A1F ${shQuotePath(target)}`
    if (import.meta && (import.meta as any).env?.DEV) console.debug('[useFsList] executing', { cmd, target })
    const resp = await runCommand(cmd, { signal })
    if (import.meta && (import.meta as any).env?.DEV) console.debug('[useFsList] response', resp)

    const { output, error } = decodeEncodedResult(resp)
    if (import.meta && (import.meta as any).env?.DEV) console.debug('[useFsList] decoded', { outputLen: output.length, hasError: !!error })
    if (error) throw new Error(error)

    const items: FsEntry[] = parseLsA1F(output, target)
    if (import.meta && (import.meta as any).env?.DEV) console.debug('[useFsList] parsed items', { count: items.length, sample: items.slice(0, 5) })

    return { path: target, items } as FsListResult
  }, [path, runCommand])

  useEffect(() => {
    if (!enabled) {
      setState({ loading: false, error: null, data: null })
      return
    }
    let alive = true
    const ac = new AbortController()
    setState((s) => ({ ...s, loading: true, error: null }))
    load(ac.signal)
      .then((data) => {
        if (!alive) return
        setState({ loading: false, error: null, data })
      })
      .catch((err) => {
        if (!alive) return
        const msg = err?.message || String(err)
        if (import.meta && (import.meta as any).env?.DEV) console.error('[useFsList] load failed', msg, err)
        setState({ loading: false, error: msg, data: null })
      })
    return () => {
      alive = false
      ac.abort()
    }
  }, [enabled, load, path, bumpRef.current])

  const reload = useCallback(() => {
    if (import.meta && (import.meta as any).env?.DEV) console.debug('[useFsList] reload')
    bump()
  }, [bump])

  return useMemo(() => ({ ...state, reload }), [state, reload])
}
