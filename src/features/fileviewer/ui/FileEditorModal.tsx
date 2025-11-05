import React, { useEffect, useMemo, useRef, useState } from 'react'

export type FileEditorModalProps = {
  open: boolean
  path?: string | null
  initialContent?: string
  onClose: () => void
  onSave?: (content: string, path?: string | null) => Promise<void> | void
  load?: (path: string, signal: AbortSignal) => Promise<{ content: string }>
  readOnly?: boolean
}

export function FileEditorModal({ open, path, initialContent = '', onClose, onSave, load, readOnly = true }: FileEditorModalProps) {
  const [content, setContent] = useState<string>(initialContent)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  useEffect(() => {
    if (!open) return
    if (!path) return
    if (!load) return
    const ac = new AbortController()
    ;(async () => {
      try {
        setLoading(true)
        setError(null)
        const res = await load(path, ac.signal)
        if (!mountedRef.current) return
        setContent(res?.content ?? '')
      } catch (e: any) {
        if (!mountedRef.current) return
        setError(e?.message || String(e))
      } finally {
        if (mountedRef.current) setLoading(false)
      }
    })()
    return () => ac.abort()
  }, [open, path, load])

  useEffect(() => {
    if (!open) setContent(initialContent)
  }, [open, initialContent])

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: 'min(960px, 92vw)', height: 'min(70vh, 720px)', background: 'white',
          borderRadius: 8, boxShadow: '0 10px 25px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ padding: '10px 12px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: 8 }}>
          <strong style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 12 }}>{path || '—'}</strong>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
            {loading && <span style={{ fontSize: 12, color: '#6b7280' }}>Loading…</span>}
            {error && <span style={{ fontSize: 12, color: '#ef4444' }}>Error: {error}</span>}
            {!readOnly && onSave && (
              <button
                onClick={() => onSave(content, path)}
                style={{ padding: '6px 10px', background: '#111827', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}
              >
                Save
              </button>
            )}
            <button onClick={onClose} style={{ padding: '6px 10px', background: 'transparent', border: '1px solid #d1d5db', borderRadius: 4, cursor: 'pointer' }}>Close</button>
          </div>
        </div>
        <div style={{ flex: 1, minHeight: 0 }}>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            readOnly={readOnly}
            spellCheck={false}
            style={{ width: '100%', height: '100%', border: 'none', outline: 'none', resize: 'none', padding: 12, boxSizing: 'border-box',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 12, lineHeight: 1.5 }}
          />
        </div>
      </div>
    </div>
  )
}

export default FileEditorModal
