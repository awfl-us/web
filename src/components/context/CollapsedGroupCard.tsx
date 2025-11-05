import React, { useEffect, useRef, useState } from 'react'
import { makeApiClient } from '../../api/apiClient'
import { normalizeGroup } from '../../utils/collapse'
import { ChevronIcon } from '../common/Collapsible'

export function CollapsedGroupCard(props: {
  sessionId?: string
  idToken?: string
  label: string
  description?: string | null
  responseId?: string | null
  defaultExpanded?: boolean
  children?: React.ReactNode
}) {
  const { sessionId, idToken, label, description, responseId, defaultExpanded = false, children } = props
  const env: any = (import.meta as any)?.env
  const skipAuth = !!env?.VITE_SKIP_AUTH

  // Optimistic UI override; server is the single source of truth.
  // resolvedExpanded = optimistic ?? defaultExpanded
  const [optimistic, setOptimistic] = useState<boolean | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const sendTimerRef = useRef<number | null>(null)
  const lastSentRef = useRef<boolean | null>(null)

  const resolvedExpanded = optimistic != null ? optimistic : !!defaultExpanded

  // When server state catches up to our optimistic override, drop the override
  useEffect(() => {
    if (optimistic == null) return
    if (defaultExpanded === optimistic) {
      setOptimistic(null)
    }
  }, [defaultExpanded, optimistic])

  function postState(target: boolean) {
    if (!sessionId || !label) return
    if (!idToken && !skipAuth) return
    // Avoid re-sending identical value
    if (lastSentRef.current === target) return

    const api = makeApiClient({ idToken, skipAuth })
    api
      .collapseStateSet({ sessionId, group: normalizeGroup(label), expanded: target, responseId: responseId || undefined })
      .then(() => {
        lastSentRef.current = target
      })
      .catch((err: any) => {
        const status = err?.httpStatus || err?.status || err?.response?.status
        if (status === 400 || status === 401) {
          // Revert optimistic override; show a brief message
          setOptimistic(null)
          setToast('Could not update state. Please sign in again.')
          setTimeout(() => setToast(null), 2000)
        }
        // swallow other errors
      })
  }

  function schedulePost(target: boolean) {
    if (sendTimerRef.current) {
      window.clearTimeout(sendTimerRef.current)
      sendTimerRef.current = null
    }
    // Debounce to coalesce rapid toggles
    sendTimerRef.current = window.setTimeout(() => {
      postState(target)
    }, 200)
  }

  function toggle() {
    // Treat this user action as a signal to the scroll container not to auto-scroll
    rootRef.current?.dispatchEvent(new CustomEvent('awfl:user-content-expand', { bubbles: true }))
    const next = !resolvedExpanded
    setOptimistic(next)
    schedulePost(next)
  }

  useEffect(() => () => {
    if (sendTimerRef.current) {
      window.clearTimeout(sendTimerRef.current)
      sendTimerRef.current = null
    }
  }, [])

  const bg = '#eef2ff'
  const border = '#c7d2fe'
  const labelColor = '#4338ca'

  return (
    <div
      ref={rootRef}
      style={{
        background: bg,
        border: `1px solid ${border}`,
        borderRadius: 8,
        padding: 10,
        width: '100%',
        maxWidth: '100%',
        boxSizing: 'border-box',
        textAlign: 'left',
        overflowX: 'hidden',
        minWidth: 0,
        position: 'relative',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: labelColor }}>
          {normalizeGroup(label)}
        </div>
        <button
          type="button"
          onClick={toggle}
          aria-pressed={resolvedExpanded}
          aria-label={resolvedExpanded ? 'Collapse group' : 'Expand group'}
          title={resolvedExpanded ? 'Collapse group' : 'Expand group'}
          style={{
            fontSize: 12,
            fontWeight: 600,
            borderRadius: 6,
            border: '1px solid #d1d5db',
            background: resolvedExpanded ? '#dcfce7' : '#f3f4f6',
            color: '#111827',
            padding: '4px 6px',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            lineHeight: 1,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = resolvedExpanded ? '#bbf7d0' : '#e5e7eb'
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = resolvedExpanded ? '#dcfce7' : '#f3f4f6'
          }}
        >
          <ChevronIcon direction={resolvedExpanded ? 'up' : 'down'} size={12} />
        </button>
      </div>
      {description ? (
        <div style={{ marginTop: 6, fontSize: 12, color: '#374151' }}>{description}</div>
      ) : null}

      {resolvedExpanded && children ? (
        <div
          style={{
            marginTop: 10,
            background: '#ffffff',
            border: '1px solid #e5e7eb',
            borderRadius: 6,
            padding: 10,
            maxWidth: '100%',
            overflowX: 'hidden',
          }}
        >
          {children}
        </div>
      ) : null}

      {toast ? (
        <div
          style={{
            position: 'absolute',
            right: 10,
            bottom: 10,
            background: '#fef3c7',
            color: '#92400e',
            border: '1px solid #fcd34d',
            borderRadius: 6,
            padding: '6px 8px',
            fontSize: 12,
          }}
        >
          {toast}
        </div>
      ) : null}
    </div>
  )
}
