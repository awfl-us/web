import { useEffect, useMemo, useRef, useState } from 'react'
import type { WorkflowSelectorProps } from './types'

function groupByDash(names: string[]): Array<{ group: string; items: string[] }> {
  const map = new Map<string, string[]>()
  for (const n of names) {
    const key = n.includes('-') ? n.split('-')[0] : 'other'
    const arr = map.get(key) || []
    arr.push(n)
    map.set(key, arr)
  }
  const groups: Array<{ group: string; items: string[] }> = []
  for (const [group, items] of map.entries()) {
    groups.push({ group, items: items.sort((a, b) => a.localeCompare(b)) })
  }
  return groups.sort((a, b) => a.group.localeCompare(b.group))
}

export function WorkflowSelector({ workflows, value, onChange, placeholder = 'Select a workflow…', disabled, loading, style }: WorkflowSelectorProps) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const valueInputRef = useRef<HTMLInputElement | null>(null)
  const filterInputRef = useRef<HTMLInputElement | null>(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return workflows
    return workflows.filter(w => w.toLowerCase().includes(q))
  }, [workflows, query])

  const groups = useMemo(() => groupByDash(filtered), [filtered])

  // Close on outside mousedown
  useEffect(() => {
    function handleDocMouseDown(e: MouseEvent) {
      if (!open) return
      const el = containerRef.current
      if (!el) return
      const target = e.target as Node | null
      if (target && el.contains(target)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', handleDocMouseDown)
    return () => document.removeEventListener('mousedown', handleDocMouseDown)
  }, [open])

  function commitSelection(name: string) {
    onChange(name)
    setOpen(false)
    setQuery('')
  }

  return (
    <div ref={containerRef} style={{ display: 'grid', gap: 6, position: 'relative', ...style }}>
      <input
        ref={valueInputRef}
        type="text"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            setOpen(false)
            return
          }
          if (e.key === 'Enter') {
            const v = (e.currentTarget.value || '').trim()
            if (v && workflows.includes(v)) {
              e.preventDefault()
              commitSelection(v)
            }
          }
        }}
        placeholder={placeholder}
        disabled={disabled}
        style={{
          border: '1px solid #e5e7eb',
          borderRadius: 6,
          padding: '8px 10px',
          outline: 'none',
          background: disabled ? '#f3f4f6' : '#fff',
        }}
      />
      <input
        ref={filterInputRef}
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Filter…"
        disabled={disabled}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            setOpen(false)
            return
          }
          if (e.key === 'Enter') {
            if (filtered.length > 0) {
              e.preventDefault()
              commitSelection(filtered[0])
            }
          }
        }}
        style={{
          border: '1px solid #e5e7eb',
          borderRadius: 6,
          padding: '6px 8px',
          outline: 'none',
          background: disabled ? '#f3f4f6' : '#fff',
        }}
      />
      {open && !disabled ? (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            zIndex: 10,
            background: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: 6,
            marginTop: 4,
            maxHeight: 220,
            overflow: 'auto',
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          }}
        >
          {loading ? (
            <div style={{ padding: 8, color: '#6b7280' }}>Loading workflows…</div>
          ) : groups.length === 0 ? (
            <div style={{ padding: 8, color: '#6b7280' }}>No workflows</div>
          ) : (
            groups.map(g => (
              <div key={g.group} style={{ padding: 6, borderTop: '1px solid #f3f4f6' }}>
                <div style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.4, padding: '4px 6px' }}>{g.group}</div>
                <div style={{ display: 'grid' }}>
                  {g.items.map(name => (
                    <button
                      key={name}
                      onMouseDown={(e) => {
                        // Commit on mousedown to avoid focus transfer to the item and prevent re-open
                        e.preventDefault()
                        commitSelection(name)
                      }}
                      style={{
                        textAlign: 'left',
                        padding: '6px 8px',
                        background: name === value ? '#eff6ff' : 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      {name}
                    </button>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      ) : null}
    </div>
  )
}
