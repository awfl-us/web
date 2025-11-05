import React, { useState } from 'react'

export type PromptInputProps = {
  value?: string
  onChange?: (v: string) => void
  placeholder?: string
  status?: string | null
  running?: boolean
  submitting?: boolean
  onSubmit?: (text: string) => void
  onStop?: () => void
  disabled?: boolean
}

export function PromptInput({
  value,
  onChange,
  placeholder = 'Type a prompt and press Enter…',
  status,
  running,
  submitting,
  onSubmit,
  onStop,
  disabled,
}: PromptInputProps) {
  const [local, setLocal] = useState('')
  const val = value ?? local
  const setVal = onChange ?? setLocal

  function handleSubmit() {
    const text = (val || '').trim()
    if (!text) return
    // Trigger submit first
    onSubmit?.(text)
    // Then clear the input value to keep UX responsive
    setVal('')
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (running) {
        onStop?.()
      } else {
        handleSubmit()
      }
    }
  }

  const isDisabled = !!disabled || (!!running && !onStop)

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: 8,
        borderTop: '1px solid #e5e7eb',
        background: '#ffffff',
      }}
    >
      <input
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        aria-label="Prompt input"
        disabled={isDisabled}
        style={{
          flex: 1,
          minWidth: 0,
          padding: '8px 10px',
          border: '1px solid #d1d5db',
          borderRadius: 6,
          font: 'inherit',
        }}
      />
      <button
        type="button"
        onClick={() => (running ? onStop?.() : handleSubmit())}
        disabled={isDisabled || (!running && (val || '').trim().length === 0)}
        style={{
          padding: '8px 12px',
          borderRadius: 6,
          border: '1px solid #d1d5db',
          background: running ? '#fee2e2' : '#f3f4f6',
          color: running ? '#b91c1c' : '#111827',
          cursor: isDisabled ? 'not-allowed' : 'pointer',
          whiteSpace: 'nowrap',
          fontSize: 12,
          fontWeight: 600,
        }}
        aria-label={running ? 'Stop' : 'Submit'}
        title={running ? 'Stop current execution' : 'Submit prompt'}
      >
        {running ? 'Stop' : submitting ? 'Submitting…' : 'Submit'}
      </button>
      {status ? (
        <div style={{ fontSize: 12, color: '#6b7280' }}>Status: {status}</div>
      ) : null}
    </div>
  )
}
