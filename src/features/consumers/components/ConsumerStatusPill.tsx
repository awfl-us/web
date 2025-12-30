import { useEffect, useMemo, useRef, useState } from 'react'
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

// Overlay sequence configuration (~80s total)
const CLOUD_START_MESSAGES = [
  'Acquiring cloud compute..',
  'Fetching cloud images..',
  'Starting cloud instance..',
  'Starting cloud consumer..',
  'Syncing cloud storage..',
  'Consuming events queue..',
  'Cloud consumer started!'
]
// seconds per step summing to ~80s
const CLOUD_START_DURATIONS_S = [12, 12, 14, 10, 12, 12, 8]
const SLIDE_MS = 500
const FINAL_AUTO_HIDE_MS = 1800

function CloudStartOverlay({
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
    // allow prev/current to mount, then trigger transition
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
          // subtle backdrop for readability
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
  // Treat the reported type as the source of truth for which side is active.
  const localActive = type === 'LOCAL'
  const cloudActive = type === 'CLOUD'

  // Track the user's intended action during the in-flight request so the tooltip/label
  // doesn't flip from "Starting…" to "Stopping…" just because the poll tick updated the lock.
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

  // Overlay state
  const [overlayVisible, setOverlayVisible] = useState(false)
  const [overlayIdx, setOverlayIdx] = useState<number>(0)
  const [overlayPrevIdx, setOverlayPrevIdx] = useState<number | null>(null)
  const timersRef = useRef<number[]>([])

  function clearOverlayTimers() {
    timersRef.current.forEach((id) => clearTimeout(id))
    timersRef.current = []
  }

  function hideOverlaySoon(ms = FINAL_AUTO_HIDE_MS) {
    const t = window.setTimeout(() => {
      setOverlayVisible(false)
      setOverlayPrevIdx(null)
      setOverlayIdx(0)
    }, ms)
    timersRef.current.push(t)
  }

  function startOverlaySequence() {
    clearOverlayTimers()
    setOverlayVisible(true)
    setOverlayPrevIdx(null)
    setOverlayIdx(0)
    // schedule steps
    let acc = 0
    for (let i = 1; i < CLOUD_START_MESSAGES.length; i++) {
      acc += CLOUD_START_DURATIONS_S[i - 1] * 1000
      const t = window.setTimeout(() => {
        setOverlayPrevIdx((prev) => (prev === null ? 0 : prev + 1))
        setOverlayIdx(i)
        // when last step shown by schedule, schedule auto hide
        if (i === CLOUD_START_MESSAGES.length - 1) {
          hideOverlaySoon()
        }
      }, acc)
      timersRef.current.push(t)
    }
  }

  function fastForwardOverlayToFinal() {
    if (!overlayVisible) return
    clearOverlayTimers()
    setOverlayPrevIdx(overlayIdx)
    setOverlayIdx(CLOUD_START_MESSAGES.length - 1)
    hideOverlaySoon()
  }

  useEffect(() => {
    // If component unmounts, stop timers
    return () => clearOverlayTimers()
  }, [])

  async function onClick() {
    if (playDisabled) return
    try {
      if (cloudActive) {
        setIntent('stop')
        const res = await stop()
        if (res) console.log('[producer.stop] response:', res)
      } else {
        setIntent('start')
        // Begin overlay sequence immediately on user intent
        startOverlaySequence()
        try {
          const res = await start({})
          if (res) console.log('[producer.start] response:', res)
          // Skip remaining statuses on resolve
          fastForwardOverlayToFinal()
        } catch (e) {
          // On failure, hide overlay quickly
          clearOverlayTimers()
          setOverlayVisible(false)
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
    // Allow tooltips to overflow the pill container
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

  // Button labels and titles should respect the intent while pending
  const normalActionLabel = cloudActive ? 'Stop cloud consumer' : 'Start cloud consumer'
  const pendingLabel = intent === 'stop' ? 'Stopping…' : intent === 'start' ? 'Starting…' : 'Working…'
  const buttonAriaLabel = pending ? pendingLabel : normalActionLabel
  const buttonTitle = disabledReason || (pending ? pendingLabel : normalActionLabel)

  const currentMessage = overlayVisible ? CLOUD_START_MESSAGES[overlayIdx] ?? null : null
  const prevMessage = overlayVisible && overlayPrevIdx !== null ? CLOUD_START_MESSAGES[overlayPrevIdx] ?? null : null

  return (
    <>
      <div className={className} style={containerStyle}>
        <div
          className={[local.className, localStateClass].filter(Boolean).join(' ')}
          style={{
            ...baseSideStyle,
            ...localBaseStyle,
            borderRight: '1px solid #e5e7eb',
            // Match outer rounding so background doesn't protrude
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
            // Match outer rounding so background doesn't protrude
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
          {/* Start/Stop control: disabled when local holds the lock, when pending, or when auth/project missing */}
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

      <CloudStartOverlay visible={overlayVisible} message={currentMessage} prevMessage={prevMessage} />
    </>
  )
}

export default ConsumerStatusPill
