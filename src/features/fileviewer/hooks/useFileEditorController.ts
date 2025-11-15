import { useCallback, useMemo, useState } from 'react'
import { useToolExec } from '../../tools/public'

function shQuotePath(p: string) {
  const s = p || '.'
  return `'${s.replace(/'/g, `'\\''`)}'`
}

function decodeCliResult(resp: any): { output: string; error: string } {
  try {
    const enc = resp?.result?.encoded
    if (typeof enc !== 'string') return { output: '', error: '' }
    const parsed = JSON.parse(enc)
    const output = typeof parsed?.output === 'string' ? parsed.output : ''
    const error = typeof parsed?.error === 'string' ? parsed.error : ''
    return { output, error }
  } catch {
    return { output: '', error: '' }
  }
}

export function useFileEditorController(params: { idToken?: string | null; enabled?: boolean; sessionId?: string | null }) {
  const { idToken, enabled = true } = params
  const { runCommand } = useToolExec({ idToken, enabled })

  const [open, setOpen] = useState(false)
  const [path, setPath] = useState<string | null>(null)

  const openFile = useCallback((p: string) => {
    setPath(p)
    setOpen(true)
  }, [])

  const close = useCallback(() => setOpen(false), [])

  const load = useCallback(
    async (p: string, signal: AbortSignal) => {
      const cmd = `cat ${shQuotePath(`plain/${p}`)}`
      const resp = await runCommand(cmd, { signal })
      const { output, error } = decodeCliResult(resp)
      if (error) throw new Error(error)
      return { content: output }
    },
    [runCommand]
  )

  const save = useCallback(
    async (content: string, p?: string | null) => {
      if (!p) return
      let b64 = ''
      try {
        b64 = btoa(unescape(encodeURIComponent(content)))
      } catch {
        b64 = btoa(content)
      }
      const cmd = `echo ${shQuotePath(b64)} | base64 -d > ${shQuotePath(`plain/${p}`)}`
      const resp = await runCommand(cmd)
      const { error } = decodeCliResult(resp)
      if (error) throw new Error(error)
    },
    [runCommand]
  )

  return useMemo(
    () => ({ opened: open, path, open: openFile, close, load, save }),
    [open, path, openFile, close, load, save]
  )
}
