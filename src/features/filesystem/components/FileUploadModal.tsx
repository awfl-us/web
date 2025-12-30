import React, { useCallback } from 'react'
import { FileUpload } from './FileUpload'

export interface FileUploadModalProps {
  open: boolean
  idToken?: string | null
  targetPath?: string
  accept?: string
  onClose: () => void
  onSuccess?: (result: any, filepath: string) => void
  onError?: (message: string) => void
  // Style slots
  backdropStyle?: React.CSSProperties
  containerStyle?: React.CSSProperties
  title?: string
}

/**
 * FileUploadModal
 *
 * Minimal, self-contained modal wrapper for the Filesystem FileUpload component.
 * No external UI dependencies. Renders a fixed backdrop and a centered panel.
 */
export function FileUploadModal(props: FileUploadModalProps) {
  const {
    open,
    idToken,
    targetPath = 'plain/uploads/',
    accept,
    onClose,
    onSuccess,
    onError,
    backdropStyle,
    containerStyle,
    title = 'Upload file',
  } = props

  const handleSuccess = useCallback(
    (res: any, filepath: string) => {
      try { onSuccess?.(res, filepath) } catch {}
      onClose()
    },
    [onClose, onSuccess]
  )

  if (!open) return null

  // Inline styled modal to avoid cross-feature styling deps
  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.4)', zIndex: 50,
        ...backdropStyle,
      }}
      onClick={onClose}
    >
      <div
        style={{
          minWidth: 320, maxWidth: 480, width: '90%', background: 'white', color: '#111827',
          borderRadius: 8, boxShadow: '0 10px 25px rgba(0,0,0,0.25)', padding: 16,
          display: 'flex', flexDirection: 'column', gap: 12,
          ...containerStyle,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0, flex: 1 }}>{title}</h2>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#6b7280' }}
            aria-label="Close"
            title="Close"
          >
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M18 6L6 18" />
              <path d="M6 6l12 12" />
            </svg>
          </button>
        </div>
        <FileUpload
          idToken={idToken}
          targetPath={targetPath}
          accept={accept}
          onSuccess={handleSuccess}
          onError={onError}
          containerStyle={{ display: 'flex', alignItems: 'center', gap: 8 }}
          inputStyle={{ flex: 1 }}
        />
      </div>
    </div>
  )
}

export default FileUploadModal
