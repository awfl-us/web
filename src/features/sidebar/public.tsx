import React from 'react'

export type SidebarNavItem = {
  key: string
  label: string
  title?: string
}

export function SidebarNav({
  items,
  selectedKey,
  onSelect,
  width = 48,
}: {
  items: SidebarNavItem[]
  selectedKey: string
  onSelect: (key: string) => void
  width?: number
}) {
  return (
    <nav
      aria-label="Primary navigation"
      style={{
        width,
        minWidth: width,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        padding: 8,
        borderRight: '1px solid #e5e7eb',
        boxSizing: 'border-box',
      }}
    >
      {items.map((item) => {
        const active = item.key === selectedKey
        return (
          <button
            key={item.key}
            title={item.title || item.label}
            onClick={() => onSelect(item.key)}
            style={{
              height: 32,
              border: 'none',
              borderRadius: 6,
              background: active ? '#111827' : 'transparent',
              color: active ? '#ffffff' : '#374151',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            <span style={{ fontSize: 12, fontWeight: 600 }}>{item.label}</span>
          </button>
        )
      })}
    </nav>
  )
}

export default SidebarNav
