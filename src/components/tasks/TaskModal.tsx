import { useEffect, useMemo, useState } from 'react'
import type { TaskRecord } from '../../hooks/useTasksList'

type TaskStatus = 'Queued' | 'In Progress' | 'Done' | 'Stuck'

type TaskModalProps = {
  open: boolean
  mode: 'create' | 'edit'
  initial?: Partial<TaskRecord> & { status?: TaskStatus | string }
  onClose: () => void
  onSave: (input: { title?: string; description?: string; status?: TaskStatus | string }) => Promise<void>
}

export function TaskModal({ open, mode, initial, onClose, onSave }: TaskModalProps) {
  const [title, setTitle] = useState<string>('')
  const [description, setDescription] = useState<string>('')
  const [status, setStatus] = useState<TaskStatus | string>('Queued')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setTitle(initial?.title || '')
    setDescription(initial?.description || '')
    setStatus((initial?.status as any) || 'Queued')
    setError(null)
    setSubmitting(false)
  }, [open])

  const heading = useMemo(() => (mode === 'edit' ? 'Edit task' : 'Add task'), [mode])

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.3)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        zIndex: 1000,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        style={{
          width: 'min(680px, 96vw)',
          background: '#fff',
          borderRadius: 8,
          border: '1px solid #e5e7eb',
          boxShadow: '0 10px 30px rgba(0,0,0,0.12)',
          overflow: 'hidden',
        }}
      >
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontWeight: 600 }}>{heading}</div>
          <button
            onClick={onClose}
            style={{
              border: '1px solid #e5e7eb',
              background: '#f9fafb',
              borderRadius: 6,
              padding: '4px 8px',
              cursor: 'pointer',
            }}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div style={{ padding: 16, display: 'grid', gap: 12 }}>
          {error ? (
            <div style={{ color: '#b91c1c', background: '#fef2f2', border: '1px solid #fecaca', padding: 8, borderRadius: 6, textAlign: 'left' }}>
              {error}
            </div>
          ) : null}

          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ fontSize: 12, color: '#374151' }}>Title</span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Task title"
              style={{
                border: '1px solid #e5e7eb',
                borderRadius: 6,
                padding: '8px 10px',
                outline: 'none',
              }}
            />
          </label>

          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ fontSize: 12, color: '#374151' }}>Description</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional details"
              rows={5}
              style={{
                border: '1px solid #e5e7eb',
                borderRadius: 6,
                padding: '8px 10px',
                resize: 'vertical',
                outline: 'none',
              }}
            />
          </label>

          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ fontSize: 12, color: '#374151' }}>Status</span>
            <select
              value={status as any}
              onChange={(e) => setStatus(e.target.value)}
              style={{
                border: '1px solid #e5e7eb',
                borderRadius: 6,
                padding: '8px 10px',
                outline: 'none',
                background: '#fff',
              }}
            >
              <option value="Queued">Queued</option>
              <option value="In Progress">In Progress</option>
              <option value="Done">Done</option>
              <option value="Stuck">Stuck</option>
            </select>
          </label>
        </div>

        <div style={{ padding: 16, borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button
            onClick={onClose}
            disabled={submitting}
            style={{
              border: '1px solid #e5e7eb',
              background: '#f9fafb',
              borderRadius: 6,
              padding: '8px 12px',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={async () => {
              setError(null)
              try {
                setSubmitting(true)
                await onSave({ title: title || undefined, description: description || undefined, status })
                onClose()
              } catch (e: any) {
                setError(e?.message || String(e))
              } finally {
                setSubmitting(false)
              }
            }}
            disabled={submitting}
            style={{
              border: '1px solid #2563eb',
              background: '#2563eb',
              color: '#fff',
              borderRadius: 6,
              padding: '8px 12px',
              cursor: 'pointer',
            }}
          >
            {submitting ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
