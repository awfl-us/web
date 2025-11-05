import { useCallback, useEffect, useMemo, useState } from 'react'
import { useToolExec } from '../../tools/useToolExec'
import { decodeEncodedResult, parseLsA1F } from '../parse'
import type { FsEntry, FsTreeNode } from '../types'

function shQuotePath(p: string) {
  const s = p || '.'
  // POSIX-safe single-quote wrapping: ' -> '\''
  return `'${s.replace(/'/g, `'\\''`)}'`
}

function ensureNode(map: Record<string, FsTreeNode>, path: string): FsTreeNode {
  if (!map[path]) {
    const name = path === '.' ? '.' : path.split('/').pop() || path
    map[path] = { path, name, expanded: false, loading: false, error: null, children: null }
  }
  return map[path]
}

export function useFsTree(params: { rootPath?: string; idToken?: string | null; enabled?: boolean }) {
  const { rootPath = '.', idToken, enabled = true } = params
  const [nodes, setNodes] = useState<Record<string, FsTreeNode>>(() => ({ [rootPath]: { path: rootPath, name: rootPath === '.' ? '.' : rootPath.split('/').pop() || rootPath, expanded: false, loading: false, error: null, children: null } }))

  const { runCommand } = useToolExec({ idToken, enabled })

  const listDir = useCallback(
    async (path: string, signal?: AbortSignal): Promise<FsEntry[]> => {
      const cmd = `ls -A1F ${shQuotePath(path)}`
      if (import.meta && (import.meta as any).env?.DEV) console.debug('[useFsTree] executing', { cmd, path })
      const resp = await runCommand(cmd, { signal })
      if (import.meta && (import.meta as any).env?.DEV) console.debug('[useFsTree] response', resp)

      const { output, error } = decodeEncodedResult(resp)
      if (import.meta && (import.meta as any).env?.DEV) console.debug('[useFsTree] decoded', { outputLen: output.length, hasError: !!error })
      if (error) throw new Error(error)

      return parseLsA1F(output, path)
    },
    [runCommand]
  )

  const load = useCallback(
    async (path: string, opts?: { signal?: AbortSignal; refresh?: boolean }) => {
      if (!enabled) return
      setNodes((prev) => {
        const copy = { ...prev }
        const node = ensureNode(copy, path)
        node.loading = true
        node.error = null
        return copy
      })
      try {
        const items = await listDir(path, opts?.signal)
        setNodes((prev) => {
          const copy = { ...prev }
          const node = ensureNode(copy, path)
          node.children = items
          node.loading = false
          node.error = null
          return copy
        })
      } catch (err: any) {
        const msg = err?.message || String(err)
        if (import.meta && (import.meta as any).env?.DEV) console.error('[useFsTree] load failed', msg, err)
        setNodes((prev) => {
          const copy = { ...prev }
          const node = ensureNode(copy, path)
          node.loading = false
          node.error = msg
          node.children = null
          return copy
        })
      }
    },
    [enabled, listDir]
  )

  const expand = useCallback(
    (path: string) => {
      setNodes((prev) => {
        const copy = { ...prev }
        const node = ensureNode(copy, path)
        node.expanded = true
        return copy
      })
      // Load children on first expand
      const node = nodes[path]
      if (!node || node.children == null) {
        load(path)
      }
    },
    [load, nodes]
  )

  const collapse = useCallback((path: string) => {
    setNodes((prev) => {
      const copy = { ...prev }
      const node = ensureNode(copy, path)
      node.expanded = false
      return copy
    })
  }, [])

  const toggle = useCallback(
    (path: string) => {
      const node = nodes[path]
      if (!node || !node.expanded) expand(path)
      else collapse(path)
    },
    [nodes, expand, collapse]
  )

  const refresh = useCallback((path: string) => load(path, { refresh: true }), [load])

  useEffect(() => {
    if (!enabled) return
    // Auto-expand root on first enable
    const root = nodes[rootPath]
    if (root && !root.expanded) {
      expand(rootPath)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, rootPath])

  return useMemo(
    () => ({ nodes, expand, collapse, toggle, refresh, rootPath }),
    [nodes, expand, collapse, toggle, refresh, rootPath]
  )
}
