import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'

export type NewSessionAgent = { id: string; name: string }

export type NewSessionModalProps = {
  open: boolean
  agents: NewSessionAgent[]
  agentsLoading?: boolean
  agentsError?: string | null
  onClose: () => void
  onCreate: (agentId: string | null) => void
}

export function NewSessionModal(props: NewSessionModalProps) {
  const { open, agents, agentsLoading = false, agentsError = null, onClose, onCreate } = props
  const [agentId, setAgentId] = useState<string | 'none'>('none')

  useEffect(() => {
    if (!open) return
    // Default to none on open
    setAgentId('none')
  }, [open])

  if (!open) return null

  const overlayStyle: CSSProperties = {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.35)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 50,
  }
  const modalStyle: CSSProperties = {
    width: 'min(480px, 92vw)',
    background: '#fff',
    borderRadius: 10,
    border: '1px solid #e5e7eb',
    boxShadow: '0 10px 24px rgba(0,0,0,0.15)',
    padding: 16,
  }

  const disableCreate = agentsLoading

  return (
    <div style={overlayStyle} role="dialog" aria-modal="true" aria-label="Create new session">
      <div style={modalStyle}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <h2 style={{ margin: 0, fontSize: 16 }}>New Session</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}
          >
            ×
          </button>
        </div>

        <div style={{ display: 'grid', gap: 12 }}>
          <p style={{ margin: 0, color: '#6b7280' }}>Optionally choose an agent to link to this session.</p>

          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ fontSize: 12, color: '#374151' }}>Agent</span>
            <select
              value={agentId}
              onChange={(e) => setAgentId(e.target.value as any)}
              disabled={agentsLoading}
              style={{ padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6 }}
            >
              <option value="none">No agent</option>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>

          {agentsLoading && <div style={{ color: '#6b7280' }}>Loading agents…</div>}
          {!!agentsError && (
            <div style={{ color: '#b91c1c', background: '#fef2f2', border: '1px solid #fecaca', padding: 8, borderRadius: 6 }}>
              Failed to load agents: {agentsError}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
          <button
            onClick={onClose}
            style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #d1d5db', background: '#fff', cursor: 'pointer' }}
          >
            Cancel
          </button>
          <button
            onClick={() => onCreate(agentId === 'none' ? null : agentId)}
            disabled={disableCreate}
            style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #2563eb', background: '#2563eb', color: '#fff', cursor: disableCreate ? 'not-allowed' : 'pointer' }}
          >
            Create Session
          </button>
        </div>
      </div>
    </div>
  )
}
