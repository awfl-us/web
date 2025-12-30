import React, { useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import type { CSSProperties, ForwardedRef } from 'react'
import { useProducerControls } from '../hooks/useProducerControls'

export type ProducerStatusController = {
  start: () => void
  stop: () => void
  skipToEnd: () => void
  reset: () => void
}

export type ProducerStatusProps = {
  idToken?: string
  projectId?: string
  enabled?: boolean
  autoStart?: boolean
  overlay?: boolean
  totalMs?: number
  messages?: string[]
  onDone?: () => void
  controllerRef?: ForwardedRef<ProducerStatusController | null>
  className?: string
  style?: CSSProperties
}

const DEFAULT_MESSAGES = [
  'Acquiring cloud compute..',
  'Fetching cloud images..',
  'Starting cloud instance..',
  'Starting cloud consumer..',
  'Syncing cloud storage..',
  'Consuming events queue..',
  'Cloud consumer started!'
]

/**
 * ProducerStatus — startup status overlay with horizontal push slide transitions.
 *
 * Behavior
 * - Runs a timed sequence of statuses spread across totalMs (default 80s).
 * - Calls the /workflows/producer/start endpoint once (via useProducerControls).
 * - If the start request returns before the sequence completes, skips remaining
 *   statuses and jumps to the final "Cloud consumer started!" status.
 * - Cleans up timers on unmount and respects enabled flag.
 * - Exposes optional controllerRef with start/stop/skip/reset methods.
 */
export function ProducerStatus({
  idToken,
  projectId,
  enabled = true,
  autoStart = true,
  overlay = true,
  totalMs = 80000,
  messages: messagesProp,
  onDone,
  controllerRef,
  className,
  style,
}: ProducerStatusProps) {
  const messages = useMemo(() => (messagesProp && messagesProp.length ? messagesProp : DEFAULT_MESSAGES), [messagesProp])
  const stepMs = Math.max(500, Math.floor(totalMs / Math.max(1, messages.length)))

  const { start: doStart, stop: doStop, starting } = useProducerControls({ idToken, projectId, enabled })

  const [index, setIndex] = useState(0)
  const [running, setRunning] = useState(false)
  const [done, setDone] = useState(false)
  const [transitionMs, setTransitionMs] = useState(450) // normal slide duration
  const timerRef = useRef<number | null>(null)
  const mountedRef = useRef(true)
  const earlyResolvedRef = useRef(false)
  const startedRef = useRef(false)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      if (timerRef.current) window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  // Kick off automatically when enabled and autoStart
  useEffect(() => {
    if (!enabled) return
    if (autoStart && !startedRef.current) {
      startedRef.current = true
      startSequence()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, autoStart, idToken, projectId])

  // Expose controller methods
  useImperativeHandle(
    controllerRef,
    () => ({
      start: () => {
        if (!enabled) return
        if (!running && !done) startSequence()
      },
      stop: () => {
        doStop()
        cleanupTimers()
        setRunning(false)
      },
      skipToEnd: () => {
        if (!enabled) return
        skipToFinal()
      },
      reset: () => {
        cleanupTimers()
        earlyResolvedRef.current = false
        startedRef.current = false
        setIndex(0)
        setDone(false)
        setRunning(false)
        setTransitionMs(450)
      }
    }),
    [enabled, running, done]
  )

  function cleanupTimers() {
    if (timerRef.current) window.clearTimeout(timerRef.current)
    timerRef.current = null
  }

  function scheduleNextTick() {
    cleanupTimers()
    if (!mountedRef.current) return
    if (!running) return

    // Already at final slide
    if (index >= messages.length - 1) {
      setRunning(false)
      setDone(true)
      onDone?.()
      return
    }

    timerRef.current = window.setTimeout(() => {
      if (!mountedRef.current) return
      // If we received early resolution, jump to end
      if (earlyResolvedRef.current) {
        skipToFinal()
        return
      }
      setIndex((i) => Math.min(i + 1, messages.length - 1))
    }, stepMs) as unknown as number
  }

  function skipToFinal() {
    if (!mountedRef.current) return
    cleanupTimers()
    setTransitionMs(250)
    setIndex(messages.length - 1)
    // Finish shortly after the quick transition
    timerRef.current = window.setTimeout(() => {
      if (!mountedRef.current) return
      setRunning(false)
      setDone(true)
      onDone?.()
    }, 300) as unknown as number
  }

  async function startSequence() {
    if (!enabled) return
    cleanupTimers()
    setIndex(0)
    setDone(false)
    setRunning(true)
    setTransitionMs(450)
    earlyResolvedRef.current = false

    // Fire-and-forget start; if it resolves early, we'll skip to final immediately
    ;(async () => {
      try {
        const res = await doStart()
        if (!mountedRef.current) return
        if (res) {
          earlyResolvedRef.current = true
          // Jump right away; no need to wait for the next tick
          skipToFinal()
        }
      } catch {
        // swallow; sequence still runs
      }
    })()

    // Start the ticker
    scheduleNextTick()
  }

  // When index changes and we're running, schedule next
  useEffect(() => {
    if (!running) return
    scheduleNextTick()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, running])

  if (!enabled) return null

  const containerStyle: CSSProperties = {
    position: overlay ? 'fixed' : 'relative',
    inset: overlay ? 0 : undefined,
    display: running || starting || !done ? 'flex' : 'none',
    alignItems: 'center',
    justifyContent: 'center',
    background: overlay ? 'rgba(255,255,255,0.85)' : 'transparent',
    zIndex: overlay ? 50 : 'auto',
    overflow: 'hidden',
    ...(style || {})
  }

  // Horizontal track with push-slide
  const trackStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    height: 'auto',
    transform: `translateX(-${index * 100}%)`,
    transition: `transform ${transitionMs}ms ease-in-out`,
    width: `${messages.length * 100}%`,
  }

  const slideStyleBase: CSSProperties = {
    width: `${100 / messages.length}%`,
    flex: `0 0 ${100 / messages.length}%`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px 16px',
  }

  const pillStyle: CSSProperties = {
    minWidth: 280,
    maxWidth: 520,
    textAlign: 'center',
    border: '1px solid #d1d5db',
    borderRadius: 12,
    background: 'white',
    boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
    color: '#111827',
    fontSize: 16,
    lineHeight: 1.25,
    padding: '16px 18px',
    userSelect: 'none',
  }

  return (
    <div className={className} style={containerStyle} aria-live="polite" aria-atomic>
      <div style={{ width: '100%', maxWidth: 680, overflow: 'hidden' }}>
        <div style={trackStyle} role="status">
          {messages.map((msg, i) => (
            <div key={i} style={slideStyleBase} aria-hidden={i !== index}>
              <div style={pillStyle}>{msg}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default ProducerStatus
