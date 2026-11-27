import React, { useCallback, useMemo, useState, useLayoutEffect, useRef, useEffect, type FormEvent } from 'react'
import styles from './PromptComposer.module.css'
import { readDraft, saveDraft, clearAcknowledgedDraft } from './composerDraft'
import { FileUploadModal } from '../../filesystem/public'

/**
 * PromptComposer (sessions feature)
 *
 * Minimal, reusable prompt input + submit + optional Stop + optional status chip.
 * - Maintains internal text state
 * - Submits on Enter (no Shift)
 * - Calls onSubmit(text) and clears input
 * - Optional Stop button (wfRunning + onStop)
 * - Optional status chip (wfStatus)
 * - Optional left-side Upload button to open Filesystem upload modal
 * - Importing projects can customize styles via className/style slots and label props
 */
export interface PromptComposerProps {
  placeholder?: string
  toolbarExtras?: React.ReactNode
  /** Optional account/project/session scope for tab-local draft persistence. */
  draftScope?: string
  disabled?: boolean
  submitting?: boolean
  wfStatus?: string | null
  wfRunning?: boolean
  onSubmit: (text: string, fund?: number) => void | Promise<void>
  onStop?: () => void | Promise<void>
  // Upload (optional)
  showUploadButton?: boolean
  onOpenUpload?: () => void // if provided, clicking the upload button calls this instead of showing the built-in modal
  uploadIdToken?: string | null
  uploadSessionId?: string | null // when provided, uploads go to sessions/{sessionId}/{filename}
  uploadTargetPath?: string // optional override when no session id is provided
  uploadAccept?: string
  onUploadSuccess?: (result: any, filepath: string) => void
  onUploadError?: (message: string) => void
  uploadButtonClassName?: string
  uploadButtonStyle?: React.CSSProperties
  uploadButtonAriaLabel?: string
  uploadButtonTitle?: string
  // Style slots
  containerClassName?: string
  containerStyle?: React.CSSProperties
  formClassName?: string
  formStyle?: React.CSSProperties
  inputClassName?: string
  inputStyle?: React.CSSProperties
  submitClassName?: string
  submitStyle?: React.CSSProperties
  stopClassName?: string
  stopStyle?: React.CSSProperties
  statusClassName?: string
  statusStyle?: React.CSSProperties
  // Labels
  submitLabel?: string
  submittingLabel?: string
  stopLabel?: string
  statusText?: string // overrides wfStatus text when provided
}

export function PromptComposer(props: PromptComposerProps) {
  return <ScopedPromptComposer key={props.draftScope ?? props.uploadSessionId ?? 'unscoped'} {...props} />
}

function ScopedPromptComposer(props: PromptComposerProps) {
  const {
    placeholder,
    toolbarExtras,
    draftScope,
    disabled,
    submitting,
    wfStatus,
    wfRunning,
    onSubmit,
    onStop,
    showUploadButton = true,
    onOpenUpload,
    uploadIdToken,
    uploadSessionId,
    uploadTargetPath,
    uploadAccept,
    onUploadSuccess,
    onUploadError,
    uploadButtonClassName,
    uploadButtonStyle,
    uploadButtonAriaLabel = 'Upload file',
    uploadButtonTitle = 'Upload',
    containerClassName,
    containerStyle,
    formClassName,
    formStyle,
    inputClassName,
    inputStyle,
    submitClassName,
    submitStyle,
    stopClassName,
    stopStyle,
    statusClassName,
    statusStyle,
    submitLabel = 'Send',
    submittingLabel = 'Submitting…',
    stopLabel = 'Stop',
    statusText,
  } = props

  const [draft, setDraft] = useState(() => readDraft(draftScope))
  const text = draft.text
  const sendingRef = useRef(false)
  const changeDraft = (text: string) => {
    const next = { text, revision: globalThis.crypto?.randomUUID?.() ?? String(Date.now()) + Math.random() }
    setDraft(next)
    saveDraft(draftScope, next)
  }
  const inputRef = useRef<HTMLTextAreaElement>(null)
  useLayoutEffect(() => {
    const input = inputRef.current
    if (!input || inputStyle?.height != null) return
    const resize = () => {
      input.style.height = 'auto'
      input.style.height = input.scrollHeight + 'px'
    }
    resize()
    let width = input.clientWidth
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => {
      if (input.clientWidth === width) return
      width = input.clientWidth
      resize()
    })
    observer?.observe(input)
    return () => observer?.disconnect()
  }, [text, inputStyle?.height])
  useEffect(() => {
    if (!draftScope) return
    const listener = (event: Event) => {
      const detail = (event as CustomEvent<{ scope: string; revision: string }>).detail
      if (detail.scope === draftScope) {
        setDraft(current => current.revision === detail.revision ? { text: '', revision: '' } : current)
      }
    }
    window.addEventListener('awfl:draft-ack', listener)
    return () => window.removeEventListener('awfl:draft-ack', listener)
  }, [draftScope])
  const [sending, setSending] = useState(false)
  const [submissionError, setSubmissionError] = useState<string | null>(null)
  const [fund, setFund] = useState(1)
  const [uploadOpen, setUploadOpen] = useState(false)

  // Allow sending while a workflow runs, but wait for the current submission acknowledgement.
  const canSubmit = useMemo(() => {
    return !disabled && !sending && (text?.trim()?.length ?? 0) > 0
  }, [disabled, sending, text])

  const handleSubmit = useCallback(
    async (e?: FormEvent) => {
      e?.preventDefault?.()
      if (!canSubmit || sendingRef.current) return
      sendingRef.current = true
      const payload = text.trim()
      setSubmissionError(null)
      setSending(true)
      try {
        await onSubmit(payload, fund)
        // Preserve any new draft the user typed while awaiting confirmation.
        clearAcknowledgedDraft(draftScope, draft.revision)
        setDraft(current => current.revision === draft.revision ? {text: '', revision: ''} : current)
      } catch (error) {
        // Never discard the prompt when the request fails.
        setSubmissionError(error instanceof Error ? error.message : String(error))
      } finally {
        sendingRef.current = false
        setSending(false)
      }
    },
    [canSubmit, fund, onSubmit, text, draft.revision, draftScope]
  )

  const handleUploadClick = useCallback(() => {
    if (disabled) return
    if (onOpenUpload) {
      try { onOpenUpload() } catch {}
    } else {
      setUploadOpen(true)
    }
  }, [disabled, onOpenUpload])

  return (
    <div className={[styles.container, containerClassName].filter(Boolean).join(' ')} style={containerStyle} data-awfl-slot="composer">
      <form onSubmit={handleSubmit} className={[styles.form, formClassName].filter(Boolean).join(' ')} style={formStyle}>
        <textarea
          ref={inputRef}
          rows={2}
          aria-label="Message"
          value={text}
          onChange={(e) => { changeDraft(e.currentTarget.value); setSubmissionError(null) }}
          placeholder={placeholder || 'Type a prompt…'}
          disabled={!!disabled}
          className={[styles.input, inputClassName].filter(Boolean).join(' ')}
          style={inputStyle}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing && e.keyCode !== 229) {
              e.preventDefault()
              void handleSubmit()
            }
          }}
        />
        <div className={styles.toolbar} data-awfl-slot="composer-toolbar">
          <div className={styles.controls}>
            {showUploadButton && (
              <button type="button" onClick={handleUploadClick} disabled={!!disabled}
                className={[styles.control, styles.upload, uploadButtonClassName].filter(Boolean).join(' ')}
                style={uploadButtonStyle} aria-label={uploadButtonAriaLabel} title={uploadButtonTitle}>
                <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" aria-hidden="true">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </button>
            )}
            {toolbarExtras}
            <select value={fund} onChange={(e) => setFund(Number(e.currentTarget.value))}
              disabled={!!disabled} aria-label="Workflow fund" title="Workflow fund" className={styles.control}>
              <option value={5}>$5</option>
              <option value={2.5}>$2½</option>
              <option value={1}>$1</option>
              <option value={0.3}>30¢</option>
            </select>
          </div>
          <div className={styles.run}>
            {!!(wfStatus || statusText) && (
              <span title="Workflow status" role="status"
                className={[styles.status, statusClassName].filter(Boolean).join(' ')} style={statusStyle}>
                {statusText ?? wfStatus}
              </span>
            )}
            {wfRunning && (
              <button type="button" onClick={() => onStop?.()}
                className={[styles.control, styles.stop, stopClassName].filter(Boolean).join(' ')} style={stopStyle}>
                {stopLabel}
              </button>
            )}
            <button type="submit" disabled={!canSubmit}
              className={[styles.control, styles.submit, submitClassName].filter(Boolean).join(' ')}
              style={submitStyle} aria-busy={sending || submitting || undefined}>
              {sending || submitting ? submittingLabel : submitLabel}
            </button>
          </div>
        </div>
      </form>
      {submissionError && <p role="alert" className={styles.error}>Submission failed: {submissionError}</p>}
      {/* Built-in upload modal */}
      {showUploadButton && !onOpenUpload ? (
        <FileUploadModal
          open={uploadOpen}
          idToken={uploadIdToken || undefined}
          sessionId={uploadSessionId || undefined}
          targetPath={uploadTargetPath}
          accept={uploadAccept}
          onClose={() => setUploadOpen(false)}
          onSuccess={onUploadSuccess}
          onError={onUploadError}
        />
      ) : null}
    </div>
  )
}

export default PromptComposer
