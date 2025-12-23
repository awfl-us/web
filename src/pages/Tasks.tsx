import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../auth/AuthProvider'
import { useTasksList } from '../features/tasks/hooks/useTasksList'

const statusOptions = ['All', 'Queued', 'In Progress', 'Done', 'Stuck'] as const

type Status = (typeof statusOptions)[number]

export default function TasksPage() {
  const { idToken, user } = useAuth()
  const [status, setStatus] = useState<Status>('All')
  const [sessionId, setSessionId] = useState<string>('')

  const enabled = !!(idToken || (import.meta as any)?.env?.VITE_SKIP_AUTH)

  const { tasks, loading, error, reload } = useTasksList({
    idToken,
    sessionId: sessionId || undefined,
    status: status === 'All' ? undefined : status,
    enabled,
    limit: 200,
    order: 'desc',
  })

  // Simple auto reload every 30s
  useEffect(() => {
    const t = setInterval(reload, 30000)
    return () => clearInterval(t)
  }, [reload])

  const header = useMemo(() => {
    const who = user?.displayName || user?.email || 'Guest'
    return `${who}'s Tasks` + (sessionId ? ` — Session ${sessionId}` : '')
  }, [user, sessionId])

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden', padding: 16, gap: 16, boxSizing: 'border-box' }}>
      <aside style={{ width: 280, maxWidth: '40%', minWidth: 240, borderRight: '1px solid #e5e7eb', paddingRight: 12 }}>
        <div style={{ display: 'grid', gap: 8 }}>
          <div style={{ fontWeight: 600 }}>Filters</div>
          <div style={{ display: 'grid', gap: 6 }}>
            <label style={{ display: 'grid', gap: 4 }}>
              <span style={{ fontSize: 12, color: '#6b7280' }}>Status</span>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as Status)}
                style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid #d1d5db' }}
              >
                {statusOptions.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>

            <label style={{ display: 'grid', gap: 4 }}>
              <span style={{ fontSize: 12, color: '#6b7280' }}>Session ID (optional)</span>
              <input
                value={sessionId}
                onChange={(e) => setSessionId(e.target.value)}
                placeholder="Filter by sessionId"
                style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid #d1d5db' }}
              />
            </label>

            <button
              onClick={reload}
              style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid #d1d5db', background: 'white' }}
            >
              Reload
            </button>
          </div>
        </div>
      </aside>

      <main style={{ flex: 1, minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>{header}</h2>
          {loading ? <span style={{ color: '#6b7280', fontSize: 12 }}>Loading…</span> : null}
        </div>

        {error ? (
          <div style={{ color: '#b91c1c', background: '#fef2f2', border: '1px solid #fecaca', padding: 8, borderRadius: 6 }}>
            {error}
          </div>
        ) : null}

        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflow: 'auto',
            border: '1px solid #e5e7eb',
            borderRadius: 8,
            padding: 0,
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f9fafb' }}>
                <th style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid #e5e7eb' }}>ID</th>
                <th style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid #e5e7eb' }}>Status</th>
                <th style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid #e5e7eb' }}>Title</th>
                <th style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid #e5e7eb' }}>Session</th>
                <th style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid #e5e7eb' }}>Updated</th>
              </tr>
            </thead>
            <tbody>
              {tasks.length === 0 && !loading ? (
                <tr>
                  <td colSpan={5} style={{ padding: 12, color: '#6b7280' }}>
                    No tasks found.
                  </td>
                </tr>
              ) : (
                tasks.map((t) => {
                  return (
                    <tr key={t.id}>
                      <td style={{ padding: '8px 10px', borderBottom: '1px solid #f3f4f6', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace' }}>
                        {t.id}
                      </td>
                      <td style={{ padding: '8px 10px', borderBottom: '1px solid #f3f4f6' }}>{t.status || '—'}</td>
                      <td style={{ padding: '8px 10px', borderBottom: '1px solid #f3f4f6' }}>{t.title || '—'}</td>
                      <td style={{ padding: '8px 10px', borderBottom: '1px solid #f3f4f6' }}>{t.sessionId || '—'}</td>
                      <td style={{ padding: '8px 10px', borderBottom: '1px solid #f3f4f6' }}>
                        {t.updatedAt ? new Date(t.updatedAt as any).toLocaleString() : '—'}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  )
}
