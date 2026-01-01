import { useEffect, useMemo, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useConsumerStatus } from '../hooks/useConsumerStatus'
import { useProducerControls } from '../hooks/useProducerControls'
import { Tooltip } from '../../ui/public'
import { ACTIVE_BG, ACTIVE_TEXT, INACTIVE_BG, INACTIVE_TEXT, type SlotOverrides } from './shared'

export type ConsumerStatusPillProps = {
  idToken?: string
  projectId?: string
  enabled?: boolean
  // Optional override for client id used in x-consumer-id header
  consumerId?: string | null
  intervalMs?: number
  // Theming and customization
  className?: string
  style?: CSSProperties
  slots?: {
    local?: SlotOverrides
    cloud?: SlotOverrides
  }
  icons?: {
    local?: ReactNode
    cloud?: ReactNode
  }
  labels?: {
    local?: string
    cloud?: string
  }
  showText?: boolean // default: false to preserve current visuals
  showControls?: boolean // default: true; set false for display-only use
}

function getOrMakeClientId(): string {
  try {
    const k = 'awfl.consumerId'
    let v = localStorage.getItem(k)
    if (!v) {
      v = `web-${Math.random().toString(36).slice(2, 8)}-${Date.now().toString(36)}`
      localStorage.setItem(k, v)
    }
    return v
  } catch {
    return `web-${Math.random().toString(36).slice(2, 8)}`
  }
}

const SLIDE_MS = 500

function StatusOverlay({
  visible,
  message,
  prevMessage,
}: {
  visible: boolean
  message: string | null
  prevMessage: string | null
}) {
  const [animPhase, setAnimPhase] = useState<'idle' | 'entering'>('idle')
  // When message changes, run a slide animation for prev -> current
  useEffect(() => {
    if (!visible || !message) return
    const id = requestAnimationFrame(() => setAnimPhase('entering'))
    return () => cancelAnimationFrame(id)
  }, [visible, message])

  if (!visible || !message) return null

  const overlay = (
    <div
      aria-live="polite"
      role="status"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        pointerEvents: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          position: 'relative',
          minWidth: 320,
          maxWidth: '80vw',
          overflow: 'hidden',
          background: 'rgba(255,255,255,0.9)',
          color: '#111827',
          border: '1px solid rgba(0,0,0,0.06)',
          borderRadius: 12,
          padding: '16px 20px',
          boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
        }}
      >
        {/* previous message (slides out to the left) */}
        {prevMessage && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transform: animPhase === 'entering' ? 'translateX(-100%)' : 'translateX(0%)',
              transition: `transform ${SLIDE_MS}ms ease`,
              willChange: 'transform',
              whiteSpace: 'nowrap',
              fontSize: 16,
              fontWeight: 500,
            }}
          >
            {prevMessage}
          </div>
        )}
        {/* current message (slides in from the right) */}
        <div
          style={{
            position: prevMessage ? 'absolute' : 'relative',
            inset: prevMessage ? 0 : undefined,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transform: animPhase === 'entering' && prevMessage ? 'translateX(0%)' : prevMessage ? 'translateX(100%)' : 'translateX(0%)',
            transition: prevMessage ? `transform ${SLIDE_MS}ms ease` : undefined,
            willChange: prevMessage ? 'transform' : undefined,
            whiteSpace: 'nowrap',
            fontSize: 16,
            fontWeight: 600,
          }}
        >
          {message}
        </div>
      </div>
    </div>
  )

  return createPortal(overlay, document.body)
}

export function ConsumerStatusPill({
  idToken,
  projectId,
  enabled,
  consumerId: consumerIdProp,
  intervalMs,
  className,
  style,
  slots,
  icons,
  labels,
  showText = false,
  showControls = true,
}: ConsumerStatusPillProps) {
  const consumerId = useMemo(() => consumerIdProp ?? getOrMakeClientId(), [consumerIdProp])
  const { status, reload } = useConsumerStatus({ idToken, projectId, consumerId, enabled, intervalMs })
  const { start, stop, loading: pending } = useProducerControls({ idToken, projectId, enabled })

  const type = status?.consumerType // 'LOCAL' | 'CLOUD' | null
  const localActive = type === 'LOCAL'
  const cloudActive = type === 'CLOUD'

  // Track pending intent to stabilize labels during in-flight requests
  const [intent, setIntent] = useState<'start' | 'stop' | null>(null)
  useEffect(() => {
    if (!pending) setIntent(null)
  }, [pending])

  const cannotControlCloud = !enabled || !projectId || !idToken
  const playDisabled = !!(localActive || pending || cannotControlCloud)

  const intentText = intent === 'stop' ? 'Stopping…' : intent === 'start' ? 'Starting…' : null
  const disabledReason = localActive
    ? 'Disabled: Local consumer holds the lock'
    : pending
    ? intentText || (cloudActive ? 'Working…' : 'Working…')
    : cannotControlCloud
    ? 'Disabled: Missing auth or project'
    : ''

  // Backend-provided status message drives overlay visibility and transitions
  const backendMessage = (status?.statusMessage?.trim?.() ? status?.statusMessage!.trim() : null) || null
  const [currMsg, setCurrMsg] = useState<string | null>(null)
  const [prevMsg, setPrevMsg] = useState<string | null>(null)

  // When backend message changes, update prev/curr for slide animation
  useEffect(() => {
    if (backendMessage && backendMessage !== currMsg) {
      setPrevMsg(currMsg)
      setCurrMsg(backendMessage)
    } else if (!backendMessage) {
      // hide overlay and clear messages
      if (currMsg !== null || prevMsg !== null) {
        setPrevMsg(null)
        setCurrMsg(null)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backendMessage])

  async function onClick() {
    if (playDisabled) return
    try {
      if (cloudActive) {
        setIntent('stop')
        const res = await stop()
        if (res) console.log('[producer.stop] response:', res)
      } else {
        setIntent('start')
        try {
          const res = await start({})
          if (res) console.log('[producer.start] response:', res)
        } catch (e) {
          console.warn('producer.start failed', e)
        }
      }
    } finally {
      // Nudge the status hook to refresh immediately rather than waiting for the next poll tick
      reload()
    }
  }

  const baseSideStyle: React.CSSProperties = {
    padding: '4px 8px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 12,
    lineHeight: 1,
    userSelect: 'none',
  }

  const containerStyle: React.CSSProperties = {
    display: 'inline-flex',
    border: '1px solid #d1d5db',
    borderRadius: 999,
    overflow: 'visible',
    alignItems: 'stretch',
    background: 'white',
    ...(style || {}),
  }

  const localBaseStyle: React.CSSProperties = localActive
    ? { color: ACTIVE_TEXT, background: ACTIVE_BG }
    : { color: INACTIVE_TEXT, background: INACTIVE_BG }
  const cloudBaseStyle: React.CSSProperties = cloudActive
    ? { color: ACTIVE_TEXT, background: ACTIVE_BG }
    : { color: INACTIVE_TEXT, background: INACTIVE_BG }

  const local = slots?.local || {}
  const cloud = slots?.cloud || {}

  const localStateStyle = localActive ? local.activeStyle : local.inactiveStyle
  const localStateClass = localActive ? local.activeClassName : local.inactiveClassName
  const cloudStateStyle = cloudActive ? cloud.activeStyle : cloud.inactiveStyle
  const cloudStateClass = cloudActive ? cloud.activeClassName : cloud.inactiveClassName

  const normalActionLabel = cloudActive ? 'Stop cloud consumer' : 'Start cloud consumer'
  const pendingLabel = intent === 'stop' ? 'Stopping…' : intent === 'start' ? 'Starting…' : 'Working…'
  const buttonAriaLabel = pending ? pendingLabel : normalActionLabel
  const buttonTitle = disabledReason || (pending ? pendingLabel : normalActionLabel)

  return (
    <>
      <div className={className} style={containerStyle}>
        <div
          className={[local.className, localStateClass].filter(Boolean).join(' ')}
          style={{
            ...baseSideStyle,
            ...localBaseStyle,
            borderRight: '1px solid #e5e7eb',
            borderTopLeftRadius: 999,
            borderBottomLeftRadius: 999,
            ...(local.style || {}),
            ...(localStateStyle || {}),
          }}
          title={localActive ? 'Consumer lock: LOCAL' : 'Local consumer'}
          aria-label={localActive ? 'Consumer lock: LOCAL' : 'Local consumer'}
        >
          <span aria-hidden className={local.iconClassName} style={{ display: 'inline-block', lineHeight: 1, ...(local.iconStyle || {}) }}>
            {icons?.local ?? '💻'}
          </span>
          {showText && (
            <span className={local.textClassName} style={local.textStyle}>
              {labels?.local ?? 'Local'}
            </span>
          )}
        </div>
        <div
          className={[cloud.className, cloudStateClass].filter(Boolean).join(' ')}
          style={{
            ...baseSideStyle,
            ...cloudBaseStyle,
            borderTopRightRadius: 999,
            borderBottomRightRadius: 999,
            ...(cloud.style || {}),
            ...(cloudStateStyle || {}),
          }}
          title={cloudActive ? 'Consumer lock: CLOUD' : 'Cloud consumer'}
          aria-label={cloudActive ? 'Consumer lock: CLOUD' : 'Cloud consumer'}
        >
          <span aria-hidden className={cloud.iconClassName} style={{ display: 'inline-block', lineHeight: 1, ...(cloud.iconStyle || {}) }}>
            {icons?.cloud ?? '☁️'}
          </span>
          {showText && (
            <span className={cloud.textClassName} style={cloud.textStyle}>
              {labels?.cloud ?? 'Cloud'}
            </span>
          )}
          {showControls && (
            <Tooltip
              content={disabledReason || (pending ? pendingLabel : normalActionLabel)}
              placement="bottom"
              align="center"
              disabled={!playDisabled}
            >
              <button
                type="button"
                disabled={playDisabled}
                onClick={onClick}
                aria-label={buttonAriaLabel}
                title={buttonTitle}
                style={{
                  marginLeft: 6,
                  opacity: playDisabled ? 0.35 : 1,
                  color: 'inherit',
                  background: 'transparent',
                  border: 'none',
                  padding: 0,
                  cursor: playDisabled ? 'not-allowed' : 'pointer',
                  lineHeight: 1,
                }}
              >
                {pending ? '…' : cloudActive ? '■' : '▶︎'}
              </button>
            </Tooltip>
          )}
        </div>
      </div>

      <StatusOverlay visible={!!currMsg} message={currMsg} prevMessage={prevMsg} />
    </>
  )
}

export default ConsumerStatusPill
