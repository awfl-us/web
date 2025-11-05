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

// Small helper to render collapsible content for very tall messages
export function Collapsible(props: { children: React.ReactNode; maxHeight?: number }) {
  const { children, maxHeight = 320 } = props
  const contentRef = useRef<HTMLDivElement | null>(null)
  const [isOverflowing, setIsOverflowing] = useState(false)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    const el = contentRef.current
    if (!el) return
    const check = () => {
      const over = el.scrollHeight > maxHeight + 2 // small epsilon
      setIsOverflowing(over)
    }
    check()
    // Re-check on resize in case fonts/layout change
    const ro = new ResizeObserver(() => check())
    ro.observe(el)
    return () => ro.disconnect()
  }, [maxHeight])

  const containerStyle: React.CSSProperties = useMemo(
    () => ({
      position: 'relative',
      maxHeight: expanded ? 'none' : maxHeight,
      overflow: expanded ? 'visible' : 'hidden',
    }),
    [expanded, maxHeight]
  )

  function toggle() {
    // Dispatch a bubbling event so scroll containers can treat this as a user interaction
    contentRef.current?.dispatchEvent(new CustomEvent('awfl:user-content-expand', { bubbles: true }))
    setExpanded(v => !v)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div ref={contentRef} style={containerStyle}>
        {children}
        {!expanded && isOverflowing ? (
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
            aria-expanded={expanded}
            aria-label={expanded ? 'Collapse' : 'Expand'}
            title={expanded ? 'Collapse' : 'Expand'}
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
              (e.currentTarget as HTMLButtonElement).style.background = '#e5e7eb'
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = '#f3f4f6'
            }}
          >
            {expanded ? <ChevronIcon direction="up" /> : <ChevronIcon direction="down" />}
          </button>
        </div>
      ) : null}
    </div>
  )
}
