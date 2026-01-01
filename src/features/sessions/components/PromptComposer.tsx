import React, { useCallback, useMemo, useState, type FormEvent } from 'react'
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
  disabled?: boolean
  submitting?: boolean
  wfStatus?: string | null
  wfRunning?: boolean
  onSubmit: (text: string) => void | Promise<void>
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
  const {
    placeholder,
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
    submitLabel = 'Submit',
    submittingLabel = 'Submitting…',
    stopLabel = 'Stop',
    statusText,
  } = props

  const [text, setText] = useState('')
  const [uploadOpen, setUploadOpen] = useState(false)

  // Allow submitting even while a submission is in flight or workflow is running; backend queues queries.
  const canSubmit = useMemo(() => {
    return !disabled && (text?.trim()?.length ?? 0) > 0
  }, [disabled, text])

  const handleSubmit = useCallback(
    async (e?: FormEvent) => {
      e?.preventDefault?.()
      if (!canSubmit) return
      const payload = text.trim()
      setText('')
      await onSubmit(payload)
    },
    [canSubmit, onSubmit, text]
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
    <div className={containerClassName} style={containerStyle}>
      <form onSubmit={handleSubmit} className={formClassName} style={{ display: 'flex', flexDirection: 'column', gap: 8, ...(formStyle || {}) }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'stretch' }}>
          {showUploadButton ? (
            <button
              type="button"
              onClick={handleUploadClick}
              disabled={!!disabled}
              className={uploadButtonClassName}
              style={{
                borderRadius: 8,
                border: '1px solid #d1d5db',
                background: disabled ? '#f9fafb' : '#ffffff',
                color: '#111827',
                padding: 8,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: disabled ? 'not-allowed' : 'pointer',
                ...(uploadButtonStyle || {}),
              }}
              aria-label={uploadButtonAriaLabel}
              title={uploadButtonTitle}
            >
              {/* Plus icon */}
              <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 5v14" />
                <path d="M5 12h14" />
              </svg>
            </button>
          ) : null}

          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.currentTarget.value)}
            placeholder={placeholder || 'Type a prompt…'}
            disabled={!!disabled}
            className={inputClassName}
            style={{
              flex: 1,
              minWidth: 0,
              borderRadius: 8,
              border: '1px solid #d1d5db',
              padding: '8px 10px',
              outline: 'none',
              ...(inputStyle || {}),
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSubmit()
              }
            }}
          />
          <button
            type="submit"
            disabled={!canSubmit}
            className={submitClassName}
            style={{
              borderRadius: 8,
              border: '1px solid #10b981',
              background: canSubmit ? '#10b981' : '#a7f3d0',
              color: canSubmit ? 'white' : '#064e3b',
              padding: '8px 12px',
              cursor: canSubmit ? 'pointer' : 'not-allowed',
              fontWeight: 600,
              whiteSpace: 'nowrap',
              ...(submitStyle || {}),
            }}
            aria-busy={submitting || undefined}
          >
            {submitting ? submittingLabel : submitLabel}
          </button>
          {wfRunning ? (
            <button
              type="button"
              onClick={() => onStop?.()}
              className={stopClassName}
              style={{
                borderRadius: 8,
                border: '1px solid #b91c1c',
                background: '#fee2e2',
                color: '#7f1d1d',
                padding: '8px 12px',
                cursor: 'pointer',
                fontWeight: 600,
                whiteSpace: 'nowrap',
                ...(stopStyle || {}),
              }}
            >
              {stopLabel}
            </button>
          ) : null}
          {!!(wfStatus || statusText) && (
            <span
              title="Workflow status"
              className={statusClassName}
              style={{
                fontSize: 12,
                color: '#111827',
                background: '#f3f4f6',
                border: '1px solid #e5e7eb',
                borderRadius: 999,
                padding: '2px 8px',
                whiteSpace: 'nowrap',
                alignSelf: 'center',
                ...(statusStyle || {}),
              }}
            >
              {statusText ?? wfStatus}
            </span>
          )}
        </div>
      </form>

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
