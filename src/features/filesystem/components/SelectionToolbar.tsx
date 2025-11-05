import React from 'react'

export function SelectionToolbar({
  count,
  pendingCount = 0,
  errorCount = 0,
  onAddToContext,
  onPlainify,
  onClear,
  onDismissError,
}: {
  count: number
  pendingCount?: number
  errorCount?: number
  onAddToContext?: () => void
  onPlainify?: () => void
  onClear?: () => void
  onDismissError?: () => void
}) {
  if (count <= 0 && pendingCount <= 0 && errorCount <= 0) return null
  const pending = pendingCount > 0
  const hasErrors = errorCount > 0

  const handlePlainifyButtonClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    // Unconditional diagnostic log to trace click on the actual button itself
    try {
      console.log('[fs][toolbar] Plainify button clicked', {
        disabled: pending,
        hasHandler: !!onPlainify,
        selectedCount: count,
        pendingCount,
        errorCount,
      })
    } catch {}
    // Delegate to provided handler if present
    if (onPlainify) onPlainify()
  }

  return (
    <div
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 1,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '6px 8px',
        background: '#f9fafb',
        borderBottom: '1px solid #e5e7eb',
      }}
      aria-busy={pending}
    >
      {count > 0 && <span style={{ fontSize: 12, color: '#374151' }}>{count} selected</span>}
      {pending && (
        <span style={{ fontSize: 12, color: '#6b7280', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span
            aria-label="Working"
            style={{
              width: 12,
              height: 12,
              border: '2px solid #d1d5db',
              borderTopColor: '#6b7280',
              borderRadius: '50%',
              display: 'inline-block',
              animation: 'spin 1s linear infinite',
            }}
          />
          {pendingCount} pending
        </span>
      )}
      {hasErrors && (
        <span
          role="status"
          aria-live="polite"
          title={`${errorCount} error${errorCount === 1 ? '' : 's'} in last run`}
          style={{
            fontSize: 12,
            color: '#991b1b',
            background: '#fee2e2',
            border: '1px solid #fecaca',
            borderRadius: 12,
            padding: '0px 6px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          ● {errorCount} error{errorCount === 1 ? '' : 's'}
          <button
            onClick={onDismissError}
            aria-label="Dismiss errors"
            title="Dismiss"
            style={{
              border: 'none',
              background: 'transparent',
              color: '#991b1b',
              cursor: 'pointer',
              padding: 0,
              marginLeft: 4,
            }}
          >
            ×
          </button>
        </span>
      )}
      <button
        title="Add to context"
        onClick={onAddToContext}
        disabled={pending}
        style={{
          padding: '2px 6px',
          border: '1px solid #d1d5db',
          borderRadius: 4,
          background: 'white',
          cursor: pending ? 'not-allowed' : 'pointer',
        }}
      >
        +
      </button>
      <button
        title="Plainify"
        onClick={handlePlainifyButtonClick}
        disabled={pending}
        style={{
          padding: '2px 6px',
          border: '1px solid #d1d5db',
          borderRadius: 4,
          background: 'white',
          cursor: pending ? 'not-allowed' : 'pointer',
        }}
      >
        ¶
      </button>
      <button
        title="Clear selection"
        onClick={onClear}
        disabled={pending}
        style={{
          padding: '2px 6px',
          border: '1px solid #d1d5db',
          borderRadius: 4,
          background: 'white',
          cursor: pending ? 'not-allowed' : 'pointer',
          marginLeft: 'auto',
          color: '#6b7280',
        }}
      >
        Clear
      </button>
      {/* spinner keyframes */}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

export default SelectionToolbar
