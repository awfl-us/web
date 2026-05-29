import React, { useEffect, useMemo, useRef, useState } from 'react'

export type ChevronDirection = 'down' | 'up'

export function ChevronIcon({ direction = 'down', size = 12 }: { direction?: ChevronDirection; size?: number }) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'inline-block' }}
    >
      {direction === 'down' ? (
        <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      ) : (
        <path d="M5 12.5L10 7.5L15 12.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      )}
    </svg>
  )
}

export interface CollapsibleProps {
  children: React.ReactNode
  maxHeight?: number
  expanded?: boolean
  defaultExpanded?: boolean
  onExpandedChange?: (expanded: boolean) => void
}

// Small helper to render collapsible content for very tall messages
export function Collapsible(props: CollapsibleProps) {
  const { children, maxHeight = 320, expanded, defaultExpanded = false, onExpandedChange } = props
  const contentRef = useRef<HTMLDivElement | null>(null)
  const [isOverflowing, setIsOverflowing] = useState(false)
  const [internalExpanded, setInternalExpanded] = useState(defaultExpanded)

  const isControlled = typeof expanded === 'boolean'
  const resolvedExpanded = isControlled ? !!expanded : internalExpanded

  useEffect(() => {
    if (!isControlled) setInternalExpanded(defaultExpanded)
  }, [defaultExpanded, isControlled])

  useEffect(() => {
    const el = contentRef.current
    if (!el) return
    const check = () => {
      const over = el.scrollHeight > maxHeight + 2
      setIsOverflowing(over)
    }
    check()
    const ro = new ResizeObserver(() => check())
    ro.observe(el)
    return () => ro.disconnect()
  }, [maxHeight, children, resolvedExpanded])

  const containerStyle: React.CSSProperties = useMemo(
    () => ({
      position: 'relative',
      maxHeight: resolvedExpanded ? 'none' : maxHeight,
      overflow: resolvedExpanded ? 'visible' : 'hidden',
    }),
    [resolvedExpanded, maxHeight]
  )

  function setExpandedState(next: boolean) {
    contentRef.current?.dispatchEvent(new CustomEvent('awfl:user-content-expand', { bubbles: true }))
    if (!isControlled) setInternalExpanded(next)
    onExpandedChange?.(next)
  }

  function toggle() {
    setExpandedState(!resolvedExpanded)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div ref={contentRef} style={containerStyle}>
        {children}
        {!resolvedExpanded && isOverflowing ? (
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: 64,
              background: 'linear-gradient(180deg, rgba(255,255,255,0) 0%, rgba(255,255,255,1) 60%)',
              pointerEvents: 'none',
            }}
          />
        ) : null}
      </div>
      {isOverflowing ? (
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <button
            type="button"
            aria-expanded={resolvedExpanded}
            aria-label={resolvedExpanded ? 'Collapse' : 'Expand'}
            title={resolvedExpanded ? 'Collapse' : 'Expand'}
            onClick={toggle}
            style={{
              padding: 4,
              width: 26,
              height: 26,
              borderRadius: 9999,
              border: '1px solid #d1d5db',
              background: '#f3f4f6',
              color: '#374151',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              lineHeight: 1,
            }}
            onMouseEnter={(e) => {
              ;(e.currentTarget as HTMLButtonElement).style.background = '#e5e7eb'
            }}
            onMouseLeave={(e) => {
              ;(e.currentTarget as HTMLButtonElement).style.background = '#f3f4f6'
            }}
          >
            {resolvedExpanded ? <ChevronIcon direction="up" /> : <ChevronIcon direction="down" />}
          </button>
        </div>
      ) : null}
    </div>
  )
}
