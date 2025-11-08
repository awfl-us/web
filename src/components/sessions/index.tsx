export type Session = {
  id: string
  title: string
  updatedAt: string
  summary?: string
  highlights?: string[]
  tags?: string[]
}

export function formatDate(iso: string) {
  try {
    const d = new Date(iso)
    return d.toLocaleString()
  } catch {
    return iso
  }
}

function formatEpochSeconds(sec?: number) {
  if (typeof sec === 'number' && isFinite(sec)) {
    try {
      return new Date(sec * 1000).toLocaleString()
    } catch {}
  }
  return ''
}

// Sidebar
export type SessionSidebarProps = {
  sessions: Session[]
  selectedId: string | null
  onSelect: (id: string) => void
  loading: boolean
  error: string | null
  query: string
  onQueryChange: (q: string) => void
}

export function SessionSidebar({ sessions, selectedId, onSelect, loading, error, query, onQueryChange }: SessionSidebarProps) {
  return (
    <aside style={{ width: 320, borderRight: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', minWidth: 0, overflowX: 'hidden' }}>
      <div style={{ paddingBottom: 8 }}>
        <input
          value={query}
          onChange={e => onQueryChange(e.target.value)}
          placeholder="Search sessions (title, tags, highlights)"
          style={{ width: '100%', maxWidth: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6, boxSizing: 'border-box', display: 'block' }}
          aria-label="Search sessions"
        />
      </div>
      <div style={{ overflowY: 'auto', overflowX: 'hidden', flex: 1, minWidth: 0 }}>
        {loading && (
          <div style={{ color: '#6b7280', padding: 16 }}>Loading sessions…</div>
        )}
        {error && (
          <div style={{ color: '#b91c1c', background: '#fef2f2', border: '1px solid #fecaca', padding: 8, borderRadius: 6 }}>
            Failed to load sessions: {error}
          </div>
        )}
        {sessions.map(s => (
          <button
            key={s.id}
            onClick={() => onSelect(s.id)}
            style={{
              display: 'block',
              textAlign: 'left',
              width: '100%',
              border: 'none',
              background: selectedId === s.id ? '#eef2ff' : 'transparent',
              borderRadius: 6,
              padding: '10px 8px',
              cursor: 'pointer',
            }}
            aria-current={selectedId === s.id ? 'page' : undefined}
          >
            <div style={{ fontWeight: 600 }}>{s.title}</div>
            <div style={{ fontSize: 12, color: '#6b7280' }}>{formatDate(s.updatedAt)}</div>
            {!!s.tags?.length && (
              <div style={{ marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {s.tags!.map(tag => (
                  <span key={tag} style={{ fontSize: 11, background: '#f3f4f6', padding: '2px 6px', borderRadius: 999 }}>{tag}</span>
                ))}
              </div>
            )}
          </button>
        ))}
        {!loading && !sessions.length && (
          <div style={{ color: '#6b7280', padding: 16 }}>No sessions match “{query}”.</div>
        )}
      </div>
    </aside>
  )
}

// Details
export type SessionDetailsProps = {
  session: Session
  running: boolean
  execError: string | null
  lastExec: any | null
  onEmit: () => void
}

export function SessionDetails({ session, running, execError, lastExec, onEmit }: SessionDetailsProps) {
  const yojMessages: Array<{ content?: string; create_time?: number; role?: string }> = Array.isArray(lastExec?.result?.yoj)
    ? lastExec.result.yoj
    : []

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <h1 style={{ margin: 0 }}>{session.title}</h1>
          <button
            onClick={onEmit}
            disabled={running}
            style={{
              padding: '6px 10px',
              borderRadius: 6,
              border: '1px solid #d1d5db',
              background: running ? '#e5e7eb' : '#f9fafb',
              cursor: running ? 'not-allowed' : 'pointer',
              fontSize: 12,
            }}
            aria-label="Emit Topic Context (SegKala)"
            title="Emit Topic Context (SegKala)"
          >
            {running ? 'Emitting…' : 'Emit Topic Context'}
          </button>
        </div>
        <div style={{ fontSize: 12, color: '#6b7280' }}>Last updated {formatDate(session.updatedAt)}</div>
      </div>

      {execError && (
        <div style={{ color: '#b91c1c', background: '#fef2f2', border: '1px solid #fecaca', padding: 8, borderRadius: 6 }}>
          Error: {execError}
        </div>
      )}

      {lastExec && (
        <section>
          <h2 style={{ margin: '8px 0' }}>Last workflow result</h2>
          <div style={{ fontSize: 12, background: '#f9fafb', border: '1px solid #e5e7eb', padding: 8, borderRadius: 6 }}>
            <div><strong>Execution:</strong> {lastExec?.executionName}</div>
            <div><strong>State:</strong> {lastExec?.state}</div>
            {lastExec?.result && (
              <div>
                {/* Keep legacy fields if present */}
                <div><strong>SegKey:</strong> {lastExec.result?.segKey ?? lastExec.result?.kalavibhaga?.segKey ?? '—'}</div>
                <div><strong>ContextId:</strong> {lastExec.result?.contextId ?? lastExec.result?.identity?.contextId ?? '—'}</div>
                <div><strong>Summary:</strong> {lastExec.result?.summary ?? lastExec.result?.content?.summary ?? '—'}</div>
              </div>
            )}
          </div>

          {yojMessages.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <h3 style={{ margin: '6px 0' }}>Messages</h3>
              <div style={{ display: 'grid', gap: 8 }}>
                {yojMessages.map((m, i) => (
                  <div key={i} style={{ border: '1px solid #e5e7eb', borderRadius: 6, padding: 8, background: '#ffffff' }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', marginBottom: 4 }}>
                      <span style={{ fontSize: 11, background: '#eef2ff', border: '1px solid #c7d2fe', padding: '2px 6px', borderRadius: 999 }}>{m.role || 'system'}</span>
                      <span style={{ fontSize: 11, color: '#6b7280' }}>{formatEpochSeconds(m.create_time)}</span>
                    </div>
                    <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.45 }}>{m.content || ''}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {!!session.summary && (
        <section>
          <h2 style={{ margin: '8px 0' }}>Summary</h2>
          <p style={{ marginTop: 4, lineHeight: 1.5 }}>{session.summary}</p>
        </section>
      )}

      {!!session.highlights?.length && (
        <section>
          <h2 style={{ margin: '8px 0' }}>Extracted highlights</h2>
          <ul style={{ marginTop: 4, paddingLeft: 18 }}>
            {session.highlights!.map((h, i) => (
              <li key={i}>{h}</li>
            ))}
          </ul>
        </section>
      )}

      {!!session.tags?.length && (
        <section>
          <h2 style={{ margin: '8px 0' }}>Tags</h2>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {session.tags!.map(tag => (
              <span key={tag} style={{ fontSize: 12, background: '#f3f4f6', padding: '4px 8px', borderRadius: 999 }}>{tag}</span>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
