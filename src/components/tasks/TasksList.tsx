import React from 'react'
import type { TaskRecord } from '../../hooks/useTasksList'

function statusBg(status?: string): { bg: string; border: string } {
  const s = (status || '').toLowerCase()
  if (s === 'queued') return { bg: '#e0f2fe', border: '#bae6fd' }
  if (s === 'in progress') return { bg: '#fef9c3', border: '#fde68a' }
  if (s === 'done') return { bg: '#dcfce7', border: '#bbf7d0' }
  if (s === 'stuck') return { bg: '#fee2e2', border: '#fecaca' }
  return { bg: '#f3f4f6', border: '#e5e7eb' }
}

export function TasksList({
  tasks,
  showSession = false,
  onEdit,
  onDelete,
}: {
  tasks: TaskRecord[]
  showSession?: boolean
  onEdit?: (task: TaskRecord) => void
  onDelete?: (task: TaskRecord) => void
}) {
  if (!tasks || tasks.length === 0) {
    return <div style={{ color: '#6b7280', textAlign: 'left' }}>No tasks found.</div>
  }

  return (
    <div style={{ display: 'grid', gap: 8 }}>
      {tasks.map((t) => {
        const { bg, border } = statusBg(t.status)
        return (
          <div
            key={t.id}
            style={{
              background: bg,
              border: `1px solid ${border}`,
              borderRadius: 8,
              padding: '10px 12px',
              display: 'grid',
              gap: 6,
            }}
          >
            {/* Header row: title + actions. Ensure long titles truncate and do not push actions off-screen. */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'space-between', minWidth: 0 }}>
              <div
                title={t.title || '—'}
                style={{
                  fontWeight: 600,
                  color: '#111827',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  flex: '1 1 auto',
                  minWidth: 0,
                }}
              >
                {t.title || '—'}
              </div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0, whiteSpace: 'nowrap' }}>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    fontSize: 12,
                    color: '#111827',
                    background: 'rgba(255,255,255,0.6)',
                    border: '1px solid rgba(0,0,0,0.08)',
                    padding: '2px 6px',
                    borderRadius: 999,
                    lineHeight: 1.2,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {t.status || '—'}
                </span>
                {onEdit ? (
                  <button
                    onClick={() => onEdit?.(t)}
                    aria-label="Edit task"
                    title="Edit task"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 24,
                      height: 24,
                      background: '#f9fafb',
                      border: '1px solid #e5e7eb',
                      borderRadius: 999,
                      cursor: 'pointer',
                      lineHeight: 1,
                    }}
                  >
                    ✎
                  </button>
                ) : null}
                {onDelete ? (
                  <button
                    onClick={() => onDelete?.(t)}
                    aria-label="Delete task"
                    title="Delete task"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 24,
                      height: 24,
                      background: '#fef2f2',
                      border: '1px solid #fecaca',
                      borderRadius: 999,
                      cursor: 'pointer',
                      lineHeight: 1,
                      color: '#b91c1c',
                    }}
                  >
                    🗑️
                  </button>
                ) : null}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: '#374151', fontSize: 12, flexWrap: 'wrap' }}>
              <span>
                Updated {t.updatedAt ? new Date(t.updatedAt as any).toLocaleString() : '—'}
              </span>
              {showSession && t.sessionId ? (
                <span style={{ color: '#6b7280' }}>Session {t.sessionId}</span>
              ) : null}
            </div>

            {t.description ? (
              <div style={{ color: '#111827', fontSize: 13, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
                {t.description}
              </div>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}
