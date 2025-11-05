import React from 'react'
import type { ToolItem } from './types'

export type ToolSelectorProps = {
  tools: ToolItem[]
  value: string[]
  onChange: (next: string[]) => void
}

export function ToolSelector({ tools, value, onChange }: ToolSelectorProps) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
        gap: 8,
        border: '1px solid #e5e7eb',
        borderRadius: 8,
        padding: 8,
        maxHeight: 300,
        overflow: 'auto',
      }}
    >
      {tools.map((t, i) => {
        const name = t.function?.name || ''
        const desc = t.function?.description || ''
        const checked = value.includes(name)
        return (
          <label key={`${name}:${i}`} style={{ display: 'grid', gridTemplateColumns: '20px 1fr', alignItems: 'start', gap: 8, padding: 6, borderRadius: 6, background: checked ? '#f1f5f9' : 'transparent' }}>
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => {
                const next = new Set(value)
                if (e.target.checked) next.add(name)
                else next.delete(name)
                onChange(Array.from(next))
              }}
            />
            <div>
              <div style={{ fontWeight: 500 }}>{name}</div>
              {desc ? <div style={{ fontSize: 12, color: '#6b7280' }}>{desc}</div> : null}
            </div>
          </label>
        )
      })}
    </div>
  )
}
