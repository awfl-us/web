import React from 'react'

export function ErrorBanner(props: {
  children: React.ReactNode
  variant?: 'soft' | 'strong'
  style?: React.CSSProperties
}) {
  const { children, variant = 'soft', style } = props
  const base = {
    color: '#b91c1c',
    padding: 8,
    borderRadius: 6,
    textAlign: 'left' as const,
    border: '1px solid #fecaca',
    background: variant === 'strong' ? '#fee2e2' : '#fef2f2',
  }
  return (
    <div role="alert" aria-live="polite" style={{ ...base, ...(style || {}) }}>
      {children}
    </div>
  )
}
