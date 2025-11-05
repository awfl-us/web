import { useCallback, useRef, useState } from 'react'
import { useWorkflowExec } from '../../core/public'

export type PlainifyHelpers = { onItemDone?: (p: string) => void }

export function usePlainify({
  sessionId,
  idToken,
  enabled,
}: {
  sessionId?: string | null
  idToken?: string | null
  enabled?: boolean
}) {
  const { start } = useWorkflowExec({ sessionId: sessionId || undefined, idToken, enabled: !!enabled && !!sessionId })

  const [pendingCount, setPendingCount] = useState(0)
  const [errorCount, setErrorCount] = useState(0)
  const lastErrorRef = useRef<unknown>(null)

  const plainify = useCallback(
    (paths: string[], helpers?: PlainifyHelpers) => {
      if (!paths?.length) return
      setPendingCount((prev) => prev + paths.length)
      for (const p of paths) {
        Promise.resolve()
          .then(() => start('codebase-workflows-PlainifyWriteHook', { filepath: p }))
          .catch((err: unknown) => {
            lastErrorRef.current = err
            setErrorCount((c) => c + 1)
          })
          .finally(() => {
            try {
              helpers?.onItemDone?.(p)
            } catch {}
            setPendingCount((prev) => Math.max(0, prev - 1))
          })
      }
    },
    [start]
  )

  const dismissErrors = useCallback(() => {
    lastErrorRef.current = null
    setErrorCount(0)
  }, [])

  return {
    pendingCount,
    plainify,
    errorCount,
    lastError: lastErrorRef.current,
    dismissErrors,
  }
}
